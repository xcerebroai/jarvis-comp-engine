import type { Estimate, Subject } from '@/lib/types';

/** A single repair line item, e.g. "roof", "HVAC", "cosmetic/sqft". */
export interface RepairLineItem {
  category: string;
  cost: number;
  note?: string;
}

/**
 * Estimate repair cost from subject condition + notes.
 *
 * Approach (to implement): baseline $/sqft by condition tier, plus
 * line-item add-ons parsed from inspection/repair notes (roof, HVAC,
 * foundation, etc.). Returns a range; conservative estimates round UP.
 *
 * Pure function — no I/O, fully unit-testable.
 */
export function estimateRepairs(subject: Subject): {
  estimate: Estimate;
  lineItems: RepairLineItem[];
} {
  // TODO: condition tiers + note-driven line items.
  void subject;
  return {
    estimate: {
      value: 0,
      low: 0,
      high: 0,
      confidence: 0,
      notes: 'repair estimation not yet implemented',
    },
    lineItems: [],
  };
}
