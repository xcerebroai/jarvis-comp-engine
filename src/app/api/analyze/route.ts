/**
 * POST /api/analyze — runs the autopilot pipeline server-side (local/server
 * deploy). Provider calls (and, later, licensed-API keys) live on the server.
 *
 * NOTE: the GitHub Pages STATIC EXPORT excludes this route entirely (there is
 * no server there); the browser runs the same pipeline via runClientMockAnalysis
 * against the mock provider. See scripts/build.mjs and next.config.ts.
 */
import { NextResponse } from 'next/server';
import { runPropertyAnalysis } from '@/lib/analysis/runPropertyAnalysis';
import { getProviderStatus, NO_PROVIDER_MESSAGE } from '@/lib/data-providers/providerStatus';
import { claudeConfigured, generateMemoProse } from '@/lib/claude';
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

    // Optional Claude prose pass — prose only, numbers stay deterministic.
    // Any failure falls back silently to the templated memo.
    if (claudeConfigured()) {
      try {
        result.memoProse = await generateMemoProse(result);
      } catch {
        /* deterministic memo remains the source of truth */
      }
    }

    return NextResponse.json(result);
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Analysis failed.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
