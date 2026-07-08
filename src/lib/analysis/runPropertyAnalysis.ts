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
import type { ProviderBundle, ProviderContext } from '@/lib/data-providers/providerTypes';
import type {
  AnalysisInput,
  AnalysisResult,
  ArvResult,
  DataSource,
  OfferResult,
  OffersBundle,
  RentEstimate,
  SellerInfoInput,
  StrategyRecommendation,
  SubjectProperty,
} from '@/lib/types';
import { estimateRepairs } from './repairEstimator';
import { gradeComps } from './compGradingEngine';
import { computeArv } from './conservativeArvEngine';
import { computeOffers } from './offerEngine';
import { computeRisk } from './riskEngine';
import { computeConfidence } from './confidenceEngine';
import { generateDealMemo } from './dealMemoGenerator';

const usd = (n?: number | null) => (n == null ? '—' : `$${Math.round(n).toLocaleString()}`);

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

  // Fetch provider data (parallel).
  const subjectRaw = await providers.property.getProperty(address, ctx);
  if (!subjectRaw) {
    throw new Error(
      'No property data available from the configured providers. Add a licensed provider or use the manual-paste fallback.',
    );
  }
  const subject: SubjectProperty = subjectRaw;

  const [comps, publicRecord, valuation, providerRent] = await Promise.all([
    providers.comparables.getComparables(address, subject, ctx),
    providers.publicRecords.getPublicRecord(address, ctx),
    providers.valuation.getValuation(address, subject, ctx),
    providers.rent.getRent(address, subject, ctx),
  ]);

  // Enrich subject from public record where missing.
  if (publicRecord) {
    subject.facts.yearBuilt ??= publicRecord.yearBuilt;
    subject.facts.lotSqft ??= publicRecord.lotSqft;
  }

  // Rent: prefer the user's known figure.
  const rent: RentEstimate | undefined =
    input.sellerInfo?.estimatedRent != null
      ? {
          monthlyRent: input.sellerInfo.estimatedRent,
          low: Math.round(input.sellerInfo.estimatedRent * 0.9),
          high: Math.round(input.sellerInfo.estimatedRent * 1.1),
          source: 'user_input',
        }
      : (providerRent ?? undefined);

  // Pipeline.
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
    usedMockProvider: providers.usesMock,
    warnings,
  };
}
