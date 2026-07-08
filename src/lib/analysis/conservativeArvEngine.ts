/**
 * Conservative ARV engine — pure.
 *
 * Rules (per product spec):
 *  - Use qualified SOLD comps first; active/listed only as supporting context.
 *  - Never let one aggressive comp dominate: outliers are excluded and the
 *    headline leans on the median + a weighted mean, whichever is lower.
 *  - <3 qualified sold comps → low-confidence warning and a deeper discount.
 *  - Recommended conservative ARV leans BELOW the median when data is imperfect.
 *  - Repair vagueness / heavy rehab lowers ARV confidence (finish risk).
 */
import { ARV_RULES } from '@/config/analysisConfig';
import { isRecordedSale } from './saleRecording';
import type {
  ArvResult,
  GradedComp,
  ProviderValuation,
  RepairEstimate,
  SubjectProperty,
} from '@/lib/types';

function median(nums: number[]): number {
  if (!nums.length) return 0;
  const s = [...nums].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

function percentile(nums: number[], p: number): number {
  if (!nums.length) return 0;
  const s = [...nums].sort((a, b) => a - b);
  const idx = Math.min(s.length - 1, Math.max(0, Math.round((p / 100) * (s.length - 1))));
  return s[idx];
}

const round1k = (n: number) => Math.round(n / 1000) * 1000;

export interface ArvOptions {
  valuation?: ProviderValuation;
  repairEstimate?: RepairEstimate;
}

export function computeArv(
  subject: SubjectProperty,
  graded: GradedComp[],
  opts: ArvOptions = {},
): ArvResult {
  const warnings: string[] = [];

  const sold = graded.filter((g) => g.comp.status === 'sold');
  const nonOutlierSold = sold.filter((g) => !g.flags.includes('outlier'));
  const outlierCount = sold.length - nonOutlierSold.length;

  const primary = nonOutlierSold.filter((g) => g.disposition === 'qualified');
  const secondary = nonOutlierSold.filter((g) => g.disposition === 'penalized');

  let used: GradedComp[];
  if (primary.length >= ARV_RULES.minQualifiedSoldComps) {
    used = primary;
  } else if (primary.length + secondary.length > 0) {
    used = [...primary, ...secondary];
  } else {
    used = nonOutlierSold.length ? nonOutlierSold : sold;
  }

  if (used.length === 0) {
    return {
      low: 0,
      median: 0,
      high: 0,
      conservative: 0,
      confidence: 5,
      qualifiedCompCount: 0,
      usedCompCount: 0,
      explanation: 'No sold comps were available to value this property.',
      warnings: ['No usable comps — cannot compute a reliable ARV.'],
    };
  }

  const values = used.map((g) => g.impliedValue);
  const weights = used.map((g) => g.score / 100);
  const useTails = values.length >= 5;
  const low = useTails ? percentile(values, 20) : Math.min(...values);
  const high = useTails ? percentile(values, 80) : Math.max(...values);
  const med = median(values);
  const weightSum = weights.reduce((a, b) => a + b, 0) || 1;
  const weightedMean = values.reduce((s, v, i) => s + v * weights[i], 0) / weightSum;

  // Lean low: base off the lower of median vs. weighted mean, then safety shave.
  let conservative = Math.min(med, weightedMean) * ARV_RULES.safetyMargin;

  // Confidence.
  let confidence = 55;
  if (primary.length >= 5) confidence += 25;
  else if (primary.length >= ARV_RULES.minQualifiedSoldComps) confidence += 12;
  else confidence -= 10;

  const cv = med > 0 ? (high - low) / med : 1;
  if (cv < 0.15) confidence += 10;
  else if (cv > 0.35) confidence -= 10;

  if (opts.valuation && opts.valuation.estimate > 0) {
    const diff = (med - opts.valuation.estimate) / opts.valuation.estimate;
    if (Math.abs(diff) < 0.1) confidence += 8;
    if (diff > 0.15) {
      confidence -= 10;
      warnings.push(
        'Comp median runs well above the provider AVM — comps may be hot; treated conservatively.',
      );
    }
  }

  const rehab = opts.repairEstimate?.rehabLevel;
  if (opts.repairEstimate && opts.repairEstimate.confidence < 40) confidence -= 8;
  if (rehab === 'heavy' || rehab === 'full_gut') {
    confidence -= 6;
    warnings.push('ARV assumes a quality renovation — finish level will move this number.');
  }

  // Recorded-price layer: how many QUALIFIED comps carry an affirmatively
  // recorded sale price (deed language)? Non-disclosure markets (e.g. TX) and
  // modeled backfills fail this test — flag per-comp evidence, never a blanket
  // state rule. This is OUR confidence, derived from OUR graded set. Only
  // applies when the source supplies recorder metadata at all (saleType) —
  // manual comps and sources without deed text carry no signal either way.
  const hasRecorderMetadata = primary.some((g) => g.comp.saleType !== undefined);
  const recordedQualifiedCount = hasRecorderMetadata
    ? primary.filter((g) => isRecordedSale(g.comp.saleType)).length
    : undefined;
  if (hasRecorderMetadata && recordedQualifiedCount !== undefined && primary.length > 0) {
    const unrecorded = primary.length - recordedQualifiedCount;
    if (recordedQualifiedCount === 0) {
      confidence = Math.min(confidence, 45);
      conservative *= 0.97;
      warnings.push(
        'None of the qualified comps carry a recorded sale price — typical of non-disclosure states (e.g. Texas) or modeled data. Treat this ARV as modeled and verify with local sold data.',
      );
    } else if (unrecorded > 0) {
      confidence -= Math.min(18, unrecorded * 6);
      warnings.push(
        `${unrecorded} of ${primary.length} qualified comp${primary.length === 1 ? '' : 's'} lack a recorded sale price (non-disclosure/modeled) — those values may be estimates.`,
      );
    }
  }

  confidence = Math.max(10, Math.min(95, confidence));

  // Deeper discount when confidence is low.
  if (confidence < 60) conservative *= 0.94;
  // Always keep the recommended number below the median for imperfect data.
  conservative = Math.min(conservative, med * 0.99);

  // Sanity flag: a CONSERVATIVE number landing above the provider's own
  // estimate is unusual — surface it rather than silently trusting either side.
  if (opts.valuation && opts.valuation.estimate > 0 && conservative > opts.valuation.estimate) {
    warnings.push(
      `Our conservative ARV ($${round1k(conservative).toLocaleString()}) lands ABOVE the provider's value estimate ($${round1k(opts.valuation.estimate).toLocaleString()}) — double-check the comp set before trusting either number.`,
    );
  }

  if (primary.length < ARV_RULES.minQualifiedSoldComps) {
    warnings.push(
      `Only ${primary.length} qualified sold comp${primary.length === 1 ? '' : 's'} (want ${ARV_RULES.minQualifiedSoldComps}+) — ARV is low-confidence; verify manually.`,
    );
  }
  if (outlierCount > 0) {
    warnings.push(
      `Excluded ${outlierCount} outlier comp${outlierCount === 1 ? '' : 's'} so one aggressive sale can't inflate ARV.`,
    );
  }

  const explanation =
    `Valued from ${used.length} sold comp${used.length === 1 ? '' : 's'} ` +
    `(${primary.length} qualified). Used the lower of median ($${round1k(med).toLocaleString()}) ` +
    `and a score-weighted mean, shaved ${Math.round((1 - ARV_RULES.safetyMargin) * 100)}% for safety` +
    `${confidence < 60 ? ', plus an extra low-confidence discount' : ''}. ` +
    `Active listings were held out of the value and used only as context.`;

  return {
    low: round1k(low),
    median: round1k(med),
    high: round1k(high),
    conservative: round1k(conservative),
    confidence: Math.round(confidence),
    qualifiedCompCount: primary.length,
    recordedQualifiedCount,
    usedCompCount: used.length,
    explanation,
    warnings,
  };
}
