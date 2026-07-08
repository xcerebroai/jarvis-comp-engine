/**
 * Source normalizer — fallback path only.
 *
 * Maps loose, user-selected source labels and free text onto canonical values.
 * All pasted data is provenance `manual_paste` regardless of which site the
 * user copied it from — we never fetch from those sites, the user does the
 * copying. See docs/legal/DATA_SOURCING.md.
 */
import type { DataSource, PropertyCondition } from '@/lib/types';

export type PasteSourceLabel =
  | 'seller_notes'
  | 'zillow'
  | 'redfin'
  | 'realtor'
  | 'county'
  | 'mls'
  | 'inspection'
  | 'contractor'
  | 'other';

/** Human-readable names for the paste source dropdown. */
export const PASTE_SOURCE_LABELS: Record<PasteSourceLabel, string> = {
  seller_notes: 'Seller notes',
  zillow: 'Zillow paste',
  redfin: 'Redfin paste',
  realtor: 'Realtor paste',
  county: 'County record paste',
  mls: 'MLS notes paste',
  inspection: 'Inspection notes',
  contractor: 'Contractor notes',
  other: 'Other',
};

/** Everything pasted is `manual_paste` provenance — no site is ever fetched. */
export function toDataSource(_label: PasteSourceLabel): DataSource {
  return 'manual_paste';
}

const CONDITION_KEYWORDS: { rank: PropertyCondition; words: string[] }[] = [
  { rank: 'distressed', words: ['distressed', 'gut', 'fire', 'condemned', 'uninhabitable', 'teardown'] },
  { rank: 'below_average', words: ['fixer', 'tlc', 'as-is', 'as is', 'handyman', 'dated', 'needs work', 'deferred'] },
  { rank: 'renovated', words: ['fully renovated', 'newly renovated', 'gut renovated', 'completely remodeled', 'turnkey'] },
  { rank: 'updated', words: ['updated', 'remodeled', 'new roof', 'new hvac', 'move-in ready', 'move in ready'] },
];

/** Best-effort condition read from free text. Defaults to 'unknown'. */
export function detectCondition(text: string): PropertyCondition {
  const t = text.toLowerCase();
  // Check strongest signals first.
  for (const { rank, words } of CONDITION_KEYWORDS) {
    if (words.some((w) => t.includes(w))) return rank;
  }
  return 'unknown';
}

/** Parse a loose number like "1,850" or "$210,000" into a plain number. */
export function parseNumber(raw: string): number | undefined {
  const n = Number(raw.replace(/[^0-9.]/g, ''));
  return Number.isFinite(n) && n > 0 ? n : undefined;
}
