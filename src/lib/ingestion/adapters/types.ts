import type { Comp, DataSource, Subject } from '@/lib/types';

/**
 * The single contract every data source must satisfy.
 *
 * COMPLIANCE BOUNDARY: adapters are the ONLY place raw external data enters
 * the app. Manual-paste adapters take text the user has personally copied.
 * Future API adapters must be backed by a LICENSED, ToS-compliant feed
 * (e.g. an MLS/RESO or paid data provider) — never automated scraping of a
 * site whose terms forbid it. See docs/legal/DATA_SOURCING.md.
 */
export interface IngestionAdapter {
  /** Stable id, e.g. 'manual-paste' or 'reso-mls'. */
  id: string;
  /** Which DataSource kinds this adapter can produce. */
  source: DataSource;
  /** True for licensed automated feeds; false for manual/paste input. */
  automated: boolean;
  /** Parse arbitrary input into a normalized subject + comps. */
  ingest(raw: string): IngestionResult;
}

export interface IngestionResult {
  subject?: Partial<Subject>;
  comps: Comp[];
  /** Fields the adapter could not confidently parse. */
  warnings: string[];
}
