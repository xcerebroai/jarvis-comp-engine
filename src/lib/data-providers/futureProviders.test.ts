import { afterEach, describe, expect, it } from 'vitest';
import { futureAttomProvider } from './propertyDataProvider';
import { futureMlsResoProvider } from './comparableSalesProvider';
import { futureRentProvider } from './rentProvider';
import { futureCountyRecordsProvider } from './publicRecordsProvider';
import { futureValuationProvider } from './valuationProvider';
import type { NormalizedAddress } from '@/lib/types';
import type { ProviderContext } from './providerTypes';

const ADDR = { formatted: '1 Test St', key: '1-test-st' } as NormalizedAddress;
const CTX: ProviderContext = { asOf: '2026-07-08T00:00:00.000Z' };

const ENV_KEYS = [
  'ATTOM_API_KEY',
  'MLS_API_KEY',
  'RENT_PROVIDER_API_KEY',
  'COUNTY_PROVIDER_API_KEY',
  'ATTOM_BASE_URL',
  'MLS_BASE_URL',
  'RENT_PROVIDER_BASE_URL',
  'COUNTY_PROVIDER_BASE_URL',
];
const snapshot = Object.fromEntries(ENV_KEYS.map((k) => [k, process.env[k]]));

afterEach(() => {
  for (const k of ENV_KEYS) {
    if (snapshot[k] === undefined) delete process.env[k];
    else process.env[k] = snapshot[k] as string;
  }
});

function clearEnv() {
  for (const k of ENV_KEYS) delete process.env[k];
}

describe('future provider stubs', () => {
  it('report not configured when their key is absent', () => {
    clearEnv();
    expect(futureAttomProvider.isConfigured()).toBe(false);
    expect(futureMlsResoProvider.isConfigured()).toBe(false);
    expect(futureRentProvider.isConfigured()).toBe(false);
    expect(futureCountyRecordsProvider.isConfigured()).toBe(false);
    expect(futureValuationProvider.isConfigured()).toBe(false);
  });

  it('report configured once their key is present', () => {
    clearEnv();
    process.env.ATTOM_API_KEY = 'x';
    process.env.MLS_API_KEY = 'x';
    process.env.RENT_PROVIDER_API_KEY = 'x';
    process.env.COUNTY_PROVIDER_API_KEY = 'x';
    expect(futureAttomProvider.isConfigured()).toBe(true);
    expect(futureMlsResoProvider.isConfigured()).toBe(true);
    expect(futureRentProvider.isConfigured()).toBe(true);
    expect(futureCountyRecordsProvider.isConfigured()).toBe(true);
    expect(futureValuationProvider.isConfigured()).toBe(true); // shares ATTOM key
  });

  it('throw a clean not-configured error when called without keys (no network call)', async () => {
    clearEnv();
    await expect(futureAttomProvider.getPropertyByAddress(ADDR, CTX)).rejects.toThrow(/not configured/i);
    await expect(futureMlsResoProvider.getComparableSales(ADDR, {} as never, CTX)).rejects.toThrow(/not configured/i);
    await expect(futureRentProvider.getRentEstimate(ADDR, {} as never, CTX)).rejects.toThrow(/not configured/i);
    await expect(futureCountyRecordsProvider.getPublicRecord(ADDR, CTX)).rejects.toThrow(/not configured/i);
    await expect(futureValuationProvider.getExternalValuations(ADDR, {} as never, CTX)).rejects.toThrow(/not configured/i);
  });

  it('refuse to call an unknown endpoint when a key is set but no base URL is', async () => {
    clearEnv();
    process.env.ATTOM_API_KEY = 'x';
    await expect(futureAttomProvider.getPropertyByAddress(ADDR, CTX)).rejects.toThrow(/base_url|refusing/i);
  });
});
