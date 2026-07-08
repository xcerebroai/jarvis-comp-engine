import { afterEach, describe, expect, it } from 'vitest';
import {
  computeProviderStatus,
  NO_PROVIDER_MESSAGE,
  type ProviderEnv,
} from './providerStatus';
import { mergeCatalog } from './providerCatalog';
import { resolveProviders } from './index';

describe('computeProviderStatus', () => {
  it('reports mock mode: mock active, real slots inactive, loud global warning', () => {
    const status = computeProviderStatus({ useMock: true });
    expect(status.mockProviderEnabled).toBe(true);
    expect(status.providers.some((p) => p.type === 'mock' && p.active)).toBe(true);
    expect(status.providers.filter((p) => p.type !== 'mock').every((p) => !p.active)).toBe(true);
    expect(status.globalWarnings.join(' ')).toMatch(/mock data mode is on/i);
  });

  it('flags no real providers configured when mock is off and no keys are set', () => {
    const status = computeProviderStatus({ useMock: false });
    expect(status.realProvidersConfigured).toBe(false);
    expect(status.globalWarnings).toContain(NO_PROVIDER_MESSAGE);
  });

  it('activates a configured real provider and shares the ATTOM key across property + valuation', () => {
    const env: ProviderEnv = { useMock: false, attomApiKey: 'attom-123' };
    const status = computeProviderStatus(env);
    expect(status.realProvidersConfigured).toBe(true);
    const property = status.providers.find((p) => p.type === 'property');
    const valuation = status.providers.find((p) => p.type === 'valuation');
    expect(property?.active).toBe(true);
    expect(valuation?.active).toBe(true);
    // Comps not configured → inactive.
    expect(status.providers.find((p) => p.type === 'comps')?.active).toBe(false);
  });
});

describe('provider catalog cards (settings shape)', () => {
  it('produces one card per slot with the required settings fields', () => {
    const cards = mergeCatalog(computeProviderStatus({ useMock: true }));
    const types = cards.map((c) => c.type);
    expect(types).toEqual(['mock', 'property', 'comps', 'rent', 'county', 'valuation']);
    for (const c of cards) {
      expect(typeof c.name).toBe('string');
      expect(Array.isArray(c.requiredEnv)).toBe(true);
      expect(Array.isArray(c.supplies)).toBe(true);
      expect(typeof c.configured).toBe('boolean');
      expect(typeof c.active).toBe('boolean');
      expect(Array.isArray(c.warnings)).toBe(true);
    }
    // In mock mode, the mock card is active and real ones are not.
    expect(cards.find((c) => c.type === 'mock')?.active).toBe(true);
    expect(cards.find((c) => c.type === 'property')?.active).toBe(false);
  });

  it('marks a real slot active in real mode when its key is configured', () => {
    const cards = mergeCatalog(computeProviderStatus({ useMock: false, attomApiKey: 'x' }));
    expect(cards.find((c) => c.type === 'property')?.active).toBe(true);
    expect(cards.find((c) => c.type === 'valuation')?.active).toBe(true);
    expect(cards.find((c) => c.type === 'comps')?.active).toBe(false);
  });
});

describe('resolveProviders (env-driven)', () => {
  const KEYS = ['ATTOM_API_KEY', 'MLS_API_KEY', 'RENT_PROVIDER_API_KEY', 'COUNTY_PROVIDER_API_KEY'];
  const snapshot = {
    mock: process.env.JARVIS_USE_MOCK_PROVIDER,
    keys: Object.fromEntries(KEYS.map((k) => [k, process.env[k]])),
  };

  afterEach(() => {
    if (snapshot.mock === undefined) delete process.env.JARVIS_USE_MOCK_PROVIDER;
    else process.env.JARVIS_USE_MOCK_PROVIDER = snapshot.mock;
    for (const k of KEYS) {
      if (snapshot.keys[k] === undefined) delete process.env[k];
      else process.env[k] = snapshot.keys[k] as string;
    }
  });

  it('returns the mock bundle in mock mode', () => {
    process.env.JARVIS_USE_MOCK_PROVIDER = 'true';
    const bundle = resolveProviders();
    expect(bundle.usesMock).toBe(true);
  });

  it('throws a clean error when mock is off and nothing is configured', () => {
    process.env.JARVIS_USE_MOCK_PROVIDER = 'false';
    for (const k of KEYS) delete process.env[k];
    expect(() => resolveProviders()).toThrow(NO_PROVIDER_MESSAGE);
  });

  it('never silently falls back to mock when a real provider is configured', () => {
    process.env.JARVIS_USE_MOCK_PROVIDER = 'false';
    for (const k of KEYS) delete process.env[k];
    process.env.ATTOM_API_KEY = 'attom-123';
    const bundle = resolveProviders();
    expect(bundle.usesMock).toBe(false);
    expect(bundle.property.id).not.toBe('mock');
    // Unconfigured comps slot is inert, not mock.
    expect(bundle.comparables.id).not.toBe('mock');
  });
});
