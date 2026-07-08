/**
 * Provider resolver — the single place the pipeline asks "who supplies data?".
 *
 * Policy (real data only — there is NO mock mode in the server pipeline):
 *  - DealMachine (licensed API) fills property, comps, public-records, and
 *    valuation when DEALMACHINE_API_KEY is set.
 *  - Slots no configured provider covers stay INERT (they supply nothing and
 *    say so). We never fabricate data and never silently fall back to samples.
 *  - Nothing configured at all → throw NO_PROVIDER_MESSAGE.
 *
 * The deterministic mock bundle still exists in mockProvider.ts, but it is
 * reachable ONLY by explicit injection (unit tests and the loudly-labeled
 * GitHub Pages demo via runClientMockAnalysis) — never through this resolver.
 *
 * No provider in this app scrapes restricted sites — enforced by only ever
 * registering licensed adapters here. See docs/legal/DATA_SOURCING.md.
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
import {
  dealMachineCompsProvider,
  dealMachinePropertyProvider,
  dealMachinePublicRecordsProvider,
  dealMachineValuationProvider,
} from './dealMachineProvider';
import { futureRentProvider } from './rentProvider';
import { getProviderStatus, NO_PROVIDER_MESSAGE } from './providerStatus';

/* --------------- inert providers (slot has no configured source) --------- */
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
  if (!status.realProvidersConfigured) throw new Error(NO_PROVIDER_MESSAGE);

  const dm = dealMachinePropertyProvider.isConfigured();
  return {
    property: dm ? dealMachinePropertyProvider : nullPropertyProvider,
    comparables: dm ? dealMachineCompsProvider : nullComparablesProvider,
    publicRecords: dm ? dealMachinePublicRecordsProvider : nullPublicRecordsProvider,
    valuation: dm ? dealMachineValuationProvider : nullValuationProvider,
    rent: futureRentProvider.isConfigured() ? futureRentProvider : nullRentProvider,
    usesMock: false,
  };
}

export * from './providerTypes';
export * from './providerStatus';
export { normalizeAddress } from './addressNormalizer';
