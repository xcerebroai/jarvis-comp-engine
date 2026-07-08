/**
 * Comp grading engine — pure. Scores each comp 0–100 against the subject and
 * explains why it was accepted, penalized, or rejected.
 *
 * Rules (per product spec):
 *  - Sold comps preferred; active/listed penalized heavily (support only).
 *  - Recency: ≤90d best, 91–180d penalty, >180d bigger penalty.
 *  - Distance: >0.5mi penalty, >1mi bigger penalty.
 *  - Sqft: >15% penalty, >25% major penalty.
 *  - Bed/bath, year-built, and condition mismatches each penalized.
 *  - Fully renovated retail comps penalized when the subject is not renovated.
 *  - $/sqft outliers flagged and penalized so one aggressive comp can't
 *    dominate downstream ARV.
 */
import { ARV_RULES } from '@/config/analysisConfig';
import type {
  Comp,
  CompDisposition,
  CompPenalty,
  GradedComp,
  PropertyCondition,
  SubjectProperty,
} from '@/lib/types';

const CONDITION_RANK: Record<PropertyCondition, number> = {
  distressed: 0,
  below_average: 1,
  unknown: 2,
  average: 2,
  updated: 3,
  renovated: 4,
};

function daysBetween(fromISO: string, toISO: string): number {
  const from = new Date(fromISO).getTime();
  const to = new Date(toISO).getTime();
  if (Number.isNaN(from) || Number.isNaN(to)) return 0;
  return Math.round((to - from) / 86_400_000);
}

function median(nums: number[]): number {
  if (nums.length === 0) return 0;
  const s = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

function ppsfOf(comp: Comp): number | null {
  return comp.facts.sqft ? comp.price / comp.facts.sqft : null;
}

export interface GradeOptions {
  asOf: string;
}

export function gradeComps(
  subject: SubjectProperty,
  comps: Comp[],
  opts: GradeOptions,
): GradedComp[] {
  const subjectSqft = subject.facts.sqft;
  const subjectRank = CONDITION_RANK[subject.condition];

  const soldPpsf = comps
    .filter((c) => c.status === 'sold')
    .map(ppsfOf)
    .filter((v): v is number => v !== null);
  const medianPpsf = median(soldPpsf);

  return comps.map((comp) => {
    const penalties: CompPenalty[] = [];
    const flags: string[] = [];
    const add = (label: string, points: number) => penalties.push({ label, points });

    // Status.
    if (comp.status === 'active') {
      add('Active listing (asking price, not a closed sale)', 40);
      flags.push('active-listing');
    } else if (comp.status === 'pending') {
      add('Pending (not yet closed)', 15);
      flags.push('pending');
    }

    // Recency (sold only — active/pending are current).
    if (comp.status === 'sold') {
      const age = daysBetween(comp.date, opts.asOf);
      if (age > 180) add(`Sold ${age} days ago (>180d)`, 25);
      else if (age > 90) add(`Sold ${age} days ago (91–180d)`, 10);
    }

    // Distance.
    if (comp.distanceMiles > 1) add(`${comp.distanceMiles.toFixed(2)} mi away (>1 mi)`, 25);
    else if (comp.distanceMiles > 0.5) add(`${comp.distanceMiles.toFixed(2)} mi away (>0.5 mi)`, 10);

    // Sqft delta.
    if (subjectSqft && comp.facts.sqft) {
      const pct = Math.abs(comp.facts.sqft - subjectSqft) / subjectSqft;
      if (pct > 0.25) add(`Sqft differs ${Math.round(pct * 100)}% (>25%)`, 25);
      else if (pct > 0.15) add(`Sqft differs ${Math.round(pct * 100)}% (>15%)`, 10);
    }

    // Bed / bath mismatch.
    if (subject.facts.beds != null && comp.facts.beds != null) {
      const d = Math.abs(comp.facts.beds - subject.facts.beds);
      if (d >= 1) add(`${d} bed difference`, Math.min(15, d * 6));
    }
    if (subject.facts.baths != null && comp.facts.baths != null) {
      const d = Math.abs(comp.facts.baths - subject.facts.baths);
      if (d >= 1) add(`${d} bath difference`, Math.min(12, d * 6));
    }

    // Year built mismatch.
    if (subject.facts.yearBuilt && comp.facts.yearBuilt) {
      const d = Math.abs(comp.facts.yearBuilt - subject.facts.yearBuilt);
      if (d > 30) add(`Built ${d} yrs apart (>30)`, 12);
      else if (d > 10) add(`Built ${d} yrs apart (>10)`, 6);
    }

    // Condition mismatch — renovated retail vs non-renovated subject.
    const compRank = CONDITION_RANK[comp.condition];
    if (comp.condition === 'renovated' && subjectRank < CONDITION_RANK.updated) {
      add('Renovated retail comp vs. non-renovated subject', 18);
      flags.push('renovated-retail');
    } else if (Math.abs(compRank - subjectRank) >= 2) {
      add('Condition differs materially from subject', 8);
    }

    // $/sqft outlier.
    const ppsf = ppsfOf(comp);
    if (comp.status === 'sold' && ppsf && medianPpsf) {
      const dev = Math.abs(ppsf - medianPpsf) / medianPpsf;
      if (dev > ARV_RULES.outlierPpsfDeviation) {
        add(`$/sqft is a ${Math.round(dev * 100)}% outlier vs. median`, 15);
        flags.push('outlier');
      }
    }

    const totalPenalty = penalties.reduce((s, p) => s + p.points, 0);
    const score = Math.max(0, Math.min(100, 100 - totalPenalty));

    let disposition: CompDisposition;
    if (comp.status !== 'sold') {
      disposition = score >= 45 ? 'support' : 'rejected';
    } else if (score >= 70) disposition = 'qualified';
    else if (score >= 45) disposition = 'penalized';
    else disposition = 'rejected';

    const impliedValue =
      subjectSqft && ppsf ? Math.round(ppsf * subjectSqft) : comp.price;

    const dispWord =
      disposition === 'qualified'
        ? 'Accepted as a qualified comp'
        : disposition === 'support'
          ? 'Kept as supporting context only'
          : disposition === 'penalized'
            ? 'Usable but penalized'
            : 'Rejected';
    const topReasons = penalties
      .slice()
      .sort((a, b) => b.points - a.points)
      .slice(0, 3)
      .map((p) => p.label);
    const explanation =
      `${dispWord} (score ${score}/100).` +
      (topReasons.length ? ` Main deductions: ${topReasons.join('; ')}.` : ' Strong match on the key axes.');

    return { comp, score, disposition, penalties, flags, explanation, impliedValue };
  });
}
