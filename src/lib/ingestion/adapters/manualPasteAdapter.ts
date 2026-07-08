import type { IngestionAdapter, IngestionResult } from './types';

/**
 * The default, always-available adapter.
 *
 * The user copies text from a listing / county page / MLS printout / their
 * own notes and pastes it in. Nothing is fetched automatically, so there is
 * no ToS or scraping exposure — the user is simply transcribing data they
 * are already looking at.
 */
export const manualPasteAdapter: IngestionAdapter = {
  id: 'manual-paste',
  source: 'manual_paste',
  automated: false,
  ingest(raw: string): IngestionResult {
    // TODO: route to src/lib/ingestion/parsers based on detected format.
    void raw;
    return {
      comps: [],
      warnings: ['manual-paste parsing not yet implemented'],
    };
  },
};
