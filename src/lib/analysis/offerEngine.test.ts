import { describe, expect, it } from 'vitest';
import { computeOffers } from './offerEngine';
import type { ArvResult, RepairEstimate } from '@/lib/types';

const arv: ArvResult = {
  low: 380000,
  median: 400000,
  high: 420000,
  conservative: 390000,
  confidence: 70,
  qualifiedCompCount: 5,
  usedCompCount: 6,
  explanation: 'test',
  warnings: [],
};

const repairs: RepairEstimate = {
  rehabLevel: 'medium',
  low: 40000,
  high: 70000,
  recommended: 55000,
  confidence: 60,
  lineItems: [],
  unknownCategories: [],
  assumptions: [],
  warnings: [],
};

describe('computeOffers', () => {
  it('marks subject-to non-viable and unpriced without a loan balance', () => {
    const offers = computeOffers({ arv, repairEstimate: repairs });
    expect(offers.subject_to.viable).toBe(false);
    expect(offers.subject_to.maxOffer).toBeNull();
    expect(offers.subject_to.redFlags.join(' ')).toMatch(/loan/i);
  });

  it('flags that creative finance needs more info when no seller terms are given', () => {
    const offers = computeOffers({ arv, repairEstimate: repairs });
    expect(offers.creative_finance.redFlags.join(' ')).toMatch(/seller.?s? terms/i);
  });

  it('does not raise the missing-terms flag once seller terms are provided', () => {
    const offers = computeOffers({
      arv,
      repairEstimate: repairs,
      sellerInfo: { askingPrice: 300000, interestRate: 5 },
    });
    expect(offers.creative_finance.redFlags.join(' ')).not.toMatch(/no seller terms/i);
  });
});
