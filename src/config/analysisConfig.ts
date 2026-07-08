/**
 * Central, intentionally CONSERVATIVE tuning for the whole analysis pipeline.
 * Every magic number the engines use lives here so markets can be re-tuned in
 * one place without touching logic. Defaults bias toward protecting the buyer.
 */
import type { RehabLevel, RepairCategory, RepairLevel } from '@/lib/types';

/* --------------------------- Provider config ---------------------------- */

/**
 * DealMachine comps request tuning. Radius/timeframe kept tight so comps stay
 * genuinely comparable; widen deliberately per market, never silently.
 */
export const DEALMACHINE_RULES = {
  radiusMiles: 1,
  timeframe: '12months',
  sortBy: 'match',
  limit: 25,
} as const;

/* ---------------------------- Repair costs ------------------------------ */

export type RepairCostSpec =
  | { type: 'flat'; minor: number; moderate: number; major: number; full: number }
  | { type: 'per_sqft'; minor: number; moderate: number; major: number; full: number };

/**
 * Rough, conservative national ballpark costs. Flat = whole-house project;
 * per_sqft = multiplied by subject sqft. Tune per market.
 */
export const REPAIR_COST_TABLE: Record<RepairCategory, RepairCostSpec> = {
  roof: { type: 'flat', minor: 1500, moderate: 6000, major: 11000, full: 16000 },
  hvac: { type: 'flat', minor: 800, moderate: 4000, major: 7000, full: 9500 },
  foundation: { type: 'flat', minor: 2500, moderate: 9000, major: 20000, full: 35000 },
  electrical: { type: 'flat', minor: 1000, moderate: 4500, major: 9000, full: 13000 },
  plumbing: { type: 'flat', minor: 1000, moderate: 4500, major: 9000, full: 13000 },
  flooring: { type: 'per_sqft', minor: 1.5, moderate: 3.5, major: 5, full: 7.5 },
  paint: { type: 'per_sqft', minor: 1, moderate: 2, major: 3, full: 4 },
  drywall: { type: 'per_sqft', minor: 1, moderate: 2.5, major: 4.5, full: 6.5 },
  kitchen: { type: 'flat', minor: 3000, moderate: 9000, major: 20000, full: 32000 },
  bathrooms: { type: 'flat', minor: 1800, moderate: 5500, major: 11000, full: 16000 },
  windows: { type: 'flat', minor: 1000, moderate: 4500, major: 9000, full: 13000 },
  exterior: { type: 'flat', minor: 1500, moderate: 5500, major: 11000, full: 18000 },
  landscaping: { type: 'flat', minor: 500, moderate: 2000, major: 5000, full: 9000 },
  trashOut: { type: 'flat', minor: 500, moderate: 1500, major: 3500, full: 6000 },
  permits: { type: 'flat', minor: 500, moderate: 1500, major: 3500, full: 6000 },
  // Contingency is handled as a % of subtotal, not from this table.
  contingency: { type: 'flat', minor: 0, moderate: 0, major: 0, full: 0 },
};

/** Map a RepairLevel onto the cost-table keys. `unknown` → conservative moderate. */
export const LEVEL_TO_COST_KEY: Record<
  RepairLevel,
  'minor' | 'moderate' | 'major' | 'full' | null
> = {
  not_needed: null,
  unknown: 'moderate',
  minor: 'minor',
  moderate: 'moderate',
  major: 'major',
  full_replacement: 'full',
};

/** Fallback whole-house rehab cost per sqft, by headline rehab level. */
export const REHAB_LEVEL_PER_SQFT: Record<RehabLevel, number> = {
  cosmetic: 15,
  light: 30,
  medium: 50,
  heavy: 78,
  full_gut: 110,
};

/** Extra risk buffer (% of ARV) added to offers as rehab scope grows. */
export const REHAB_RISK_BUFFER_PCT: Record<RehabLevel, number> = {
  cosmetic: 0.03,
  light: 0.04,
  medium: 0.05,
  heavy: 0.07,
  full_gut: 0.1,
};

/** Contingency as % of repair subtotal, by rehab level (vaguer → more). */
export const REHAB_CONTINGENCY_PCT: Record<RehabLevel, number> = {
  cosmetic: 0.08,
  light: 0.1,
  medium: 0.12,
  heavy: 0.15,
  full_gut: 0.18,
};

/* ----------------------------- Offer rules ------------------------------ */

export const OFFER_RULES = {
  /** Holding costs as % of ARV (taxes, insurance, utilities, loan carry). */
  holdingPct: 0.03,
  /** Buy-side closing costs as % of ARV. */
  purchaseClosingPct: 0.02,
  /** Sell-side costs as % of ARV (agent + closing + concessions). */
  sellingPct: 0.07,
  /** Desired flip profit as % of ARV. */
  desiredProfitPct: 0.15,
  /** Extra cushion between max and "safer" offer, as % of ARV. */
  saferCushionPct: 0.03,
  /** Wholesale assignment fee target (dollars). */
  wholesaleAssignmentFee: 15000,
  /** Estimated fixed closing/transaction cash for subject-to takeovers. */
  subjectToClosingCash: 2500,
  /** Monthly reserves as % of rent for hold-strategy cash flow. */
  reservesPctOfRent: 0.12,
  /** Creative-finance default down payment as % of price. */
  creativeDownPct: 0.1,
  /** Creative-finance target interest rate (cap we solve toward). */
  creativeTargetRate: 0.05,
  /** Creative-finance amortization term (months). */
  creativeTermMonths: 360,
  /** Rough annual taxes+insurance as % of price for cash-flow math. */
  taxInsPctOfPrice: 0.018,
} as const;

/* ------------------------------ ARV rules ------------------------------- */

export const ARV_RULES = {
  /** Baseline safety shave applied to the comp-derived value. */
  safetyMargin: 0.96,
  /** Minimum qualified sold comps before confidence is considered solid. */
  minQualifiedSoldComps: 3,
  /** A comp's $/sqft beyond this deviation from median is flagged an outlier. */
  outlierPpsfDeviation: 0.35,
} as const;
