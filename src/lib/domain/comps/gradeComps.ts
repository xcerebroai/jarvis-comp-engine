import type { Comp, Subject } from '@/lib/types';

export type CompGrade = 'A' | 'B' | 'C' | 'D' | 'F';

export interface GradedComp {
  comp: Comp;
  grade: CompGrade;
  /** 0–100 similarity score to the subject. */
  score: number;
  /** Reasons the comp scored the way it did (distance, size, recency…). */
  reasons: string[];
}

/**
 * Grade each comp by similarity to the subject property.
 *
 * Grading axes (to implement): proximity, sqft delta, bed/bath match,
 * recency of sale, condition alignment, and same-market signals. Closer +
 * more recent + more similar => higher grade. A/B comps drive ARV; D/F are
 * excluded or flagged.
 *
 * Pure function — no I/O, fully unit-testable.
 */
export function gradeComps(subject: Subject, comps: Comp[]): GradedComp[] {
  // TODO: implement scoring model.
  void subject;
  return comps.map((comp) => ({
    comp,
    grade: 'C',
    score: 0,
    reasons: ['grading not yet implemented'],
  }));
}
