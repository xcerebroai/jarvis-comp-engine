/**
 * Client-safe analysis entry point for the static GitHub Pages demo.
 *
 * It reuses the EXACT same pure pipeline as the server route
 * (runPropertyAnalysis) — no duplicated business logic — but pins the provider
 * bundle to the deterministic mock. This runs entirely in the browser:
 *  - mock provider only (never a licensed adapter)
 *  - no network calls
 *  - no secrets, no server-only environment variables
 *
 * The result shape is identical to what POST /api/analyze returns, so the UI,
 * mock warnings, source audit, saved history, and deal memo all work unchanged.
 */
import { createMockBundle } from '@/lib/data-providers/mockProvider';
import type { AnalysisInput, AnalysisResult } from '@/lib/types';
import { runPropertyAnalysis } from './runPropertyAnalysis';

export async function runClientMockAnalysis(input: AnalysisInput): Promise<AnalysisResult> {
  return runPropertyAnalysis(input, { providers: createMockBundle() });
}
