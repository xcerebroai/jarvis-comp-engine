/**
 * Risk engine — pure. Aggregates deal-level risk (0–100, higher = riskier)
 * from data quality, repair scope, comp strength, and seller/debt signals.
 */
import type {
  ArvResult,
  GradedComp,
  OffersBundle,
  RepairEstimate,
  RiskScore,
  ScoreFactor,
  SellerInfoInput,
} from '@/lib/types';

export interface RiskInput {
  arv: ArvResult;
  repairEstimate: RepairEstimate;
  comps: GradedComp[];
  offers: OffersBundle;
  sellerInfo?: SellerInfoInput;
}

export function computeRisk(input: RiskInput): RiskScore {
  const { arv, repairEstimate, comps, offers, sellerInfo } = input;
  const factors: ScoreFactor[] = [];

  const arvRisk = Math.round((100 - arv.confidence) * 0.25);
  if (arvRisk > 0)
    factors.push({ label: 'ARV confidence', points: arvRisk, detail: `${arv.confidence}/100` });

  if (arv.qualifiedCompCount < 3)
    factors.push({ label: 'Thin comp set', points: 15, detail: `${arv.qualifiedCompCount} qualified sold` });

  const cv = arv.median > 0 ? (arv.high - arv.low) / arv.median : 0;
  if (cv > 0.35) factors.push({ label: 'Wide comp spread', points: 10, detail: `${Math.round(cv * 100)}% range` });

  if (repairEstimate.rehabLevel === 'full_gut')
    factors.push({ label: 'Full-gut rehab scope', points: 20 });
  else if (repairEstimate.rehabLevel === 'heavy')
    factors.push({ label: 'Heavy rehab scope', points: 12 });

  if (repairEstimate.confidence < 45)
    factors.push({ label: 'Vague repair detail', points: 10, detail: `${repairEstimate.confidence}/100` });
  const unknowns = repairEstimate.unknownCategories.length;
  if (unknowns > 0)
    factors.push({ label: 'Unknown repair categories', points: Math.min(10, unknowns * 2), detail: `${unknowns}` });

  if (!offers.fix_and_flip.viable)
    factors.push({ label: 'No flip margin at this ARV/repair', points: 12 });

  if (comps.some((c) => c.flags.includes('outlier')))
    factors.push({ label: 'Outlier comps present', points: 5 });

  if (offers.subject_to.viable === false && (sellerInfo?.loanBalance ?? 0) > 0 && (offers.subject_to.equity ?? 0) <= 0)
    factors.push({ label: 'Negative equity on debt takeover', points: 8 });
  if ((sellerInfo?.arrears ?? 0) > arv.conservative * 0.05)
    factors.push({ label: 'High arrears to reinstate', points: 5 });

  const score = Math.max(0, Math.min(100, factors.reduce((s, f) => s + f.points, 0)));
  const level = score < 25 ? 'low' : score < 45 ? 'moderate' : score < 65 ? 'high' : 'very_high';

  const summary =
    level === 'low'
      ? 'Low risk — data and scope are solid; standard diligence applies.'
      : level === 'moderate'
        ? 'Moderate risk — a few soft spots; verify the flagged items before offering.'
        : level === 'high'
          ? 'High risk — several weak signals; treat numbers as provisional and confirm on-site.'
          : 'Very high risk — key inputs are shaky; do not commit without hard verification.';

  return { score, level, factors, summary };
}
