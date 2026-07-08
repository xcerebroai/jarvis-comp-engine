/**
 * Confidence engine — pure. Blends ARV confidence, repair confidence, and data
 * completeness into an overall 0–100 confidence score. Mock/simulated data is
 * capped so it can never read as high-confidence licensed data.
 */
import { ARV_RULES } from '@/config/analysisConfig';
import type {
  ArvResult,
  ConfidenceScore,
  GradedComp,
  RepairEstimate,
  ScoreFactor,
  SellerInfoInput,
  SubjectProperty,
} from '@/lib/types';

export interface ConfidenceInput {
  arv: ArvResult;
  repairEstimate: RepairEstimate;
  subject: SubjectProperty;
  comps: GradedComp[];
  sellerInfo?: SellerInfoInput;
  usedMockProvider: boolean;
}

export function computeConfidence(input: ConfidenceInput): ConfidenceScore {
  const { arv, repairEstimate, subject, comps, sellerInfo, usedMockProvider } = input;
  const factors: ScoreFactor[] = [];

  // Data completeness (0–100).
  const factKeys: (keyof typeof subject.facts)[] = ['sqft', 'beds', 'baths', 'yearBuilt'];
  const factsPresent = factKeys.filter((k) => subject.facts[k] != null).length;
  let completeness = (factsPresent / factKeys.length) * 55;
  const qualified = comps.filter((c) => c.disposition === 'qualified').length;
  completeness += Math.min(25, qualified * 6);
  if (sellerInfo && Object.values(sellerInfo).some((v) => v != null && v !== '')) completeness += 20;
  completeness = Math.min(100, completeness);

  factors.push({ label: 'ARV confidence', points: arv.confidence, detail: 'weight 45%' });
  factors.push({ label: 'Repair confidence', points: repairEstimate.confidence, detail: 'weight 25%' });
  factors.push({ label: 'Data completeness', points: Math.round(completeness), detail: 'weight 30%' });

  let score = Math.round(0.45 * arv.confidence + 0.25 * repairEstimate.confidence + 0.3 * completeness);

  // Thin comp support caps confidence low — a value from <3 qualified sold
  // comps is not defensible no matter how complete the other inputs look.
  const thinComps = qualified < ARV_RULES.minQualifiedSoldComps;
  if (thinComps) {
    score = Math.min(score, 44);
    factors.push({
      label: `Only ${qualified} qualified sold comp${qualified === 1 ? '' : 's'}`,
      points: 0,
      detail: `need ${ARV_RULES.minQualifiedSoldComps}+ for solid confidence — capped low`,
    });
  }

  if (usedMockProvider) {
    score = Math.min(score, 80);
    factors.push({ label: 'Simulated (mock) data', points: -0, detail: 'testing only — capped at 80' });
  }

  score = Math.max(5, Math.min(95, score));
  const level = score < 45 ? 'low' : score < 70 ? 'moderate' : 'high';

  let summary =
    level === 'high'
      ? 'High confidence — inputs are complete and comps are strong.'
      : level === 'moderate'
        ? 'Moderate confidence — usable, but tighten the weakest inputs before acting.'
        : 'Low confidence — treat this as a first-pass screen, not a final number.';
  if (thinComps) summary = `Fewer than ${ARV_RULES.minQualifiedSoldComps} qualified sold comps. ${summary}`;
  if (usedMockProvider) summary = `Simulated (mock) data — for testing only. ${summary}`;

  return { score, level, factors, summary };
}
