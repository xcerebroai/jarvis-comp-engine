/**
 * Address normalization — pure, no geocoding API. Takes the loose form input
 * (a full-address string and/or discrete fields) and produces a canonical
 * NormalizedAddress with a stable key and a confidence score.
 *
 * When a real geocoding/licensed address API is added, it slots in here behind
 * the same return type.
 */
import type { AddressInput, NormalizedAddress } from '@/lib/types';

const STATE_ABBR = new Set([
  'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA',
  'KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ',
  'NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT',
  'VA','WA','WV','WI','WY','DC',
]);

function titleCase(s: string): string {
  return s
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim();
}

/** Parse "123 Main St, Austin, TX 78701" into parts (best effort). */
function parseFullAddress(full: string): Partial<AddressInput> {
  const cleaned = full.replace(/\s+/g, ' ').trim();
  // Try the comma-delimited canonical form first.
  const parts = cleaned.split(',').map((p) => p.trim()).filter(Boolean);
  if (parts.length >= 3) {
    const street = parts[0];
    const city = parts[1];
    const stateZip = parts[2];
    const m = stateZip.match(/([A-Za-z]{2})\s*(\d{5})?/);
    return {
      street,
      city,
      state: m?.[1]?.toUpperCase(),
      zip: m?.[2],
    };
  }
  // Fallback: pull a trailing "ST 78701" and a 5-digit zip from anywhere.
  const zip = cleaned.match(/\b(\d{5})(?:-\d{4})?\b/)?.[1];
  const state = cleaned.match(/\b([A-Za-z]{2})\b(?=\s*\d{5})/)?.[1]?.toUpperCase();
  return { street: cleaned, zip, state };
}

export function normalizeAddress(input: AddressInput): NormalizedAddress {
  const warnings: string[] = [];

  const parsed: Partial<AddressInput> = input.fullAddress
    ? parseFullAddress(input.fullAddress)
    : {};

  const street = (input.street || parsed.street || '').trim();
  const city = (input.city || parsed.city || '').trim();
  const stateRaw = (input.state || parsed.state || '').trim().toUpperCase();
  const zip = (input.zip || parsed.zip || '').trim();

  const state = STATE_ABBR.has(stateRaw) ? stateRaw : stateRaw.slice(0, 2);

  // Confidence: reward each cleanly present component.
  let confidence = 0;
  if (street) confidence += 0.4;
  else warnings.push('No street address detected.');
  if (city) confidence += 0.2;
  else warnings.push('No city detected.');
  if (STATE_ABBR.has(state)) confidence += 0.2;
  else warnings.push('State missing or not a valid 2-letter abbreviation.');
  if (/^\d{5}$/.test(zip)) confidence += 0.2;
  else warnings.push('ZIP missing or not 5 digits.');

  const niceStreet = titleCase(street);
  const niceCity = titleCase(city);
  const formatted =
    [niceStreet, niceCity].filter(Boolean).join(', ') +
    (state || zip ? `, ${state} ${zip}`.trimEnd() : '');

  const key = [niceStreet, niceCity, state, zip]
    .join('|')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();

  return {
    street: niceStreet,
    city: niceCity,
    state,
    zip,
    formatted: formatted.trim(),
    key,
    confidence: Math.min(1, confidence),
    warnings,
  };
}
