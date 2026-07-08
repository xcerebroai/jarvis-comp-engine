import type { Estimate } from './property';

/** The four exit strategies Jarvis evaluates for every deal. */
export type OfferStrategy =
  | 'wholesale'
  | 'fix_and_flip'
  | 'creative_finance'
  | 'subject_to';

/** A recommended offer for a single strategy, with the reasoning behind it. */
export interface OfferRecommendation {
  strategy: OfferStrategy;
  /** Recommended maximum offer price. */
  maxOffer: number;
  /** Human-readable breakdown of how maxOffer was derived. */
  rationale: string[];
  /** Estimated profit / spread for this strategy. */
  projectedProfit?: number;
  /** 0–1 confidence the deal works under this strategy. */
  confidence: number;
  /** Fails hard rules (e.g. negative spread) — surface as a warning. */
  warnings: string[];
}

/** Everything the offer engine needs to produce recommendations. */
export interface DealInputs {
  arv: Estimate;
  repairEstimate: Estimate;
  /** Optional overrides for the default rule set in src/config. */
  ruleOverrides?: Partial<OfferRules>;
}

/** Tunable knobs for offer math. Defaults live in src/config/offerRules.ts. */
export interface OfferRules {
  /** Max Allowable Offer as % of ARV for flips (e.g. 0.70). */
  flipArvPercent: number;
  /** Wholesale assignment fee target (dollars). */
  wholesaleFee: number;
  /** Flat holding + closing cost assumption (dollars). */
  transactionCosts: number;
  /** Minimum acceptable flip profit (dollars). */
  minFlipProfit: number;
}
