/**
 * Core domain types for a single-family property and its comps.
 *
 * These types are the shared vocabulary across ingestion, domain logic,
 * and the UI. Ingestion adapters normalize raw pasted/API data INTO these
 * shapes; domain logic only ever operates ON these shapes.
 */

/** Where a piece of data originally came from. Drives trust + compliance. */
export type DataSource =
  | 'manual_paste'
  | 'zillow_paste'
  | 'redfin_paste'
  | 'realtor_paste'
  | 'county_records'
  | 'mls_notes'
  | 'seller_notes'
  | 'repair_notes'
  | 'inspection_notes'
  | 'licensed_api';

export interface Address {
  line1: string;
  city: string;
  state: string;
  zip: string;
}

/** Physical facts about a home. All optional — pasted data is often partial. */
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

export interface Subject {
  address: Address;
  facts: PropertyFacts;
  condition: PropertyCondition;
  /** Free-form notes captured from seller / inspection / MLS. */
  notes?: string;
  /** Provenance of each field, for auditability. */
  sources: DataSource[];
}

/** A comparable sale or active/pending listing. */
export interface Comp {
  address: Address;
  facts: PropertyFacts;
  condition: PropertyCondition;
  /** Sold price, or list price for active/pending. */
  price: number;
  status: 'sold' | 'pending' | 'active';
  /** ISO date of sale or listing. */
  date?: string;
  distanceMiles?: number;
  source: DataSource;
}

/** A dollar figure paired with the confidence we have in it. */
export interface Estimate {
  value: number;
  low: number;
  high: number;
  /** 0–1. How much weight downstream offer math should give this. */
  confidence: number;
  notes?: string;
}
