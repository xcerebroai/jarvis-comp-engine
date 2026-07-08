/**
 * Core domain vocabulary: the property, its comps, and provider-returned
 * records. Data providers normalize raw/licensed data INTO these shapes;
 * the analysis engines only ever operate ON these shapes.
 */

/** Provenance of a piece of data — drives trust, confidence, and compliance. */
export type DataSource =
  | 'mock_provider'
  | 'licensed_property_api'
  | 'licensed_comps_api'
  | 'public_records_api'
  | 'licensed_valuation_api'
  | 'licensed_rent_api'
  | 'manual_comp'
  | 'manual_paste'
  | 'user_input';

export interface Address {
  street: string;
  city: string;
  state: string;
  zip: string;
}

/** Result of address normalization. `key` is a stable lookup handle. */
export interface NormalizedAddress extends Address {
  /** Single-line canonical form, e.g. "123 Main St, Austin, TX 78701". */
  formatted: string;
  /** Stable lowercased key used to seed providers / cache lookups. */
  key: string;
  /** 0–1 — how confident the normalizer is that it parsed correctly. */
  confidence: number;
  warnings: string[];
}

export type PropertyType =
  | 'single_family'
  | 'townhouse'
  | 'condo'
  | 'multi_family'
  | 'manufactured'
  | 'unknown';

/** Physical facts about a home. All optional — provider data is often partial. */
export interface PropertyFacts {
  beds?: number;
  baths?: number;
  sqft?: number;
  lotSqft?: number;
  yearBuilt?: number;
  garageSpaces?: number;
  stories?: number;
  pool?: boolean;
}

export type PropertyCondition =
  | 'unknown'
  | 'distressed'
  | 'below_average'
  | 'average'
  | 'updated'
  | 'renovated';

/** The subject property under analysis, as assembled from provider data. */
export interface SubjectProperty {
  address: NormalizedAddress;
  propertyType: PropertyType;
  facts: PropertyFacts;
  condition: PropertyCondition;
  /** Provider guess of current value (AVM-style), if available. */
  providerValueEstimate?: number;
  sources: DataSource[];
}

/** A comparable sale or active/pending listing. */
export interface Comp {
  id: string;
  address: Address;
  facts: PropertyFacts;
  condition: PropertyCondition;
  /** Sold price, or list price for active/pending. */
  price: number;
  status: 'sold' | 'pending' | 'active';
  /** ISO date of sale (sold) or list date (active/pending). */
  date: string;
  distanceMiles: number;
  source: DataSource;
}

/** Public-record data (assessor / recorder), used lawfully via APIs only. */
export interface PublicRecord {
  apn?: string;
  ownerName?: string;
  lastSalePrice?: number;
  lastSaleDate?: string;
  taxAssessedValue?: number;
  annualTaxes?: number;
  lotSqft?: number;
  yearBuilt?: number;
  source: DataSource;
}

/** Provider valuation (AVM). Used as a sanity check, never to inflate ARV. */
export interface ProviderValuation {
  estimate: number;
  low: number;
  high: number;
  /** 0–1 confidence reported by the provider. */
  confidence: number;
  source: DataSource;
}

export interface RentEstimate {
  monthlyRent: number;
  low: number;
  high: number;
  source: DataSource;
}
