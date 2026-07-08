/**
 * runPropertyAnalysis — the single autopilot entry point.
 *
 * Takes the intake `AnalysisInput` directly, resolves data providers (mock by
 * default, licensed adapters when configured), and runs the full pipeline:
 * normalize → fetch → repairs → grade comps → conservative ARV → offers →
 * risk → confidence → recommend strategy → deal memo.
 */
import { normalizeAddress } from '@/lib/data-providers/addressNormalizer';
import { resolveProviders } from '@/lib/data-providers';
import { getProviderStatus } from '@/lib/data-providers/providerStatus';
import type {
  ProviderBundle,
  ProviderContext,
  ProviderResponse,
} from '@/lib/data-providers/providerTypes';
import type {
  AnalysisInput,
  AnalysisResult,
  ArvResult,
  Comp,
  CompInput,
  DataSource,
  NormalizedAddress,
  OfferResult,
  OffersBundle,
  PropertyCondition,
  RentEstimate,
  SellerInfoInput,
  SourceAuditEntry,
  StrategyRecommendation,
} from '@/lib/types';
import { estimateRepairs } from './repairEstimator';
import { gradeComps } from './compGradingEngine';
import { computeArv } from './conservativeArvEngine';
import { computeOffers } from './offerEngine';
import { computeRisk } from './riskEngine';
import { computeConfidence } from './confidenceEngine';
import { generateDealMemo } from './dealMemoGenerator';

const usd = (n?: number | null) => (n == null ? '—' : `$${Math.round(n).toLocaleString()}`);

const isMockSource = (s: DataSource) => s === 'mock_provider';

const VALID_CONDITIONS: PropertyCondition[] = [
  'unknown',
  'distressed',
  'below_average',
  'average',
  'updated',
  'renovated',
];

function parseCondition(c?: string): PropertyCondition {
  if (!c) return 'unknown';
  const key = c.trim().toLowerCase().replace(/[\s-]+/g, '_');
  return (VALID_CONDITIONS as string[]).includes(key) ? (key as PropertyCondition) : 'unknown';
}

/**
 * Convert user-entered manual comps into gradeable Comp objects. Comps without
 * a usable price are dropped (they can't inform value). Missing address parts
 * inherit the subject's city/state/zip.
 */
function manualCompsToComps(
  manual: CompInput[] | undefined,
  address: NormalizedAddress,
  asOf: string,
): { comps: Comp[]; dropped: number } {
  if (!manual?.length) return { comps: [], dropped: 0 };
  const comps: Comp[] = [];
  let dropped = 0;
  manual.forEach((m, i) => {
    const price = m.soldPrice;
    if (!price || price <= 0) {
      dropped += 1;
      return;
    }
    const status = m.status === 'listed' ? 'active' : (m.status ?? 'sold');
    comps.push({
      id: `manual-${i + 1}`,
      address: {
        street: m.address?.trim() || `Manual comp ${i + 1}`,
        city: address.city,
        state: address.state,
        zip: address.zip,
      },
      facts: {
        beds: m.beds,
        baths: m.baths,
        sqft: m.sqft,
        yearBuilt: m.yearBuilt,
      },
      condition: parseCondition(m.condition),
      price,
      status,
      date: m.soldDate?.trim() || asOf.slice(0, 10),
      distanceMiles: m.distanceMiles ?? 0.5,
      source: 'manual_comp',
    });
  });
  return { comps, dropped };
}

const STRATEGY_LABEL: Record<OfferResult['strategy'], string> = {
  wholesale: 'Wholesale',
  fix_and_flip: 'Fix & Flip',
  subject_to: 'Subject-To',
  creative_finance: 'Creative Finance',
};

const MOTIVATION_KEYWORDS = [
  'high', 'urgent', 'foreclosure', 'divorce', 'relocat', 'must', 'asap',
  'motivated', 'tired', 'distress', 'behind', 'probate', 'job loss',
];

function sellerIsMotivated(seller?: SellerInfoInput): boolean {
  const m = seller?.motivation?.toLowerCase() ?? '';
  return MOTIVATION_KEYWORDS.some((k) => m.includes(k));
}

interface RecoContext {
  arv: ArvResult;
  offers: OffersBundle;
  sellerInfo?: SellerInfoInput;
  riskScore: number;
  confidenceScore: number;
}

