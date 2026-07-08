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
  PropertyDataProvider,
  PublicRecordsProvider,
  RentProvider,
  ValuationProvider,
} from './providerTypes';
import { createMockBundle } from './mockProvider';
import { licensedPropertyProvider } from './propertyDataProvider';
import { licensedComparablesProvider } from './comparableSalesProvider';
import { compliantPublicRecordsProvider } from './publicRecordsProvider';
import { licensedValuationProvider } from './valuationProvider';
import { licensedRentProvider } from './rentProvider';
import { getProviderStatus, NO_PROVIDER_MESSAGE } from './providerStatus';

/* --------------- inert providers (real mode, slot unconfigured) --------- */
// These return no data rather than falling back to mock. They keep the
// pipeline honest: a slot with no licensed adapter simply supplies nothing.
const UNCONFIGURED = 'unconfigured';
const nullPropertyProvider: PropertyDataProvider = {
  id: UNCONFIGURED,
  isConfigured: () => false,
  async getProperty() {
    return null;
  },
};
const nullComparablesProvider: ComparableSalesProvider = {
  id: UNCONFIGURED,
  isConfigured: () => false,
  async getComparables() {
    return [];
  },
};
const nullPublicRecordsProvider: PublicRecordsProvider = {
  id: UNCONFIGURED,
  isConfigured: () => false,
  async getPublicRecord() {
    return null;
  },
};
const nullValuationProvider: ValuationProvider = {
  id: UNCONFIGURED,
  isConfigured: () => false,
  async getValuation() {
    return null;
  },
};
const nullRentProvider: RentProvider = {
  id: UNCONFIGURED,
  isConfigured: () => false,
  async getRent() {
    return null;
  },
};

export function resolveProviders(): ProviderBundle {
  const status = getProviderStatus();

  if (status.mockProviderEnabled) return createMockBundle();

  // Real mode: refuse to run if nothing is configured.
  if (!status.realProvidersConfigured) throw new Error(NO_PROVIDER_MESSAGE);

  // Real mode: configured licensed adapter per slot, else inert (no mock).
  return {
    property: licensedPropertyProvider.isConfigured()
      ? licensedPropertyProvider
      : nullPropertyProvider,
    comparables: licensedComparablesProvider.isConfigured()
      ? licensedComparablesProvider
      : nullComparablesProvider,
    publicRecords: compliantPublicRecordsProvider.isConfigured()
      ? compliantPublicRecordsProvider
      : nullPublicRecordsProvider,
    valuation: licensedValuationProvider.isConfigured()
      ? licensedValuationProvider
      : nullValuationProvider,
    rent: licensedRentProvider.isConfigured() ? licensedRentProvider : nullRentProvider,
    usesMock: false,
  };
}

export * from './providerTypes';
export * from './providerStatus';
export { normalizeAddress } from './addressNormalizer';
