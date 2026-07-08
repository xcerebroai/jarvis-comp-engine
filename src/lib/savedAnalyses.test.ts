import { describe, expect, it } from 'vitest';
import { runPropertyAnalysis } from './analysis/runPropertyAnalysis';
import { createMockBundle } from './data-providers/mockProvider';
import {
  deserializeSaved,
  serializeSaved,
  summarizeResult,
  type SavedAnalysis,
} from './savedAnalyses';

const asOf = '2026-07-08T00:00:00.000Z';

describe('savedAnalyses serialization', () => {
  it('summarizes a result into the compact card shape', async () => {
    const result = await runPropertyAnalysis(
      { address: { fullAddress: '1 Test St, Dallas, TX 75201' }, repairs: { rehabLevel: 'light' } },
      { asOf, providers: createMockBundle() },
    );
    const summary = summarizeResult(result, 'abc', asOf);
    expect(summary.id).toBe('abc');
    expect(summary.address).toBe(result.address.formatted);
    expect(summary.conservativeArv).toBe(result.arv.conservative);
    expect(summary.repairEstimate).toBe(result.repairEstimate.recommended);
    expect(summary.recommendedStrategy).toBe(result.recommendation.strategy);
    expect(summary.usedMockProvider).toBe(true);
  });

  it('round-trips through serialize/deserialize', async () => {
    const result = await runPropertyAnalysis(
      { address: { fullAddress: '1 Test St, Dallas, TX 75201' }, repairs: { rehabLevel: 'light' } },
      { asOf, providers: createMockBundle() },
    );
    const items: SavedAnalysis[] = [{ summary: summarizeResult(result, 'abc', asOf), result }];
    const round = deserializeSaved(serializeSaved(items));
    expect(round).toHaveLength(1);
    expect(round[0].summary.conservativeArv).toBe(result.arv.conservative);
    expect(round[0].result.address.formatted).toBe(result.address.formatted);
  });

  it('returns an empty list for null or corrupt storage', () => {
    expect(deserializeSaved(null)).toEqual([]);
    expect(deserializeSaved('not json{')).toEqual([]);
    expect(deserializeSaved(JSON.stringify([{ nope: true }]))).toEqual([]);
  });
});
