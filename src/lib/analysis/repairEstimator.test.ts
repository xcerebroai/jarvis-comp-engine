import { describe, expect, it } from 'vitest';
import { estimateRepairs } from './repairEstimator';

describe('estimateRepairs', () => {
  it('scales the recommended budget with rehab level', () => {
    const cosmetic = estimateRepairs({ rehabLevel: 'cosmetic' }, 1500);
    const fullGut = estimateRepairs({ rehabLevel: 'full_gut' }, 1500);
    expect(fullGut.recommended).toBeGreaterThan(cosmetic.recommended * 3);
  });

  it('keeps recommended between low and high, and includes contingency', () => {
    const r = estimateRepairs({ rehabLevel: 'medium' }, 1800);
    expect(r.low).toBeLessThanOrEqual(r.recommended);
    expect(r.recommended).toBeLessThanOrEqual(r.high);
  });

  it('never estimates below itemized evidence (uses the higher of itemized vs baseline)', () => {
    const withBigItem = estimateRepairs(
      { rehabLevel: 'cosmetic', categories: { foundation: 'full_replacement' } },
      1500,
    );
    const cosmeticOnly = estimateRepairs({ rehabLevel: 'cosmetic' }, 1500);
    expect(withBigItem.recommended).toBeGreaterThan(cosmeticOnly.recommended);
  });

  it('lowers confidence and widens range when categories are unknown', () => {
    const vague = estimateRepairs(
      { rehabLevel: 'heavy', categories: { roof: 'unknown', foundation: 'unknown' } },
      1500,
    );
    const clear = estimateRepairs(
      { rehabLevel: 'heavy', categories: { roof: 'minor', foundation: 'minor' }, repairNotes: 'inspected, minor only' },
      1500,
    );
    expect(vague.confidence).toBeLessThan(clear.confidence);
    expect(vague.unknownCategories).toContain('roof');
  });

  it('warns that ARV depends on renovation quality for a full gut', () => {
    const r = estimateRepairs({ rehabLevel: 'full_gut' }, 1500);
    expect(r.warnings.join(' ')).toMatch(/renovation quality/i);
  });
});
