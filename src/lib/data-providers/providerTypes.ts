/**
 * Provider adapter contracts.
 *
 * COMPLIANCE BOUNDARY: every external data source enters the app through one
 * of these interfaces. Adapters must be backed by LICENSED / ToS-compliant
 * feeds (MLS/RESO, ATTOM, CoreLogic, permissive public-record APIs, …) or be
 * the mock. We NEVER scrape Zillow, Redfin, Realtor, Trulia, Opendoor, MLS,
 * or any site that prohibits automated access. See docs/legal/DATA_SOURCING.md.
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

export interface PropertyDataProvider {
  readonly id: string;
  isConfigured(): boolean;
  getProperty(
    address: NormalizedAddress,
    ctx: ProviderContext,
  ): Promise<SubjectProperty | null>;
}

export interface ComparableSalesProvider {
  readonly id: string;
  isConfigured(): boolean;
  getComparables(
    address: NormalizedAddress,
    subject: SubjectProperty,
    ctx: ProviderContext,
  ): Promise<Comp[]>;
}

export interface PublicRecordsProvider {
  readonly id: string;
  isConfigured(): boolean;
  getPublicRecord(
    address: NormalizedAddress,
    ctx: ProviderContext,
  ): Promise<PublicRecord | null>;
}

export interface ValuationProvider {
  readonly id: string;
  isConfigured(): boolean;
  getValuation(
    address: NormalizedAddress,
    subject: SubjectProperty,
    ctx: ProviderContext,
  ): Promise<ProviderValuation | null>;
}

export interface RentProvider {
  readonly id: string;
  isConfigured(): boolean;
  getRent(
    address: NormalizedAddress,
    subject: SubjectProperty,
    ctx: ProviderContext,
  ): Promise<RentEstimate | null>;
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
