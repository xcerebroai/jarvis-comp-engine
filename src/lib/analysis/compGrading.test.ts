/**
 * Pins the comp-grading thresholds to the product spec and the ARV engine's
 * recorded-price (non-disclosure) layer to per-comp sale_type evidence.
 */
import { describe, expect, it } from 'vitest';
import { gradeComps } from './compGradingEngine';
import { computeArv } from './conservativeArvEngine';
import { isRecordedSale } from './saleRecording';
import { normalizeAddress } from '@/lib/data-providers/addressNormalizer';
import type { Comp, SubjectProperty } from '@/lib/types';

const asOf = '2026-07-08T00:00:00.000Z';

const subject: SubjectProperty = {
  address: normalizeAddress({ fullAddress: '1 Subject St, Austin, TX 78701' }),
  propertyType: 'single_family',
  facts: { beds: 3, baths: 2, sqft: 1500, yearBuilt: 1990 },
  condition: 'average',
  sources: ['dealmachine'],
};

/** A comp that matches the subject perfectly — zero penalties expected. */
function cleanComp(over: Partial<Comp> = {}): Comp {
  return {
    id: over.id ?? `c-${Math.abs(JSON.stringify(over).length)}`,
    address: { street: 'X St', city: 'Austin', state: 'TX', zip: '78701' },
    facts: { beds: 3, baths: 2, sqft: 1500, yearBuilt: 1990 },
    condition: 'average',
    price: 300000,
    status: 'sold',
    date: '2026-06-20', // 18 days before asOf
    distanceMiles: 0.2,
    source: 'dealmachine',
    ...over,
  };
}

function penaltyLabels(comp: Comp): string[] {
  const [graded] = gradeComps(subject, [comp, cleanComp({ id: 'peer' })], { asOf });
  return graded.penalties.map((p) => p.label);
}

describe('comp grading thresholds (exact spec)', () => {
  it('a clean, close, recent twin takes no penalties', () => {
    expect(penaltyLabels(cleanComp())).toEqual([]);
  });

  it('distance: >0.5mi penalized, >1mi penalized harder', () => {
    expect(penaltyLabels(cleanComp({ distanceMiles: 0.5 }))).toEqual([]);
    expect(penaltyLabels(cleanComp({ distanceMiles: 0.6 })).join()).toMatch(/>0\.5 mi/);
    expect(penaltyLabels(cleanComp({ distanceMiles: 1.2 })).join()).toMatch(/>1 mi/);
  });

  it('recency: >90d penalized, >180d penalized harder', () => {
    expect(penaltyLabels(cleanComp({ date: '2026-05-01' }))).toEqual([]); // 68d
    expect(penaltyLabels(cleanComp({ date: '2026-03-01' })).join()).toMatch(/91–180d/); // 129d
    expect(penaltyLabels(cleanComp({ date: '2025-11-01' })).join()).toMatch(/>180d/); // 249d
  });

  it('sqft: >15% penalized, >25% penalized harder', () => {
    expect(penaltyLabels(cleanComp({ facts: { ...cleanComp().facts, sqft: 1700 } }))).toEqual([]); // 13%
    expect(penaltyLabels(cleanComp({ facts: { ...cleanComp().facts, sqft: 1800 } })).join()).toMatch(/>15%/); // 20%
    expect(penaltyLabels(cleanComp({ facts: { ...cleanComp().facts, sqft: 2000 } })).join()).toMatch(/>25%/); // 33%
  });

  it('bed/bath mismatch and year-built gap are penalized with reasons', () => {
    expect(penaltyLabels(cleanComp({ facts: { ...cleanComp().facts, beds: 5 } })).join()).toMatch(/bed difference/);
    expect(penaltyLabels(cleanComp({ facts: { ...cleanComp().facts, baths: 4 } })).join()).toMatch(/bath difference/);
    expect(penaltyLabels(cleanComp({ facts: { ...cleanComp().facts, yearBuilt: 1950 } })).join()).toMatch(/yrs apart/);
  });

  it('active listings are penalized hard and never qualify — support at best', () => {
    const [graded] = gradeComps(subject, [cleanComp({ status: 'active' }), cleanComp({ id: 'p2' })], { asOf });
    expect(graded.penalties.join, '').toBeTruthy();
    expect(graded.penalties.map((p) => p.label).join()).toMatch(/Active listing/);
    expect(['support', 'rejected']).toContain(graded.disposition);
  });
});

describe('isRecordedSale (per-comp deed evidence, not a state rule)', () => {
  it('accepts recorder full-amount language', () => {
    expect(isRecordedSale('Full amount stated on Document.')).toBe(true);
  });
  it('rejects modeled/estimated/non-disclosure language and absence', () => {
    expect(isRecordedSale('Estimated from model')).toBe(false);
    expect(isRecordedSale('Non-disclosure state')).toBe(false);
    expect(isRecordedSale(undefined)).toBe(false);
  });
});

describe('ARV recorded-price confidence layer', () => {
  const recorded = { saleType: 'Full amount stated on Document.' };
  const modeled = { saleType: 'Estimated (modeled)' };

  function arvFor(saleTypes: (typeof recorded | typeof modeled)[]) {
    const comps = saleTypes.map((s, i) =>
      cleanComp({ id: `c${i}`, ...s, price: 300000 + i * 5000 }),
    );
    const graded = gradeComps(subject, comps, { asOf });
    return computeArv(subject, graded, {});
  }

  it('counts recorded qualified comps and stays quiet when all are recorded', () => {
    const arv = arvFor([recorded, recorded, recorded]);
    expect(arv.recordedQualifiedCount).toBe(3);
    expect(arv.warnings.join(' ')).not.toMatch(/non-disclosure/i);
  });

  it('warns and docks confidence when some prices are modeled', () => {
    const arv = arvFor([recorded, modeled, recorded]);
    expect(arv.recordedQualifiedCount).toBe(2);
    expect(arv.warnings.join(' ')).toMatch(/lack a recorded sale price/i);
  });

  it('caps confidence low when NO qualified comp is recorded (TX-style)', () => {
    const arv = arvFor([modeled, modeled, modeled]);
    expect(arv.recordedQualifiedCount).toBe(0);
    expect(arv.confidence).toBeLessThanOrEqual(45);
    expect(arv.warnings.join(' ')).toMatch(/non-disclosure states \(e\.g\. Texas\)/i);
  });

  it('skips the layer entirely when comps carry no recorder metadata (manual/mock)', () => {
    const comps = [cleanComp({ id: 'a' }), cleanComp({ id: 'b' })]; // no saleType at all
    const graded = gradeComps(subject, comps, { asOf });
    const arv = computeArv(subject, graded, {});
    expect(arv.recordedQualifiedCount).toBeUndefined();
    expect(arv.warnings.join(' ')).not.toMatch(/non-disclosure/i);
  });

  it('flags when our conservative ARV lands above the provider estimate', () => {
    const graded = gradeComps(subject, [cleanComp({ ...recorded, id: 'a' }), cleanComp({ ...recorded, id: 'b' })], { asOf });
    const arv = computeArv(subject, graded, {
      valuation: { estimate: 150000, low: 140000, high: 160000, confidence: 0.5, source: 'dealmachine' },
    });
    expect(arv.warnings.join(' ')).toMatch(/lands ABOVE the provider/i);
  });
});
