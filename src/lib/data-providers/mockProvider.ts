/**
 * Deterministic mock provider — lets the autopilot flow run end-to-end with
 * zero API keys. It invents NOTHING from real listing sites; every value is a
 * seeded pseudo-random simulation keyed off the normalized address, so the
 * same address always yields the same dataset (stable for tests + demos).
 *
 * This is dev/testing scaffolding. Real licensed adapters replace it behind the
 * exact same interfaces in providerTypes.ts.
 */
import type {
  Comp,
  NormalizedAddress,
  ProviderValuation,
  PropertyCondition,
  PublicRecord,
  RentEstimate,
  SubjectProperty,
} from '@/lib/types';
import type {
  ComparableSalesProvider,
  ProviderBundle,
  ProviderContext,
  PropertyDataProvider,
  PublicRecordsProvider,
  RentProvider,
  ValuationProvider,
} from './providerTypes';

/* ------------------------- seeded RNG utilities ------------------------- */

function hashSeed(str: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** mulberry32 — small, fast, deterministic PRNG. */
function makeRng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function addDays(iso: string, days: number): string {
  const d = new Date(iso);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function round(n: number, to = 1000): number {
  return Math.round(n / to) * to;
}

const CONDITIONS: PropertyCondition[] = [
  'below_average',
  'average',
  'average',
  'updated',
];

interface MockDataset {
  subject: SubjectProperty;
  publicRecord: PublicRecord;
  comps: Comp[];
  valuation: ProviderValuation;
  rent: RentEstimate;
}

/** Generate the full, self-consistent dataset for an address. Pure + seeded. */
function generate(address: NormalizedAddress, ctx: ProviderContext): MockDataset {
  const rng = makeRng(hashSeed(address.key || address.formatted || 'jarvis'));

  const sqft = 1200 + Math.floor(rng() * 1600); // 1200–2800
  const beds = 3 + Math.floor(rng() * 2); // 3–4
  const baths = 2 + (rng() > 0.5 ? 1 : 0) + (rng() > 0.6 ? 0.5 : 0); // 2–3.5
  const yearBuilt = 1955 + Math.floor(rng() * 60); // 1955–2015
  const lotSqft = sqft * 3 + Math.floor(rng() * 4000);
  const basePpsf = 170 + Math.floor(rng() * 120); // 170–290
  const subjectCondition = CONDITIONS[Math.floor(rng() * CONDITIONS.length)];
  const providerValue = round(sqft * basePpsf, 1000);

  const subject: SubjectProperty = {
    address,
    propertyType: 'single_family',
    facts: { beds, baths, sqft, lotSqft, yearBuilt, garageSpaces: rng() > 0.5 ? 2 : 1, stories: rng() > 0.6 ? 2 : 1 },
    condition: subjectCondition,
    providerValueEstimate: providerValue,
    sources: ['mock_provider'],
  };

  const lastSaleYearsAgo = 2 + Math.floor(rng() * 7);
  const assessed = round(providerValue * (0.8 + rng() * 0.15), 1000);
  const publicRecord: PublicRecord = {
    apn: `MOCK-${(hashSeed(address.key) % 900000 + 100000)}`,
    ownerName: rng() > 0.5 ? 'Current Owner (per record)' : 'Owner Of Record LLC',
    lastSaleDate: addDays(ctx.asOf, -365 * lastSaleYearsAgo),
    lastSalePrice: round(providerValue * (0.55 + rng() * 0.25), 1000),
    taxAssessedValue: assessed,
    annualTaxes: round(assessed * (0.011 + rng() * 0.014), 100),
    lotSqft,
    yearBuilt,
    source: 'mock_provider',
  };

  // 6 sold comps + 2 active listings.
  const comps: Comp[] = [];
  const total = 8;
  for (let i = 0; i < total; i++) {
    const isActive = i >= 6;
    const compSqft = Math.round(sqft * (0.8 + rng() * 0.4));
    let ppsf = basePpsf * (0.85 + rng() * 0.3);
    if (isActive) ppsf *= 1.05; // listings ask a bit high
    if (i === 2) ppsf *= 1.4; // deterministic outlier to exercise outlier logic
    const price = round(compSqft * ppsf, 1000);
    // Make a couple of sold comps fully renovated retail (penalized vs subject).
    const condition: PropertyCondition =
      i === 0 || i === 4 ? 'renovated' : CONDITIONS[Math.floor(rng() * CONDITIONS.length)];
    comps.push({
      id: `comp-${i + 1}`,
      address: {
        street: `${100 + i * 7} Comp St`,
        city: address.city,
        state: address.state,
        zip: address.zip,
      },
      facts: {
        beds: beds + (rng() > 0.7 ? 1 : 0) - (rng() > 0.8 ? 1 : 0),
        baths: Math.max(1, baths + (rng() > 0.7 ? 1 : 0) - (rng() > 0.8 ? 1 : 0)),
        sqft: compSqft,
        yearBuilt: yearBuilt + Math.floor(rng() * 30) - 15,
      },
      condition,
      price,
      status: isActive ? 'active' : 'sold',
      date: addDays(ctx.asOf, isActive ? -Math.floor(rng() * 40) : -Math.floor(rng() * 220)),
      distanceMiles: Math.round((0.1 + rng() * 1.3) * 100) / 100,
      source: 'mock_provider',
    });
  }

  const rentMonthly = round(providerValue * (0.006 + rng() * 0.003), 25);
  const rent: RentEstimate = {
    monthlyRent: rentMonthly,
    low: round(rentMonthly * 0.88, 25),
    high: round(rentMonthly * 1.12, 25),
    source: 'mock_provider',
  };

  const avm = round(providerValue * (0.95 + rng() * 0.12), 1000);
  const valuation: ProviderValuation = {
    estimate: avm,
    low: round(avm * 0.92, 1000),
    high: round(avm * 1.08, 1000),
    confidence: 0.6 + rng() * 0.25,
    source: 'mock_provider',
  };

  return { subject, publicRecord, comps, valuation, rent };
}

/* --------------------------- provider adapters -------------------------- */

const ID = 'mock';

export const mockPropertyProvider: PropertyDataProvider = {
  id: ID,
  isConfigured: () => true,
  async getProperty(address, ctx) {
    return generate(address, ctx).subject;
  },
};

export const mockComparablesProvider: ComparableSalesProvider = {
  id: ID,
  isConfigured: () => true,
  async getComparables(address, _subject, ctx) {
    return generate(address, ctx).comps;
  },
};

export const mockPublicRecordsProvider: PublicRecordsProvider = {
  id: ID,
  isConfigured: () => true,
  async getPublicRecord(address, ctx) {
    return generate(address, ctx).publicRecord;
  },
};

export const mockValuationProvider: ValuationProvider = {
  id: ID,
  isConfigured: () => true,
  async getValuation(address, _subject, ctx) {
    return generate(address, ctx).valuation;
  },
};

export const mockRentProvider: RentProvider = {
  id: ID,
  isConfigured: () => true,
  async getRent(address, _subject, ctx) {
    return generate(address, ctx).rent;
  },
};

export function createMockBundle(): ProviderBundle {
  return {
    property: mockPropertyProvider,
    comparables: mockComparablesProvider,
    publicRecords: mockPublicRecordsProvider,
    valuation: mockValuationProvider,
    rent: mockRentProvider,
    usesMock: true,
  };
}

/** Exposed for tests / debugging. */
export const _generateMockDataset = generate;
