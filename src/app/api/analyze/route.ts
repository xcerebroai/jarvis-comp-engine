/**
 * POST /api/analyze — runs the autopilot pipeline server-side.
 *
 * Provider calls (and, later, licensed-API keys) live on the server. The mock
 * provider also runs here so the client never needs data credentials.
 */
import { NextResponse } from 'next/server';
import { runPropertyAnalysis } from '@/lib/analysis/runPropertyAnalysis';
import { getProviderStatus, NO_PROVIDER_MESSAGE } from '@/lib/data-providers/providerStatus';
import type { AnalysisInput } from '@/lib/types';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  let input: AnalysisInput;
  try {
    input = (await req.json()) as AnalysisInput;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  const addr = input?.address;
  const hasAddress =
    addr && (addr.fullAddress?.trim() || (addr.street?.trim() && (addr.city?.trim() || addr.zip?.trim())));
  if (!hasAddress) {
    return NextResponse.json(
      { error: 'A property address is required (full address, or street + city/ZIP).' },
      { status: 400 },
    );
  }

  // Production-safe guard: never silently fall back to mock when mock mode is
  // off and no real provider is configured.
  const status = getProviderStatus();
  if (!status.mockProviderEnabled && !status.realProvidersConfigured) {
    return NextResponse.json({ error: NO_PROVIDER_MESSAGE }, { status: 503 });
  }

  try {
    const result = await runPropertyAnalysis(input);
    return NextResponse.json(result);
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Analysis failed.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
