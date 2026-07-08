import type { OfferRules } from '@/lib/types';

/**
 * Default, intentionally CONSERVATIVE offer rules.
 *
 * Jarvis biases toward protecting the buyer: lower ARV %, healthy cost
 * padding, and a real minimum profit floor. Tune per-market here, or
 * override per-deal via DealInputs.ruleOverrides.
 */
export const DEFAULT_OFFER_RULES: OfferRules = {
  flipArvPercent: 0.7, // classic 70% rule as a conservative starting point
  wholesaleFee: 10_000,
  transactionCosts: 15_000,
  minFlipProfit: 25_000,
};

/**
 * Safety margin applied to ARV before any offer math, so a single
 * optimistic comp can't inflate the whole deal. 0.95 = shave 5%.
 */
export const ARV_SAFETY_MARGIN = 0.95;
