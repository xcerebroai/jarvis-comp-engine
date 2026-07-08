/**
 * DealWorkbench — top-level client container. Holds the intake input, calls the
 * server analysis route, renders the results dashboard, and manages the local
 * saved-analysis history (save / reopen / delete).
 */
'use client';

import { useState, useSyncExternalStore } from 'react';
import type { AnalysisInput, AnalysisResult } from '@/lib/types';
import {
  addSaved,
  getSavedSnapshot,
  getServerSavedSnapshot,
  removeSaved,
  subscribeSaved,
  type SavedAnalysis,
} from '@/lib/savedAnalyses';
import { IntakeForm } from './IntakeForm';
import { ResultsDashboard } from './ResultsDashboard';
import { SavedAnalysesPanel } from './SavedAnalysesPanel';

function newId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return `id-${Date.now()}-${Math.round(Math.random() * 1e6)}`;
}

function scrollToResults() {
  requestAnimationFrame(() => {
    document.getElementById('results')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
}

export function DealWorkbench() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [savedId, setSavedId] = useState<string | null>(null);
  const saved = useSyncExternalStore(subscribeSaved, getSavedSnapshot, getServerSavedSnapshot);

  async function analyze(input: AnalysisInput) {
    setLoading(true);
    setError(null);
    setSavedId(null);
    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? 'Analysis failed.');
      setResult(data as AnalysisResult);
      scrollToResults();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong.');
      setResult(null);
    } finally {
      setLoading(false);
    }
  }

  function handleSave() {
    if (!result) return;
    const id = newId();
    addSaved(result, id, new Date().toISOString());
    setSavedId(id);
  }

  function handleReopen(item: SavedAnalysis) {
    setResult(item.result);
    setSavedId(item.summary.id);
    setError(null);
    scrollToResults();
  }

  function handleDelete(id: string) {
    removeSaved(id);
    if (savedId === id) setSavedId(null);
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

        {saved.length > 0 && (
          <div className="mt-6">
            <SavedAnalysesPanel items={saved} onReopen={handleReopen} onDelete={handleDelete} />
          </div>
        )}

        {error && (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>
        )}

        {loading && (
          <div className="mt-6 text-center text-sm text-slate-500">Running the analysis pipeline…</div>
        )}

        {result && (
          <div id="results" className="mt-8 scroll-mt-6">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h2 className="text-sm font-semibold tracking-wide text-slate-500 uppercase">Analysis Results</h2>
              <button
                type="button"
                onClick={handleSave}
                disabled={savedId != null}
                className="shrink-0 rounded-lg border border-indigo-300 bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-700 transition hover:bg-indigo-100 disabled:cursor-default disabled:border-emerald-200 disabled:bg-emerald-50 disabled:text-emerald-700"
              >
                {savedId != null ? 'Saved ✓' : 'Save analysis'}
              </button>
            </div>
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
