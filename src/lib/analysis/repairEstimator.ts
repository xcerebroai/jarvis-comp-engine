/**
 * Repair estimator — pure. Turns the intake's rehab level + itemized
 * categories + notes into a conservative repair budget with a range and a
 * confidence score.
 *
 * Conservative rules:
 *  - Never estimate BELOW the evidence: recommended = max(itemized, rehab
 *    baseline) + contingency.
 *  - `unknown` categories cost like `moderate` but widen the range and cut
 *    confidence.
 *  - Vague scope (rehab level only, or heavy/full-gut with little detail)
 *    widens the range and warns that ARV depends on renovation quality.
 */
import {
  LEVEL_TO_COST_KEY,
  REHAB_CONTINGENCY_PCT,
  REHAB_LEVEL_PER_SQFT,
  REPAIR_COST_TABLE,
} from '@/config/analysisConfig';
import {
  REPAIR_CATEGORIES,
  type RehabLevel,
  type RepairCategory,
  type RepairEstimate,
  type RepairInput,
  type RepairLevel,
  type RepairLineItem,
} from '@/lib/types';

const ASSUMED_SQFT = 1500;

function costFor(
  category: RepairCategory,
  level: RepairLevel,
  sqft: number,
): number {
  const key = LEVEL_TO_COST_KEY[level];
  if (!key) return 0;
  const spec = REPAIR_COST_TABLE[category];
  const base = spec[key];
  return spec.type === 'per_sqft' ? base * sqft : base;
}

/** If no rehab level is given, infer one from the worst itemized severity. */
function inferRehabLevel(input: RepairInput): RehabLevel {
  const levels = Object.values(input.categories ?? {});
  if (levels.includes('full_replacement')) return 'full_gut';
  if (levels.includes('major')) return 'heavy';
  if (levels.includes('moderate')) return 'medium';
  if (levels.includes('minor')) return 'light';
  return 'light';
}

export function estimateRepairs(
  input: RepairInput,
  sqft?: number,
): RepairEstimate {
  const assumptions: string[] = [];
  const warnings: string[] = [];

  const effectiveSqft = sqft ?? ASSUMED_SQFT;
  if (!sqft) assumptions.push(`Subject sqft unknown — assumed ${ASSUMED_SQFT} sqft.`);

  const rehabLevel = input.rehabLevel ?? inferRehabLevel(input);
  if (!input.rehabLevel) assumptions.push(`No rehab level entered — inferred "${rehabLevel}".`);

  const categories = input.categories ?? {};
  const unknownCategories: RepairCategory[] = [];
  const lineItems: RepairLineItem[] = [];
  let itemizedSubtotal = 0;

  for (const category of REPAIR_CATEGORIES) {
    if (category === 'contingency') continue;
    const level = categories[category];
    if (!level || level === 'not_needed') continue;
    if (level === 'unknown') unknownCategories.push(category);

    const recommended = Math.round(costFor(category, level, effectiveSqft));
    const spread = level === 'unknown' ? { lo: 0.6, hi: 1.6 } : { lo: 0.8, hi: 1.3 };
    lineItems.push({
      category,
      level,
      low: Math.round(recommended * spread.lo),
      high: Math.round(recommended * spread.hi),
      recommended,
      note: level === 'unknown' ? 'Marked Unknown — assumed moderate.' : undefined,
    });
    itemizedSubtotal += recommended;
  }

  // Rehab-level baseline as a conservative floor.
  const baseline = Math.round(effectiveSqft * REHAB_LEVEL_PER_SQFT[rehabLevel]);
  const hasItemization = lineItems.length > 0;
  const subtotal = Math.max(itemizedSubtotal, baseline);

  assumptions.push(
    `Rehab baseline: ${effectiveSqft} sqft × $${REHAB_LEVEL_PER_SQFT[rehabLevel]}/sqft = $${baseline.toLocaleString()}.`,
  );
  if (hasItemization) {
    assumptions.push(
      `Itemized categories total $${itemizedSubtotal.toLocaleString()}; using the higher of itemized vs. baseline.`,
    );
  }

  // Contingency: rehab-level driven, bumped if user explicitly flags it high.
  let contingencyPct = REHAB_CONTINGENCY_PCT[rehabLevel];
  const contingencyLevel = categories.contingency;
  if (contingencyLevel === 'major') contingencyPct += 0.05;
  if (contingencyLevel === 'full_replacement') contingencyPct += 0.1;
  const contingency = Math.round(subtotal * contingencyPct);
  assumptions.push(`Contingency: ${Math.round(contingencyPct * 100)}% of subtotal.`);

  const vague = !hasItemization || rehabLevel === 'heavy' || rehabLevel === 'full_gut';
  const recommended = Math.round(subtotal + contingency);
  const low = Math.round(subtotal * 0.85);
  const high = Math.round((subtotal + contingency) * (vague ? 1.4 : 1.2));

  // Confidence.
  let confidence = 70;
  if (lineItems.length >= 6) confidence += 15;
  else if (lineItems.length >= 3) confidence += 5;
  if (!hasItemization) confidence -= 20;
  confidence -= Math.min(30, unknownCategories.length * 6);
  if (rehabLevel === 'heavy') confidence -= 8;
  if (rehabLevel === 'full_gut') confidence -= 15;
  const hasNotes =
    (input.repairNotes?.trim().length ?? 0) > 8 ||
    (input.knownMajorRepairs?.trim().length ?? 0) > 8;
  if (hasNotes) confidence += 8;
  confidence = Math.max(5, Math.min(95, confidence));

  // Warnings.
  if ((rehabLevel === 'heavy' || rehabLevel === 'full_gut') && !hasItemization) {
    warnings.push(
      `${rehabLevel === 'full_gut' ? 'Full-gut' : 'Heavy'} rehab with little itemized detail — treat this number as a placeholder and get contractor bids.`,
    );
  }
  if (unknownCategories.length > 0) {
    warnings.push(
      `${unknownCategories.length} categor${unknownCategories.length === 1 ? 'y' : 'ies'} marked Unknown — range widened and confidence reduced.`,
    );
  }
  if (rehabLevel === 'full_gut') {
    warnings.push('ARV depends heavily on renovation quality and finish level for a full gut.');
  }
  if (!hasItemization && !input.rehabLevel) {
    warnings.push('No repair scope entered — used a light-rehab placeholder.');
  }

  return {
    rehabLevel,
    low,
    high,
    recommended,
    confidence,
    lineItems,
    unknownCategories,
    assumptions,
    warnings,
  };
}
