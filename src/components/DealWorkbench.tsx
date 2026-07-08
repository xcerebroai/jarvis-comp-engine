/**
 * DealWorkbench — top-level client container. Holds the intake input, calls the
 * server analysis route, and renders the results dashboard beneath the form.
 */
'use client';

import { useState } from 'react';
import type { AnalysisInput, AnalysisResult } from '@/lib/types';
import { IntakeForm } from './IntakeForm';
import { ResultsDashboard } from './ResultsDashboard';

export function DealWorkbench() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AnalysisResult | null>(null);

  async function analyze(input: AnalysisInput) {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? 'Analysis failed.');
      setResult(data as AnalysisResult);
      // Scroll results into view on the next paint.
      requestAnimationFrame(() => {
        document.getElementById('results')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong.');
      setResult(null);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-5xl px-4 py-5 sm:px-6">
          <h1 className="text-lg font-bold text-slate-900">Jarvis Comp Engine</h1>
          <p className="text-sm text-slate-500">Autopilot acquisition analyst — enter an address and repairs, get every offer.</p>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-6 sm:px-6">
        <IntakeForm loading={loading} onAnalyze={analyze} />

        {error && (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>
        )}

        {loading && (
          <div className="mt-6 text-center text-sm text-slate-500">Running the analysis pipeline…</div>
        )}

        {result && (
          <div id="results" className="mt-8 scroll-mt-6">
            <h2 className="mb-3 text-sm font-semibold tracking-wide text-slate-500 uppercase">Analysis Results</h2>
            <ResultsDashboard result={result} />
          </div>
        )}
      </main>

      <footer className="mx-auto max-w-5xl px-4 py-8 text-center text-xs text-slate-400 sm:px-6">
        Conservative by design. No scraping — data comes from licensed providers or the mock provider. Not financial advice.
      </footer>
    </div>
  );
}