function recommendStrategy(ctx: RecoContext): StrategyRecommendation {
  const { arv, offers, sellerInfo, riskScore, confidenceScore } = ctx;
  const A = arv.conservative || 1;
  const motivated = sellerIsMotivated(sellerInfo);
  const hasLoan = (sellerInfo?.loanBalance ?? 0) > 0;

  const score = (o: OfferResult): { score: number; note: string } => {
    switch (o.strategy) {
      case 'fix_and_flip': {
        if (!o.viable) return { score: 5, note: 'No flip margin at this ARV/repair level' };
        const ratio = (o.projectedProfit ?? 0) / A;
        const s = 30 + Math.min(40, ratio * 200) - riskScore * 0.2 + confidenceScore * 0.1;
        return { score: s, note: `${usd(o.projectedProfit)} projected profit` };
      }
      case 'wholesale': {
        if (!o.viable) return { score: 5, note: 'No assignment spread' };
        let s = 35 + confidenceScore * 0.1 - riskScore * 0.1;
        if ((offers.fix_and_flip.projectedProfit ?? 0) < A * 0.08) s += 8;
        return { score: s, note: `~${usd(o.projectedProfit)} assignment fee, low effort` };
      }
      case 'subject_to': {
        if (!o.viable) return { score: hasLoan ? 8 : 3, note: hasLoan ? 'Equity/cash flow does not clear' : 'No existing-loan data' };
        const eq = (o.equity ?? 0) / A;
        const cf = o.monthlyCashFlow ?? 0;
        let s = 25 + Math.min(30, eq * 150) + (cf > 0 ? Math.min(15, cf / 50) : cf / 30);
        if (motivated) s += 8;
        s -= riskScore * 0.1;
        return { score: s, note: `${usd(o.equity)} equity, ${usd(o.monthlyCashFlow)}/mo` };
      }
      case 'creative_finance': {
        if (!o.viable) return { score: 6, note: 'Terms do not cash flow / price > ARV' };
        const eq = (o.equity ?? 0) / A;
        const cf = o.monthlyCashFlow ?? 0;
        let s = 22 + Math.min(24, eq * 120) + (cf > 0 ? Math.min(15, cf / 50) : cf / 30);
        if (motivated) s += 5;
        if (hasLoan) s -= 6;
        return { score: s, note: `${usd(o.monthlyCashFlow)}/mo cash flow` };
      }
    }
  };

  const ranking = ([offers.fix_and_flip, offers.wholesale, offers.subject_to, offers.creative_finance] as OfferResult[])
    .map((o) => {
      const { score: s, note } = score(o);
      return { strategy: o.strategy, score: Math.round(s), note };
    })
    .sort((a, b) => b.score - a.score);

  const top = ranking[0];
  const runnerUp = ranking[1];
  const rationale: string[] = [
    `${STRATEGY_LABEL[top.strategy]} scored highest (${top.score}) on ${top.note}.`,
  ];
  if (runnerUp) rationale.push(`Next best: ${STRATEGY_LABEL[runnerUp.strategy]} (${runnerUp.score}) — ${runnerUp.note}.`);
  if (motivated) rationale.push('Seller reads as motivated, which favors creative/subject-to structures.');
  if (riskScore >= 65) rationale.push('Overall risk is high — lean on the safer offer and verify before committing.');

  const summary =
    top.score < 20
      ? 'No strategy is clearly attractive at these numbers — pass or renegotiate.'
      : `${STRATEGY_LABEL[top.strategy]} is the best fit given the value, repairs, equity, and seller position.`;

  return { strategy: top.strategy, label: STRATEGY_LABEL[top.strategy], rationale, ranking, summary };
}

export interface RunOptions {
  providers?: ProviderBundle;
  /** ISO date the analysis is "as of". Defaults to now. */
  asOf?: string;
}

