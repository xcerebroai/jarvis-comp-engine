/**
 * Manual paste parser — FALLBACK ONLY.
 *
 * Used when no data provider is configured: the user pastes text they have
 * personally copied (from a listing they're viewing, a county page, seller
 * notes, an inspection report). This only reads text the user supplies — it
 * never fetches from any site. Output feeds the same normalized types the
 * providers produce.
 */
import type { PropertyCondition, PropertyFacts } from '@/lib/types';
import { detectCondition, parseNumber } from './sourceNormalizer';

export interface ManualParseResult {
  facts: PropertyFacts;
  condition: PropertyCondition;
  price?: number;
  /** Which fields we successfully pulled, for the "what was extracted" view. */
  extracted: string[];
  warnings: string[];
}

function firstMatch(text: string, re: RegExp): string | undefined {
  return text.match(re)?.[1];
}

export function parseManualPaste(raw: string): ManualParseResult {
  const text = raw.replace(/\s+/g, ' ').trim();
  const facts: PropertyFacts = {};
  const extracted: string[] = [];
  const warnings: string[] = [];

  const beds = firstMatch(text, /(\d+(?:\.\d+)?)\s*(?:bed|beds|bd|br)\b/i);
  if (beds) {
    facts.beds = Number(beds);
    extracted.push('beds');
  }

  const baths = firstMatch(text, /(\d+(?:\.\d+)?)\s*(?:bath|baths|ba)\b/i);
  if (baths) {
    facts.baths = Number(baths);
    extracted.push('baths');
  }

  const sqft = firstMatch(text, /([\d,]{3,})\s*(?:sq\s?\.?\s?ft|sqft|square\s?feet|sf)\b/i);
  if (sqft) {
    facts.sqft = parseNumber(sqft);
    extracted.push('sqft');
  }

  const year = firstMatch(text, /(?:built|year\s?built|yr\.?\s?built)\D{0,12}(\d{4})/i);
  if (year) {
    facts.yearBuilt = Number(year);
    extracted.push('yearBuilt');
  }

  const lot = firstMatch(text, /([\d,.]+)\s*(?:acre|acres)/i);
  if (lot) {
    facts.lotSqft = Math.round(Number(lot.replace(/,/g, '')) * 43560);
    extracted.push('lotSqft');
  }

  const price = firstMatch(text, /\$\s?([\d,]{4,})/);
  const priceNum = price ? parseNumber(price) : undefined;
  if (priceNum) extracted.push('price');

  const condition = detectCondition(text);
  if (condition !== 'unknown') extracted.push('condition');

  if (extracted.length === 0)
    warnings.push('Could not extract any structured fields — enter them manually.');
  if (!facts.sqft) warnings.push('No square footage found — valuation will be weaker without it.');

  return { facts, condition, price: priceNum, extracted, warnings };
}
