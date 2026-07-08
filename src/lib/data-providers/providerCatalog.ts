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
  /** Optional env vars (e.g. base URLs) required before any real call runs. */
  optionalEnv: string[];
  /** Plain-English list of what this provider supplies. */
  supplies: string[];
}

export const PROVIDER_CATALOG: ProviderCatalogEntry[] = [
  {
    type: 'mock',
    name: 'Mock Provider',
    requiredEnv: ['JARVIS_USE_MOCK_PROVIDER=true'],
    optionalEnv: [],
    supplies: [
      'Simulated subject facts, comps, public record, AVM, and rent',
      'Deterministic, seeded output for testing and demos',
      'Testing only — never valid for real offers',
    ],
  },
  {
    type: 'property',
    name: 'ATTOM Property Data',
    requiredEnv: ['ATTOM_API_KEY'],
    optionalEnv: ['ATTOM_BASE_URL'],
    supplies: [
      'Subject property facts',
      'Public record data',
      'Tax data',
      'Sale history',
      'Comparable sale data if supported by configured endpoint',
    ],
  },
  {
    type: 'comps',
    name: 'MLS / RESO Provider',
    requiredEnv: ['MLS_API_KEY'],
    optionalEnv: ['MLS_BASE_URL'],
    supplies: ['MLS sold comps', 'Property details', 'Listing history if licensed'],
  },
  {
    type: 'rent',
    name: 'Rent Provider',
    requiredEnv: ['RENT_PROVIDER_API_KEY'],
    optionalEnv: ['RENT_PROVIDER_BASE_URL'],
    supplies: ['Estimated rent', 'Rent confidence', 'Rental comparable support if available'],
  },
  {
    type: 'county',
    name: 'County Records Provider',
    requiredEnv: ['COUNTY_PROVIDER_API_KEY'],
    optionalEnv: ['COUNTY_PROVIDER_BASE_URL'],
    supplies: [
      'Owner info if legally available',
      'Tax assessed value',
      'Deed history',
      'Liens if legally available',
      'Public record details',
    ],
  },
  {
    type: 'valuation',
    name: 'Valuation Provider',
    requiredEnv: ['ATTOM_API_KEY'],
    optionalEnv: ['ATTOM_BASE_URL'],
    supplies: [
      'External valuation estimates',
      'Supporting value context only',
      'Never final ARV — the conservative ARV engine decides',
    ],
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
    if (entry.type === 'mock') {
      const mock = byType.get('mock');
      return {
        ...entry,
        configured: true, // the mock is always available
        active: status.mockProviderEnabled,
        warnings: mock?.warnings ?? [],
      };
    }
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
