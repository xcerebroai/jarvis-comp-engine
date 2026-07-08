/**
 * POST /api/parse-notes — Claude parses pasted free-text into structured intake
 * fields. The response is a PROPOSAL: the UI shows a confirm step before any
 * field is applied. No number in the valuation pipeline originates here.
 */
import { NextResponse } from 'next/server';
import { claudeConfigured, parseNotes } from '@/lib/claude';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  if (!claudeConfigured()) {
    return NextResponse.json(
      { error: 'Note parsing is unavailable — ANTHROPIC_API_KEY is not configured on the server.' },
      { status: 503 },
    );
  }

  let text: unknown;
  try {
    ({ text } = (await req.json()) as { text?: unknown });
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }
  if (typeof text !== 'string' || text.trim().length < 10) {
    return NextResponse.json({ error: 'Paste at least a sentence of notes to parse.' }, { status: 400 });
  }
  if (text.length > 20_000) {
    return NextResponse.json({ error: 'Notes too long — paste under 20,000 characters.' }, { status: 400 });
  }

  try {
    const parsed = await parseNotes(text);
    return NextResponse.json({ parsed });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Parsing failed.';
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