export async function runPropertyAnalysis(
  input: AnalysisInput,
  options: RunOptions = {},
): Promise<AnalysisResult> {
  const warnings: string[] = [];
  const providers = options.providers ?? resolveProviders();
  const asOf = options.asOf ?? new Date().toISOString();
  const ctx: ProviderContext = { asOf };

  const address = normalizeAddress(input.address);
  warnings.push(...address.warnings);

  const sourceAudit: SourceAuditEntry[] = [];

  /**
   * Call a provider, unwrapping the envelope and turning any thrown error (e.g.
   * a configured-but-unimplemented licensed adapter) into a null result with a
   * warning so the pipeline can continue where possible.
   */
  async function callProvider<T>(
    label: string,
    fn: () => Promise<ProviderResponse<T>>,
  ): Promise<ProviderResponse<T | null>> {
    try {
      return await fn();
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      return {
        providerName: 'Unavailable',
        sourceType: label,
        isMock: false,
        fetchedAt: asOf,
        confidence: 'low',
        data: null,
        warnings: [`${label} provider unavailable: ${msg}`],
      };
    }
  }

  // 1) DATA RETRIEVAL --------------------------------------------------------
  // Property (required — we need subject facts to value anything).
  const propertyResp = await callProvider('property', () =>
    providers.property.getPropertyByAddress(address, ctx),
  );
  // Mock warnings are covered by the loud mock banner; only surface real ones here.
  if (!propertyResp.isMock) warnings.push(...propertyResp.warnings);
  const subject = propertyResp.data;
  if (!subject) {
    throw new Error(
      'No property data available from the configured providers. Configure a property data provider (e.g. ATTOM) or enable mock mode for testing.',
    );
  }

  // Optional providers run in parallel; failures degrade gracefully.
  const [compsResp, publicRecordResp, valuationResp, rentResp] = await Promise.all([
    callProvider('comps', () => providers.comparables.getComparableSales(address, subject, ctx)),
    callProvider('public_record', () => providers.publicRecords.getPublicRecord(address, ctx)),
    callProvider('valuation', () => providers.valuation.getExternalValuations(address, subject, ctx)),
    callProvider('rent', () => providers.rent.getRentEstimate(address, subject, ctx)),
  ]);

  // Comps: provider comps + manual fallback comps, graded together.
  const providerComps = compsResp.data ?? [];
  const { comps: manualComps, dropped: manualDropped } = manualCompsToComps(
    input.manualComps,
    address,
    asOf,
  );
  if (manualDropped > 0)
    warnings.push(`${manualDropped} manual comp${manualDropped === 1 ? '' : 's'} ignored (no sold price).`);
  const comps: Comp[] = [...providerComps, ...manualComps];

  // 2) NORMALIZATION / ENRICHMENT -------------------------------------------
  // External valuation: supporting context only — never the final ARV.
  const valuation = (valuationResp.data ?? [])[0];

  // Enrich subject from public record where missing.
  const publicRecord = publicRecordResp.data;
  if (publicRecord) {
    subject.facts.yearBuilt ??= publicRecord.yearBuilt;
    subject.facts.lotSqft ??= publicRecord.lotSqft;
  } else if (!propertyResp.isMock) {
    warnings.push('No public-record data — tax/APN/deed context unavailable; continuing.');
  }

  // Rent: prefer the user's known figure, then a provider estimate.
  const providerRent = rentResp.data;
  const rent: RentEstimate | undefined =
    input.sellerInfo?.estimatedRent != null
      ? {
          monthlyRent: input.sellerInfo.estimatedRent,
          low: Math.round(input.sellerInfo.estimatedRent * 0.9),
          high: Math.round(input.sellerInfo.estimatedRent * 1.1),
          source: 'user_input',
        }
      : (providerRent ?? undefined);
  if (!rent)
    warnings.push('No rent estimate — subject-to and creative-finance cash flow is unverified.');

  // Comps are required to value the property.
  if (comps.length === 0) {
    throw new Error(
      'Insufficient comparable data to compute ARV. Configure a comparable-sales provider (e.g. MLS/RESO) or add manual comps.',
    );
  }

  // 3) SOURCE AUDIT ----------------------------------------------------------
  const f = subject.facts;
  sourceAudit.push({
    provider: propertyResp.providerName,
    sourceType: 'property',
    mock: propertyResp.isMock,
    fetchedAt: propertyResp.fetchedAt,
    supplied:
      `Subject facts — ${f.beds ?? '?'}bd / ${f.baths ?? '?'}ba, ` +
      `${f.sqft ? f.sqft.toLocaleString() : '?'} sqft, built ${f.yearBuilt ?? '?'}, ` +
      `${subject.condition.replace('_', ' ')} condition.`,
    warnings: propertyResp.warnings,
  });
  {
    const sold = comps.filter((c) => c.status === 'sold').length;
    const usesMockComps = providerComps.some((c) => isMockSource(c.source));
    const auditWarnings = [...compsResp.warnings];
    if (manualComps.length)
      auditWarnings.push(`${manualComps.length} manual fallback comp${manualComps.length === 1 ? '' : 's'} included.`);
    sourceAudit.push({
      provider: manualComps.length && !providerComps.length ? 'Manual comps (fallback)' : compsResp.providerName,
      sourceType: 'comps',
      mock: usesMockComps,
      fetchedAt: compsResp.fetchedAt,
      supplied: `${comps.length} comparable ${comps.length === 1 ? 'record' : 'records'} (${sold} sold, ${comps.length - sold} active/pending; ${manualComps.length} manual).`,
      warnings: auditWarnings,
    });
  }
  if (publicRecord) {
    sourceAudit.push({
      provider: publicRecordResp.providerName,
      sourceType: 'public_record',
      mock: publicRecordResp.isMock,
      fetchedAt: publicRecordResp.fetchedAt,
      supplied:
        `Assessor/recorder — ` +
        [
          publicRecord.apn ? `APN ${publicRecord.apn}` : null,
          publicRecord.lastSalePrice ? `last sale ${usd(publicRecord.lastSalePrice)}` : null,
          publicRecord.annualTaxes ? `taxes ${usd(publicRecord.annualTaxes)}/yr` : null,
        ]
          .filter(Boolean)
          .join(', ') || 'basic record.',
      warnings: publicRecordResp.warnings,
    });
  }
  if (valuation) {
    sourceAudit.push({
      provider: valuationResp.providerName,
      sourceType: 'valuation',
      mock: valuationResp.isMock,
      fetchedAt: valuationResp.fetchedAt,
      confidence: Math.round(valuation.confidence * 100),
      supplied: `AVM ${usd(valuation.estimate)} (range ${usd(valuation.low)}–${usd(valuation.high)}) — supporting context only, never the final ARV.`,
      warnings: valuationResp.warnings,
    });
  }
  if (rent) {
    sourceAudit.push({
      provider: rent.source === 'user_input' ? 'User Input' : rentResp.providerName,
      sourceType: 'rent',
      mock: isMockSource(rent.source),
      fetchedAt: rentResp.fetchedAt,
      supplied: `Rent ${usd(rent.monthlyRent)}/mo (range ${usd(rent.low)}–${usd(rent.high)}).`,
      warnings: rent.source === 'user_input' ? [] : rentResp.warnings,
    });
  }

  // 4) ANALYSIS PIPELINE -----------------------------------------------------
  const repairEstimate = estimateRepairs(input.repairs, subject.facts.sqft);
  const graded = gradeComps(subject, comps, { asOf });
  const arv = computeArv(subject, graded, { valuation: valuation ?? undefined, repairEstimate });
  const offers = computeOffers({ arv, repairEstimate, sellerInfo: input.sellerInfo, rent });
  const risk = computeRisk({ arv, repairEstimate, comps: graded, offers, sellerInfo: input.sellerInfo });
  const confidence = computeConfidence({
    arv,
    repairEstimate,
    subject,
    comps: graded,
    sellerInfo: input.sellerInfo,
    usedMockProvider: providers.usesMock,
  });
  const recommendation = recommendStrategy({
    arv,
    offers,
    sellerInfo: input.sellerInfo,
    riskScore: risk.score,
    confidenceScore: confidence.score,
  });
  const memo = generateDealMemo({
    address,
    subject,
    arv,
    repairEstimate,
    comps: graded,
    offers,
    risk,
    confidence,
    recommendation,
    sellerInfo: input.sellerInfo,
    sourceAudit,
    usedMockProvider: providers.usesMock,
  });

  // Collect data provenance.
  const dataSources = Array.from(
    new Set<DataSource>([
      ...subject.sources,
      ...comps.map((c) => c.source),
      ...(publicRecord ? [publicRecord.source] : []),
      ...(valuation ? [valuation.source] : []),
      ...(rent ? [rent.source] : []),
    ]),
  );

  if (providers.usesMock)
    warnings.push('Results generated from the simulated mock provider — not licensed provider data.');
  if (address.confidence < 0.6)
    warnings.push('Address parsed with low confidence — double-check the property is correct.');

  return {
    generatedAt: asOf,
    address,
    subject,
    publicRecord: publicRecord ?? undefined,
    valuation: valuation ?? undefined,
    rent,
    comps: graded,
    repairEstimate,
    arv,
    offers,
    risk,
    confidence,
    recommendation,
    memo,
    dataSources,
    sourceAudit,
    providerStatus: getProviderStatus(),
    usedMockProvider: providers.usesMock,
    warnings,
  };
}
