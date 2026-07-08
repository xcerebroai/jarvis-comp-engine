import { afterEach, describe, expect, it } from 'vitest';
import {
  computeProviderStatus,
  NO_PROVIDER_MESSAGE,
  type ProviderEnv,
} from './providerStatus';
import { mergeCatalog } from './providerCatalog';
import { resolveProviders } from './index';

describe('computeProviderStatus', () => {
  it('flags no real providers configured when no keys are set', () => {
    const status = computeProviderStatus({ isPagesDemo: false });
    expect(status.realProvidersConfigured).toBe(false);
    expect(status.mockProviderEnabled).toBe(false);
    expect(status.globalWarnings).toContain(NO_PROVIDER_MESSAGE);
  });

  it('activates DealMachine slots (property/comps/county/valuation) from one key', () => {
    const env: ProviderEnv = { isPagesDemo: false, dealMachineApiKey: 'dm_sk_test_x' };
    const status = computeProviderStatus(env);
    expect(status.realProvidersConfigured).toBe(true);
    for (const type of ['property', 'comps', 'county', 'valuation'] as const) {
      const slot = status.providers.find((p) => p.type === type);
      expect(slot?.configured, type).toBe(true);
      expect(slot?.active, type).toBe(true);
    }
    // Rent stays unconfigured without its own key.
    expect(status.providers.find((p) => p.type === 'rent')?.configured).toBe(false);
  });

  it('marks providers inactive and adds the demo warning in the Pages demo build', () => {
    const status = computeProviderStatus({ isPagesDemo: true, dealMachineApiKey: 'dm_sk_test_x' });
    expect(status.mockProviderEnabled).toBe(true);
    expect(status.providers.some((p) => p.type === 'mock' && p.active)).toBe(true);
    expect(status.providers.filter((p) => p.type !== 'mock').every((p) => !p.active)).toBe(true);
    expect(status.globalWarnings.join(' ')).toMatch(/static public demo/i);
  });
});

describe('provider catalog cards (settings shape)', () => {
  it('produces one card per slot with the required settings fields', () => {
    const cards = mergeCatalog(computeProviderStatus({ isPagesDemo: false, dealMachineApiKey: 'x' }));
    expect(cards.map((c) => c.type)).toEqual(['property', 'comps', 'county', 'valuation', 'rent']);
    for (const c of cards) {
      expect(typeof c.name).toBe('string');
      expect(Array.isArray(c.requiredEnv)).toBe(true);
      expect(Array.isArray(c.supplies)).toBe(true);
      expect(typeof c.configured).toBe('boolean');
      expect(typeof c.active).toBe('boolean');
    }
    expect(cards.find((c) => c.type === 'comps')?.active).toBe(true);
    expect(cards.find((c) => c.type === 'rent')?.active).toBe(false);
  });
});

describe('resolveProviders (env-driven, no mock path)', () => {
  const KEYS = ['DEALMACHINE_API_KEY', 'RENT_PROVIDER_API_KEY', 'NEXT_PUBLIC_GITHUB_PAGES'];
  const snapshot = Object.fromEntries(KEYS.map((k) => [k, process.env[k]]));

  afterEach(() => {
    for (const k of KEYS) {
      if (snapshot[k] === undefined) delete process.env[k];
      else process.env[k] = snapshot[k] as string;
    }
  });

  it('throws the clean no-provider error when nothing is configured', () => {
    for (const k of KEYS) delete process.env[k];
    expect(() => resolveProviders()).toThrow(NO_PROVIDER_MESSAGE);
  });

  it('returns DealMachine providers (never mock) when the key is set', () => {
    for (const k of KEYS) delete process.env[k];
    process.env.DEALMACHINE_API_KEY = 'dm_sk_test_x';
    const bundle = resolveProviders();
    expect(bundle.usesMock).toBe(false);
    expect(bundle.property.id).toBe('dealmachine');
    expect(bundle.comparables.id).toBe('dealmachine');
    expect(bundle.publicRecords.id).toBe('dealmachine');
    expect(bundle.valuation.id).toBe('dealmachine');
    // Rent has no provider — inert, not mock.
    expect(bundle.rent.id).not.toBe('mock');
  });
});
