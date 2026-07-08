/**
 * Recorded-sale detection — pure. Non-disclosure states (TX, and others) don't
 * publish sale prices, so providers backfill with modeled estimates. We key off
 * each comp's recorder `sale_type` text rather than a blanket state rule:
 * a price only counts as RECORDED when the deed language affirmatively says so.
 * Absent or ambiguous text → NOT recorded (conservative default).
 */

const RECORDED_PATTERNS = [
  /full amount/i, // "Full amount stated on Document."
  /stated on document/i,
  /full consideration/i,
  /recorded/i,
  /deed/i,
];

const MODELED_PATTERNS = [
  /estimat/i,
  /model/i,
  /avm/i,
  /non.?disclos/i,
  /undisclosed/i,
  /computed/i,
];

export function isRecordedSale(saleType?: string): boolean {
  if (!saleType) return false;
  if (MODELED_PATTERNS.some((p) => p.test(saleType))) return false;
  return RECORDED_PATTERNS.some((p) => p.test(saleType));
}
