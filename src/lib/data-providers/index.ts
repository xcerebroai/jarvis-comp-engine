/**
 * Provider resolver — the single place the pipeline asks "who supplies data?".
 *
 * Policy:
 *  - If a licensed adapter for a slot is configured, use it.
 *  - Otherwise fall back to the deterministic mock so autopilot still runs.
 *  - Forcing the mock everywhere (default in dev) is controlled by
 *    USE_MOCK_PROVIDER in analysisConfig.
 *
 * No provider in this app scrapes restricted sites — that is enforced by only
 * ever registering licensed adapters or the mock here.
 */
import { USE_MOCK_PROVIDER } from '@/config/analysisConfig';
import type { ProviderBundle } from './providerTypes';
import {
  createMockBundle,
  mockComparablesProvider,
  mockPropertyProvider,
  mockPublicRecordsProvider,
  mockRentProvider,
  mockValuationProvider,
} from './mockProvider';
import { licensedPropertyProvider } from './propertyDataProvider';
import { licensedComparablesProvider } from './comparableSalesProvider';
import { compliantPublicRecordsProvider } from './publicRecordsProvider';
import { licensedValuationProvider } from './valuationProvider';
import { licensedRentProvider } from './rentProvider';

export function resolveProviders(): ProviderBundle {
  if (USE_MOCK_PROVIDER) return createMockBundle();

  // Per-slot: real adapter when configured, else mock fallback.
  const property = licensedPropertyProvider.isConfigured()
    ? licensedPropertyProvider
    : mockPropertyProvider;
  const comparables = licensedComparablesProvider.isConfigured()
    ? licensedComparablesProvider
    : mockComparablesProvider;
  const publicRecords = compliantPublicRecordsProvider.isConfigured()
    ? compliantPublicRecordsProvider
    : mockPublicRecordsProvider;
  const valuation = licensedValuationProvider.isConfigured()
    ? licensedValuationProvider
    : mockValuationProvider;
  const rent = licensedRentProvider.isConfigured()
    ? licensedRentProvider
    : mockRentProvider;

  const usesMock =
    property.id === 'mock' ||
    comparables.id === 'mock' ||
    publicRecords.id === 'mock' ||
    valuation.id === 'mock' ||
    rent.id === 'mock';

  return { property, comparables, publicRecords, valuation, rent, usesMock };
}

export * from './providerTypes';
export { normalizeAddress } from './addressNormalizer';
