import { describe, expect, it } from 'vitest';
import { runPropertyAnalysis } from './runPropertyAnalysis';
import { createMockBundle } from '@/lib/data-providers/mockProvider';
import type {
  ComparableSalesProvider,
  ProviderBundle,
  ProviderContext,
  RentProvider,
} from '@/lib/data-providers/providerTypes';
import type { AnalysisInput, CompInput } from '@/lib/types';

// These run against the default mock provider (JARVIS_USE_MOCK_PROVIDER unset).
const asOf = '2026-07-08T00:00:00.000Z';

const inertComps: ComparableSalesProvider = {
  id: 'test-inert',
  isConfigured: () => false,
  async getComparableSales(_a, _s, ctx: ProviderContext) {
    return {
      providerName: 'none',
      sourceType: 'comps',
      isMock: false,
      fetchedAt: ctx.asOf,
      confidence: 'low',
      data: [],
      warnings: ['no comps provider'],
    };
  },
};

const inertRent: RentProvider = {
  id: 'test-inert',
  isConfigured: () => false,
  async getRentEstimate(_a, _s, ctx: ProviderContext) {
    return {
      providerName: 'none',
      sourceType: 'rent',
      isMock: false,
      fetchedAt: ctx.asOf,
      confidence: 'low',
      data: null,
      warnings: [],
    };
  },
};

const withMock = (over: Partial<ProviderBundle>): ProviderBundle => ({ ...createMockBundle(), ...over });

const manualSold: CompInput[] = [
  { address: '1 Comp St', soldPrice: 300000, soldDate: '2026-05-01', sqft: 1500, status: 'sold' },
  { address: '2 Comp St', soldPrice: 315000, soldDate: '2026-04-15', sqft: 1600, status: 'sold' },
  { address: '3 Comp St', soldPrice: 290000, soldDate: '2026-03-20', sqft: 1450, status: 'sold' },
];

describe('runPropertyAnalysis (mock mode)', () => {
  it('surfaces the mock-data warning across result, memo, and confidence', async () => {
    const result = await runPropertyAnalysis(
      { address: { fullAddress: '123 Main St, Austin, TX 78701' }, repairs: { rehabLevel: 'medium' } },
      { asOf },
    );
    expect(result.usedMockProvider).toBe(true);
    expect(result.providerStatus.mockProviderEnabled).toBe(true);
    expect(result.warnings.join(' ')).toMatch(/mock/i);
    expect(result.memo.plainText).toMatch(/testing only/i);
    expect(result.confidence.summary).toMatch(/testing only/i);
  });

  it('produces a source audit that is all-mock, and a memo Data Sources section', async () => {
    const result = await runPropertyAnalysis(
      { address: { fullAddress: '123 Main St, Austin, TX 78701' }, repairs: { rehabLevel: 'medium' } },
      { asOf },
    );
    expect(result.sourceAudit.length).toBeGreaterThan(0);
    expect(result.sourceAudit.every((a) => a.mock)).toBe(true);
    expect(result.sourceAudit.map((a) => a.sourceType)).toContain('property');
    expect(result.sourceAudit.map((a) => a.sourceType)).toContain('comps');
    expect(result.memo.sections.some((s) => s.title === 'Data Sources Used')).toBe(true);
    expect(result.memo.sections.some((s) => s.title === 'Qualified Comps')).toBe(true);
    expect(result.memo.sections.some((s) => s.title === 'Rejected Comps')).toBe(true);
  });

  it('keeps subject-to non-viable when no loan data is provided', async () => {
    const result = await runPropertyAnalysis(
      { address: { fullAddress: '55 Oak Ave, Dallas, TX 75201' }, repairs: { rehabLevel: 'light' } },
      { asOf },
    );
    expect(result.offers.subject_to.viable).toBe(false);
  });

  it('is deterministic for the same address (seeded mock)', async () => {
    const input: AnalysisInput = { address: { fullAddress: '9 Repeat Rd, Austin, TX 78701' }, repairs: { rehabLevel: 'medium' } };
    const a = await runPropertyAnalysis(input, { asOf });
    const b = await runPropertyAnalysis(input, { asOf });
    expect(a.arv.conservative).toBe(b.arv.conservative);
  });
});

describe('runPropertyAnalysis (real-provider readiness)', () => {
  const input: AnalysisInput = {
    address: { fullAddress: '10 Ready St, Austin, TX 78701' },
    repairs: { rehabLevel: 'medium' },
  };

  it('continues with a warning when the rent provider is missing', async () => {
    const result = await runPropertyAnalysis(input, {
      asOf,
      providers: withMock({ rent: inertRent }),
    });
    expect(result.warnings.join(' ')).toMatch(/no rent estimate/i);
    // Hold strategies still produced, just lower confidence.
    expect(result.offers.subject_to).toBeTruthy();
    expect(result.offers.creative_finance).toBeTruthy();
  });

  it('fails cleanly when there are no comps and no manual comps', async () => {
    await expect(
      runPropertyAnalysis(input, { asOf, providers: withMock({ comparables: inertComps }) }),
    ).rejects.toThrow(/insufficient comparable data/i);
  });

  it('flows manual comps through the grading engine when no provider comps exist', async () => {
    const result = await runPropertyAnalysis(
      { ...input, manualComps: manualSold },
      { asOf, providers: withMock({ comparables: inertComps }) },
    );
    expect(result.comps.length).toBeGreaterThanOrEqual(3);
    expect(result.comps.some((g) => g.comp.source === 'manual_comp')).toBe(true);
    expect(result.arv.conservative).toBeGreaterThan(0);
  });

  it('drops manual comps without a sold price and warns', async () => {
    const result = await runPropertyAnalysis(
      { ...input, manualComps: [...manualSold, { address: 'No price St' }] },
      { asOf, providers: withMock({ comparables: inertComps }) },
    );
    expect(result.warnings.join(' ')).toMatch(/manual comp/i);
  });
});
