/**
 * Provider adapter contracts.
 *
 * COMPLIANCE BOUNDARY: every external data source enters the app through one
 * of these interfaces. Adapters must be backed by LICENSED / ToS-compliant
 * feeds (MLS/RESO, ATTOM, CoreLogic, permissive public-record APIs, …) or be
 * the mock. We NEVER scrape Zillow, Redfin, Realtor, Trulia, Opendoor, MLS,
 * or any site that prohibits automated access. See docs/legal/DATA_SOURCING.md
 * and docs/providers/PROVIDER_SETUP.md.
 *
 * Every provider returns a standard ProviderResponse envelope so the pipeline
 * can uniformly track provenance (who, when, mock-or-real, confidence,
 * warnings) without knowing the concrete adapter.
 */
import type {
  Comp,
  NormalizedAddress,
  ProviderValuation,
  PublicRecord,
  RentEstimate,
  SubjectProperty,
} from '@/lib/types';

/** Passed to every provider call so date-relative data stays deterministic. */
export interface ProviderContext {
  /** ISO date the analysis is "as of" (drives comp recency, etc.). */
  asOf: string;
}

/** Qualitative confidence a provider reports about the data it returned. */
export type ProviderConfidence = 'low' | 'medium' | 'high' | 'testing_only';

/** The uniform envelope every provider method resolves to. */
export interface ProviderResponse<T> {
  /** Human-readable provider name (e.g. "ATTOM Property Data"). */
  providerName: string;
  /** Slot this data fills: property | comps | public_record | valuation | rent. */
  sourceType: string;
  /** True when this is simulated data, never a licensed feed. */
  isMock: boolean;
  /** ISO timestamp the data was fetched. */
  fetchedAt: string;
  confidence: ProviderConfidence;
  /** The payload. `null`/empty means "this provider supplied nothing". */
  data: T;
  warnings: string[];
}

export interface PropertyDataProvider {
  readonly id: string;
  isConfigured(): boolean;
  getPropertyByAddress(
    address: NormalizedAddress,
    ctx: ProviderContext,
  ): Promise<ProviderResponse<SubjectProperty | null>>;
}

export interface ComparableSalesProvider {
  readonly id: string;
  isConfigured(): boolean;
  getComparableSales(
    address: NormalizedAddress,
    subject: SubjectProperty,
    ctx: ProviderContext,
  ): Promise<ProviderResponse<Comp[]>>;
}

export interface PublicRecordsProvider {
  readonly id: string;
  isConfigured(): boolean;
  getPublicRecord(
    address: NormalizedAddress,
    ctx: ProviderContext,
  ): Promise<ProviderResponse<PublicRecord | null>>;
}

export interface ValuationProvider {
  readonly id: string;
  isConfigured(): boolean;
  /** External AVMs — supporting context ONLY. Never the final ARV. */
  getExternalValuations(
    address: NormalizedAddress,
    subject: SubjectProperty,
    ctx: ProviderContext,
  ): Promise<ProviderResponse<ProviderValuation[]>>;
}

export interface RentProvider {
  readonly id: string;
  isConfigured(): boolean;
  getRentEstimate(
    address: NormalizedAddress,
    subject: SubjectProperty,
    ctx: ProviderContext,
  ): Promise<ProviderResponse<RentEstimate | null>>;
}

/** The full set of providers the pipeline resolves and calls. */
export interface ProviderBundle {
  property: PropertyDataProvider;
  comparables: ComparableSalesProvider;
  publicRecords: PublicRecordsProvider;
  valuation: ValuationProvider;
  rent: RentProvider;
  /** True when any member is the mock (dev/testing, not licensed data). */
  usesMock: boolean;
}
