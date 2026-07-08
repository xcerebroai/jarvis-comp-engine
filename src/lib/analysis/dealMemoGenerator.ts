/**
 * Deal memo generator — pure. Turns the full analysis into a clean,
 * plain-English memo: property, repairs, value, comp logic, offers, best
 * strategy, red flags, and the next questions to ask the seller.
 */
import type {
  ArvResult,
  ConfidenceScore,
  DealMemo,
  GradedComp,
  MemoSection,
  NormalizedAddress,
  OfferResult,
  OffersBundle,
  RepairEstimate,
  RiskScore,
  SellerInfoInput,
  StrategyRecommendation,
  SubjectProperty,
} from '@/lib/types';

const usd = (n?: number | null) => (n == null ? '—' : `$${Math.round(n).toLocaleString()}`);
const pct = (n: number) => `${Math.round(n)}%`;

const STRATEGY_LABEL: Record<OfferResult['strategy'], string> = {
  wholesale: 'Wholesale',
  fix_and_flip: 'Fix & Flip',
  subject_to: 'Subject-To',
  creative_finance: 'Creative Finance',
};

export interface DealMemoInput {
  address: NormalizedAddress;
  subject: SubjectProperty;
  arv: ArvResult;
  repairEstimate: RepairEstimate;
  comps: GradedComp[];
  offers: OffersBundle;
  risk: RiskScore;
  confidence: ConfidenceScore;
  recommendation: StrategyRecommendation;
  sellerInfo?: SellerInfoInput;
  usedMockProvider: boolean;
}

function offerLine(o: OfferResult): string {
  const label = STRATEGY_LABEL[o.strategy];
  if (!o.viable && o.maxOffer == null)
    return `- ${label}: not priced — ${o.explanation}`;
  const money =
    o.strategy === 'subject_to' || o.strategy === 'creative_finance'
      ? `${usd(o.maxOffer)} in` +
        (o.equity != null ? `, ${usd(o.equity)} equity` : '') +
        (o.monthlyCashFlow != null ? `, ${usd(o.monthlyCashFlow)}/mo` : '')
      : `max ${usd(o.maxOffer)}, safer ${usd(o.saferOffer)}` +
        (o.projectedProfit != null ? `, ~${usd(o.projectedProfit)} profit` : '');
  return `- ${label}${o.viable ? '' : ' (marginal)'}: ${money} — risk ${o.riskLevel.replace('_', ' ')}, confidence ${o.confidence}/100`;
}

export function generateDealMemo(input: DealMemoInput): DealMemo {
  const { address, subject, arv, repairEstimate, comps, offers, risk, confidence, recommendation } = input;
  const f = subject.facts;

  const qualified = comps.filter((c) => c.disposition === 'qualified');
  const rejected = comps.filter((c) => c.disposition === 'rejected');
  const support = comps.filter((c) => c.disposition === 'support');

  const sections: MemoSection[] = [];

  sections.push({
    title: 'Property',
    body:
      `${address.formatted || 'Address unavailable'} — ${subject.propertyType.replace('_', ' ')}. ` +
      `${f.beds ?? '?'} bd / ${f.baths ?? '?'} ba, ${f.sqft ? f.sqft.toLocaleString() : '?'} sqft` +
      `${f.yearBuilt ? `, built ${f.yearBuilt}` : ''}. Condition: ${subject.condition.replace('_', ' ')}.` +
      (input.usedMockProvider ? ' (Data source: simulated mock provider.)' : ''),
  });

  sections.push({
    title: 'Repair Situation',
    body:
      `${repairEstimate.rehabLevel.replace('_', ' ')} rehab. Recommended budget ${usd(repairEstimate.recommended)} ` +
      `(range ${usd(repairEstimate.low)}–${usd(repairEstimate.high)}), repair confidence ${repairEstimate.confidence}/100.` +
      (repairEstimate.warnings.length ? ` Notes: ${repairEstimate.warnings.join(' ')}` : ''),
  });

  sections.push({
    title: 'Conservative Value',
    body:
      `Recommended conservative ARV ${usd(arv.conservative)} ` +
      `(low ${usd(arv.low)} / median ${usd(arv.median)} / high ${usd(arv.high)}), confidence ${arv.confidence}/100. ` +
      arv.explanation,
  });

  sections.push({
    title: 'Comp Logic',
    body:
      `${qualified.length} qualified sold comp${qualified.length === 1 ? '' : 's'} drove the value; ` +
      `${support.length} active listing${support.length === 1 ? '' : 's'} used as context; ` +
      `${rejected.length} rejected. ` +
      (qualified[0] ? `Best comp: ${qualified[0].comp.address.street} at ${usd(qualified[0].comp.price)} (${qualified[0].score}/100).` : 'No comp reached the qualified bar.'),
  });

  sections.push({
    title: 'Offer Recommendations',
    body: [offers.wholesale, offers.fix_and_flip, offers.subject_to, offers.creative_finance]
      .map(offerLine)
      .join('\n'),
  });

  sections.push({
    title: 'Best Strategy',
    body: `${recommendation.label}. ${recommendation.summary}` +
      (recommendation.rationale.length ? `\nWhy: ${recommendation.rationale.join(' ')}` : ''),
  });

  sections.push({
    title: 'Risk & Confidence',
    body: `Risk ${risk.score}/100 (${risk.level.replace('_', ' ')}). ${risk.summary} Overall confidence ${confidence.score}/100 (${confidence.level}). ${confidence.summary}`,
  });

  // Aggregate red flags.
  const redFlags = Array.from(
    new Set([
      ...offers.wholesale.redFlags,
      ...offers.fix_and_flip.redFlags,
      ...offers.subject_to.redFlags,
      ...offers.creative_finance.redFlags,
      ...arv.warnings,
      ...repairEstimate.warnings,
    ]),
  );

  // Aggregate + dedupe seller questions.
  const nextQuestions = Array.from(
    new Set([
      ...offers.fix_and_flip.sellerQuestions,
      ...offers.subject_to.sellerQuestions,
      ...offers.creative_finance.sellerQuestions,
      ...offers.wholesale.sellerQuestions,
    ]),
  );

  const headline =
    `${address.formatted || 'Subject property'} — ${recommendation.label} looks best. ` +
    `Conservative ARV ${usd(arv.conservative)}, repairs ${usd(repairEstimate.recommended)}, ` +
    `risk ${risk.level.replace('_', ' ')}, confidence ${confidence.score}/100.`;

  const plainText = [
    `DEAL MEMO — ${address.formatted}`,
    headline,
    '',
    ...sections.map((s) => `${s.title.toUpperCase()}\n${s.body}`),
    '',
    `RED FLAGS\n${redFlags.length ? redFlags.map((r) => `- ${r}`).join('\n') : '- None flagged.'}`,
    '',
    `NEXT QUESTIONS FOR THE SELLER\n${nextQuestions.map((q) => `- ${q}`).join('\n')}`,
    '',
    `Confidence ${confidence.score}/100 · Risk ${risk.score}/100 · ${pct(arv.confidence)} ARV confidence.` +
      (input.usedMockProvider ? ' Generated from simulated mock data — not licensed provider data.' : ''),
  ].join('\n');

  return { headline, sections, redFlags, nextQuestions, plainText };
}
