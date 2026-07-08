/**
 * Provider resolver — the single place the pipeline asks "who supplies data?".
 *
 * Policy (production-safe):
 *  - Mock mode ON  → run entirely on the deterministic mock.
 *  - Mock mode OFF → use each licensed adapter that is configured. Slots with
 *    no configured adapter are left INERT (return null/empty) — we NEVER
 *    silently fall back to mock data when mock mode is off.
 *  - Mock mode OFF and NOTHING configured → throw NO_PROVIDER_MESSAGE.
 *
 * No provider in this app scrapes restricted sites — enforced by only ever
 * registering licensed adapters or the mock here.
 */
import type {
  ComparableSalesProvider,
  ProviderBundle,
  ProviderContext,
  ProviderResponse,
  PropertyDataProvider,
  PublicRecordsProvider,
  RentProvider,
  ValuationProvider,
} from './providerTypes';
import { createMockBundle } from './mockProvider';
import { futureAttomProvider } from './propertyDataProvider';
import { futureMlsResoProvider } from './comparableSalesProvider';
import { futureCountyRecordsProvider } from './publicRecordsProvider';
import { futureValuationProvider } from './valuationProvider';
import { futureRentProvider } from './rentProvider';
import { getProviderStatus, NO_PROVIDER_MESSAGE } from './providerStatus';

/* --------------- inert providers (real mode, slot unconfigured) --------- */
// These return an empty envelope rather than falling back to mock. They keep
// the pipeline honest: a slot with no licensed adapter simply supplies nothing,
// with a warning the pipeline can surface.
const UNCONFIGURED = 'unconfigured';

function inertResponse<T>(sourceType: string, data: T, ctx: ProviderContext): ProviderResponse<T> {
  return {
    providerName: 'Not configured',
    sourceType,
    isMock: false,
    fetchedAt: ctx.asOf,
    confidence: 'low',
    data,
    warnings: [`No ${sourceType} provider is configured — this slot supplied no data.`],
  };
}

const nullPropertyProvider: PropertyDataProvider = {
  id: UNCONFIGURED,
  isConfigured: () => false,
  async getPropertyByAddress(_address, ctx) {
    return inertResponse('property', null, ctx);
  },
};
const nullComparablesProvider: ComparableSalesProvider = {
  id: UNCONFIGURED,
  isConfigured: () => false,
  async getComparableSales(_address, _subject, ctx) {
    return inertResponse('comps', [], ctx);
  },
};
const nullPublicRecordsProvider: PublicRecordsProvider = {
  id: UNCONFIGURED,
  isConfigured: () => false,
  async getPublicRecord(_address, ctx) {
    return inertResponse('public_record', null, ctx);
  },
};
const nullValuationProvider: ValuationProvider = {
  id: UNCONFIGURED,
  isConfigured: () => false,
  async getExternalValuations(_address, _subject, ctx) {
    return inertResponse('valuation', [], ctx);
  },
};
const nullRentProvider: RentProvider = {
  id: UNCONFIGURED,
  isConfigured: () => false,
  async getRentEstimate(_address, _subject, ctx) {
    return inertResponse('rent', null, ctx);
  },
};

export function resolveProviders(): ProviderBundle {
  const status = getProviderStatus();

  if (status.mockProviderEnabled) return createMockBundle();

  // Real mode: refuse to run if nothing is configured.
  if (!status.realProvidersConfigured) throw new Error(NO_PROVIDER_MESSAGE);

  // Real mode: configured licensed adapter per slot, else inert (no mock).
  return {
    property: futureAttomProvider.isConfigured() ? futureAttomProvider : nullPropertyProvider,
    comparables: futureMlsResoProvider.isConfigured()
      ? futureMlsResoProvider
      : nullComparablesProvider,
    publicRecords: futureCountyRecordsProvider.isConfigured()
      ? futureCountyRecordsProvider
      : nullPublicRecordsProvider,
    valuation: futureValuationProvider.isConfigured()
      ? futureValuationProvider
      : nullValuationProvider,
    rent: futureRentProvider.isConfigured() ? futureRentProvider : nullRentProvider,
    usesMock: false,
  };
}

export * from './providerTypes';
export * from './providerStatus';
export { normalizeAddress } from './addressNormalizer';
