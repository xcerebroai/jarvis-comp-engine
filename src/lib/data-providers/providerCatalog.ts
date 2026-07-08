/**
 * Provider catalog — static, human-facing descriptors for every provider slot:
 * what it supplies and which env vars configure it. The settings page and the
 * dashboard provider strip merge this with the live ProviderStatus.
 *
 * This is documentation-as-data. It does NOT make calls and knows nothing about
 * secrets — only variable NAMES.
 */
import type { ProviderSlotType, ProviderStatus } from '@/lib/types';
import { getProviderStatus } from './providerStatus';

export interface ProviderCatalogEntry {
  type: ProviderSlotType;
  name: string;
  /** Env vars that must be set for this provider to be considered configured. */
  requiredEnv: string[];
  /** Optional env vars. */
  optionalEnv: string[];
  /** Plain-English list of what this provider supplies. */
  supplies: string[];
}

export const PROVIDER_CATALOG: ProviderCatalogEntry[] = [
  {
    type: 'property',
    name: 'DealMachine Property Data',
    requiredEnv: ['DEALMACHINE_API_KEY'],
    optionalEnv: [],
    supplies: [
      'Subject property facts (beds, baths, sqft, lot, year built)',
      'Address match via POST /v1/enrichment/address',
      'Estimated value (context only)',
    ],
  },
  {
    type: 'comps',
    name: 'DealMachine Comparable Sales',
    requiredEnv: ['DEALMACHINE_API_KEY'],
    optionalEnv: [],
    supplies: [
      'Comparable sales via POST /v1/comps (radius, timeframe, criteria)',
      'Per-comp sale price, sale date, distance, sqft, beds/baths, year built',
      'Recorder sale_type text — drives the non-disclosure/modeled-price flag',
    ],
  },
  {
    type: 'county',
    name: 'DealMachine Public Records',
    requiredEnv: ['DEALMACHINE_API_KEY'],
    optionalEnv: [],
    supplies: [
      'APN, tax assessed value, annual property tax',
      'Last sale price and date',
      'Mortgage / estimated loan balance context',
    ],
  },
  {
    type: 'valuation',
    name: 'DealMachine Value Estimate',
    requiredEnv: ['DEALMACHINE_API_KEY'],
    optionalEnv: [],
    supplies: [
      'value_estimation with confidence interval',
      'Supporting value context only',
      'Never final ARV — the conservative ARV engine decides',
    ],
  },
  {
    type: 'rent',
    name: 'Rent Provider',
    requiredEnv: ['RENT_PROVIDER_API_KEY'],
    optionalEnv: ['RENT_PROVIDER_BASE_URL'],
    supplies: ['Estimated rent', 'Rent confidence', 'Rental comparable support if available'],
  },
];

/** A catalog entry merged with its live configured/active/warnings state. */
export interface ProviderCard extends ProviderCatalogEntry {
  configured: boolean;
  active: boolean;
  warnings: string[];
}

/** Merge the static catalog with a live ProviderStatus into display cards. */
export function mergeCatalog(status: ProviderStatus): ProviderCard[] {
  const byType = new Map(status.providers.map((p) => [p.type, p]));
  return PROVIDER_CATALOG.map((entry) => {
    const live = byType.get(entry.type);
    return {
      ...entry,
      configured: live?.configured ?? false,
      active: live?.active ?? false,
      warnings: live?.warnings ?? [],
    };
  });
}

/** Convenience: cards built from the live environment. */
export function getProviderCards(): ProviderCard[] {
  return mergeCatalog(getProviderStatus());
}
