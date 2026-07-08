/**
 * Claude API integration — SERVER-SIDE ONLY, and strictly non-numeric.
 *
 * Two jobs, per product spec:
 *   1. parseNotes()        — turn pasted free-text (Zillow/seller/inspection
 *      notes) into structured AnalysisInput fields, behind a UI confirm step.
 *   2. generateMemoProse() — write deal-memo prose FROM the deterministic
 *      engine's computed numbers. It never invents or alters a number; the
 *      engine's templated memo remains the numeric source of truth.
 *
 * Graceful degradation: without ANTHROPIC_API_KEY both features are simply
 * unavailable — parsing returns a clear error and the memo falls back to the
 * deterministic template. Valuation math never depends on this file.
 */
import Anthropic from '@anthropic-ai/sdk';
import type { AnalysisResult, CompInput, RepairInput, SellerInfoInput } from '@/lib/types';

const MODEL = 'claude-opus-4-8';

export function claudeConfigured(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

function client(): Anthropic {
  return new Anthropic(); // reads ANTHROPIC_API_KEY from the environment
}

/* ------------------------------ note parsing ----------------------------- */

/** What the parser may extract — a strict subset of AnalysisInput. */
export interface ParsedNotes {
  address?: { fullAddress?: string };
  repairs?: RepairInput;
  sellerInfo?: SellerInfoInput;
  manualComps?: CompInput[];
  /** Anything ambiguous the human should double-check before applying. */
  parserNotes?: string[];
}

// JSON schema for structured outputs — additionalProperties:false throughout.
const PARSED_NOTES_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['parserNotes'],
  properties: {
    address: {
      type: 'object',
      additionalProperties: false,
      required: [],
      properties: { fullAddress: { type: 'string' } },
    },
    repairs: {
      type: 'object',
      additionalProperties: false,
      required: [],
      properties: {
        rehabLevel: { type: 'string', enum: ['cosmetic', 'light', 'medium', 'heavy', 'full_gut'] },
        repairNotes: { type: 'string' },
        knownMajorRepairs: { type: 'string' },
      },
    },
    sellerInfo: {
      type: 'object',
      additionalProperties: false,
      required: [],
      properties: {
        askingPrice: { type: 'number' },
        loanBalance: { type: 'number' },
        monthlyPiti: { type: 'number' },
        interestRate: { type: 'number' },
        arrears: { type: 'number' },
        reinstatementAmount: { type: 'number' },
        cashToSeller: { type: 'number' },
        estimatedRent: { type: 'number' },
        motivation: { type: 'string' },
        occupancy: { type: 'string' },
      },
    },
    manualComps: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: [],
        properties: {
          address: { type: 'string' },
          soldPrice: { type: 'number' },
          soldDate: { type: 'string' },
          beds: { type: 'number' },
          baths: { type: 'number' },
          sqft: { type: 'number' },
          yearBuilt: { type: 'number' },
          distanceMiles: { type: 'number' },
          condition: { type: 'string' },
          status: { type: 'string', enum: ['sold', 'active', 'pending', 'listed'] },
          source: { type: 'string' },
          notes: { type: 'string' },
        },
      },
    },
    parserNotes: { type: 'array', items: { type: 'string' } },
  },
} as const;

const PARSER_SYSTEM = `You extract structured real-estate deal fields from pasted notes (listing text, seller conversations, county records, inspection or contractor notes).

Rules:
- Extract ONLY what the text actually states. Never infer, estimate, or fill in a number that is not present.
- Dollar amounts: plain numbers (no symbols). "asking 250k" -> askingPrice 250000.
- rehabLevel only when the text clearly implies scope (e.g. "needs full gut" -> full_gut; "paint and carpet" -> cosmetic/light).
- Comps only when the text describes specific comparable sales with prices.
- Put anything ambiguous, conflicting, or half-stated into parserNotes so a human can verify. When in doubt, omit the field and add a parserNote.
- Omit empty objects entirely.`;

export async function parseNotes(text: string): Promise<ParsedNotes> {
  const response = await client().messages.create({
    model: MODEL,
    max_tokens: 4096,
    thinking: { type: 'adaptive' },
    system: PARSER_SYSTEM,
    output_config: { format: { type: 'json_schema', schema: PARSED_NOTES_SCHEMA } },
    messages: [{ role: 'user', content: `Extract deal fields from these notes:\n\n${text}` }],
  });

  const textBlock = response.content.find(
    (b): b is Anthropic.TextBlock => b.type === 'text',
  );
  if (!textBlock) throw new Error('Parser returned no content.');
  return JSON.parse(textBlock.text) as ParsedNotes;
}

/* ------------------------------- memo prose ------------------------------ */

const MEMO_SYSTEM = `You are an acquisitions analyst writing an internal deal memo for a single-family real-estate investor.

HARD RULES:
- Every number you mention MUST be copied verbatim from the DATA section. Never compute, round differently, estimate, or invent any figure.
- If a number is not in the DATA section, do not mention one.
- Keep all warnings and red flags intact — this memo protects the buyer.
- Tone: direct, plain-English, conservative. No hype. 250-400 words.
- Structure: opening verdict line, the numbers story (ARV/repairs/confidence), comp quality, the recommended strategy and why, key risks, and what to ask the seller next.`;

export async function generateMemoProse(result: AnalysisResult): Promise<string> {
  const response = await client().messages.create({
    model: MODEL,
    max_tokens: 4096,
    thinking: { type: 'adaptive' },
    system: MEMO_SYSTEM,
    messages: [
      {
        role: 'user',
        content: `Write the deal memo prose. DATA (the deterministic engine's output — the only source of numbers):\n\n${result.memo.plainText}\n\nStrategy ranking: ${result.recommendation.ranking
          .map((r) => `${r.strategy} ${r.score}`)
          .join(', ')}`,
      },
    ],
  });

  const textBlock = response.content.find(
    (b): b is Anthropic.TextBlock => b.type === 'text',
  );
  if (!textBlock) throw new Error('Memo writer returned no content.');
  return textBlock.text.trim();
}
