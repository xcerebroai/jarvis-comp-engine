import type { DealInputs, OfferRecommendation, OfferStrategy } from '@/lib/types';
import { DEFAULT_OFFER_RULES } from '@/config/offerRules';

const STRATEGIES: OfferStrategy[] = [
  'wholesale',
  'fix_and_flip',
  'creative_finance',
  'subject_to',
];

/**
 * Produce a conservative max-offer recommendation for each strategy.
 *
 * Each strategy has its own math (to implement):
 *  - fix_and_flip:      ARV * flipArvPercent - repairs - costs - minProfit
 *  - wholesale:         flip MAO - wholesaleFee (leaves room for an end buyer)
 *  - creative_finance:  terms-based; price can be higher when financing is cheap
 *  - subject_to:        existing-loan aware; equity + arrears drive the number
 *
 * Pure function — no I/O, fully unit-testable.
 */
export function recommendOffers(inputs: DealInputs): OfferRecommendation[] {
  const rules = { ...DEFAULT_OFFER_RULES, ...inputs.ruleOverrides };
  // TODO: implement per-strategy math using `rules`, `inputs.arv`,
  // and `inputs.repairEstimate`.
  void rules;
  return STRATEGIES.map((strategy) => ({
    strategy,
    maxOffer: 0,
    rationale: ['offer math not yet implemented'],
    confidence: 0,
    warnings: [],
  }));
}
