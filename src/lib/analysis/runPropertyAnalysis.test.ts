import { describe, expect, it } from 'vitest';
import { runPropertyAnalysis } from './runPropertyAnalysis';
import type { AnalysisInput } from '@/lib/types';

// These run against the default mock provider (JARVIS_USE_MOCK_PROVIDER unset).
const asOf = '2026-07-08T00:00:00.000Z';

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
