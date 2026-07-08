import type { Estimate, Subject } from '@/lib/types';
import type { GradedComp } from '@/lib/domain/comps/gradeComps';
import { ARV_SAFETY_MARGIN } from '@/config/offerRules';

/**
 * Estimate a CONSERVATIVE After-Repair Value from graded comps.
 *
 * Approach (to implement): weight comps by grade/similarity, derive a
 * $/sqft or adjusted-price value, then apply ARV_SAFETY_MARGIN so the
 * headline number leans low. Confidence reflects comp quality + spread.
 *
 * Pure function — no I/O, fully unit-testable.
 */
export function estimateArv(subject: Subject, graded: GradedComp[]): Estimate {
  // TODO: weighted valuation from A/B comps + subject adjustments.
  void subject;
  void graded;
  const value = 0;
  return {
    value: Math.round(value * ARV_SAFETY_MARGIN),
    low: 0,
    high: 0,
    confidence: 0,
    notes: 'ARV estimation not yet implemented',
  };
}
