/**
 * DealWorkbench — top-level client container / command center. Holds the intake
 * input, calls the server analysis route, renders results, manages the local
 * saved-analysis history, and the first-visit onboarding.
 */
'use client';

import Link from 'next/link';
import { useEffect, useState, useSyncExternalStore } from 'react';
import type { AnalysisInput, AnalysisResult, ProviderStatus } from '@/lib/types';
import {
  addSaved,
  getSavedSnapshot,
  getServerSavedSnapshot,
  removeSaved,
  subscribeSaved,
  type SavedAnalysis,
} from '@/lib/savedAnalyses';
import {
  dismissOnboarding,
  getOnboardingSnapshot,
  getServerOnboardingSnapshot,
  subscribeOnboarding,
} from '@/lib/onboarding';
import { ArchiveIcon, HelpIcon, PlugIcon, ShieldIcon, SparkIcon, WarningIcon } from './icons';
import { GlowIcon, StatusPill, WarningBanner } from './ui';
import { IntakeForm } from './IntakeForm';
import { OnboardingModal } from './OnboardingModal';
import { ProviderStrip } from './ProviderStrip';
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

// GitHub Pages static demo: no server, run analysis in-browser on the mock.
const IS_PAGES = process.env.NEXT_PUBLIC_GITHUB_PAGES === 'true';

export function DealWorkbench({ providerStatus }: { providerStatus: ProviderStatus }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [savedId, setSavedId] = useState<string | null>(null);
  const [helpOpen, setHelpOpen] = useState(false);
  // Persistence: SQLite via the server API in real mode; localStorage only in
  // the static Pages demo (which has no server).
  const [serverSaved, setServerSaved] = useState<SavedAnalysis[]>([]);
  const localSaved = useSyncExternalStore(subscribeSaved, getSavedSnapshot, getServerSavedSnapshot);
  const saved = IS_PAGES ? localSaved : serverSaved;
  const onboardingDismissed = useSyncExternalStore(
    subscribeOnboarding,
    getOnboardingSnapshot,
    getServerOnboardingSnapshot,
  );

  const mock = providerStatus.mockProviderEnabled;

  useEffect(() => {
    if (IS_PAGES) return;
    let alive = true;
    fetch('/api/analyses')
      .then((r) => (r.ok ? r.json() : { items: [] }))
      .then((d) => {
        if (alive) setServerSaved(d.items ?? []);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  async function analyze(input: AnalysisInput) {
    setLoading(true);
    setError(null);
    setSavedId(null);
    try {
      let data: AnalysisResult;
      if (IS_PAGES) {
        // Static demo: run the exact same pure pipeline client-side (mock only).
        const { runClientMockAnalysis } = await import('@/lib/analysis/runClientMockAnalysis');
        data = await runClientMockAnalysis(input);
      } else {
        const res = await fetch('/api/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(input),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json?.error ?? 'Analysis failed.');
        data = json as AnalysisResult;
      }
      setResult(data);
      scrollToResults();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong.');
      setResult(null);
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    if (!result) return;
    const id = newId();
    const createdAt = new Date().toISOString();
    if (IS_PAGES) {
      addSaved(result, id, createdAt);
    } else {
      const res = await fetch('/api/analyses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, createdAt, result }),
      });
      if (!res.ok) return;
      const list = await fetch('/api/analyses').then((r) => r.json());
      setServerSaved(list.items ?? []);
    }
    setSavedId(id);
  }

  function handleReopen(item: SavedAnalysis) {
    setResult(item.result);
    setSavedId(item.summary.id);
    setError(null);
    scrollToResults();
  }

  async function handleDelete(id: string) {
    if (IS_PAGES) {
      removeSaved(id);
    } else {
      await fetch(`/api/analyses/${id}`, { method: 'DELETE' });
      setServerSaved((prev) => prev.filter((s) => s.summary.id !== id));
    }
    if (savedId === id) setSavedId(null);
  }

  function closeOnboarding() {
    dismissOnboarding();
    setHelpOpen(false);
  }

  return (
    <div className="min-h-screen text-slate-100">
      {/* Hero / command header */}
      <header className="border-b border-white/5">
        <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-4">
              <GlowIcon icon={<SparkIcon />} tone="blue" />
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-slate-50 text-glow sm:text-3xl">
                  Jarvis Comp Engine
                </h1>
                <p className="label-term mt-1 text-blue-300/80">Autopilot Acquisition Analyst</p>
                <p className="mt-2 max-w-2xl text-sm text-slate-400">
                  Analyze single-family deals using provider data, conservative comp logic, repair
                  estimates, and strategy-specific offer engines.
                </p>
              </div>
            </div>
            <div className="flex shrink-0 gap-2">
              <button
                type="button"
                onClick={() => setHelpOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-xl border border-white/15 bg-white/[0.03] px-2.5 py-1.5 text-xs font-medium text-slate-200 transition hover:border-blue-400/40 hover:text-blue-200 sm:px-3"
                aria-label="How it works"
              >
                <HelpIcon className="h-4 w-4" /> <span className="hidden sm:inline">How it works</span>
              </button>
              <Link
                href="/settings/providers"
                className="inline-flex items-center gap-1.5 rounded-xl border border-white/15 bg-white/[0.03] px-2.5 py-1.5 text-xs font-medium text-slate-200 transition hover:border-violet-400/40 hover:text-violet-200 sm:px-3"
                aria-label="Provider Settings"
              >
                <PlugIcon className="h-4 w-4" /> <span className="hidden sm:inline">Provider Settings</span>
              </Link>
            </div>
          </div>

          {/* Status pills */}
          <div className="mt-6 flex flex-wrap gap-2">
            <StatusPill label="Provider Mode" value={mock ? 'Mock Data' : 'Real Data'} tone={mock ? 'amber' : 'emerald'} />
            <StatusPill label="Data Confidence" value={mock ? 'Testing Only' : 'Live'} tone={mock ? 'red' : 'blue'} />
            <StatusPill label="Saved Analyses" value={String(saved.length)} tone="violet" />
            <StatusPill label="No-Scraping Boundary" value="Active" tone="emerald" />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
        {IS_PAGES && (
          <div className="mb-4">
            <WarningBanner tone="amber" icon={<WarningIcon className="h-5 w-5" />} title="Static Public Demo — Mock Data Only">
              This hosted version runs fully in your browser using simulated property and comparable
              data. Nothing here reflects a real market.{' '}
              <span className="font-semibold">Do not use these numbers for real offers.</span>
            </WarningBanner>
          </div>
        )}

        <div className="mb-4">
          <ProviderStrip status={providerStatus} />
        </div>

        <IntakeForm loading={loading} onAnalyze={analyze} />

        {saved.length > 0 && (
          <div className="mt-6">
            <SavedAnalysesPanel items={saved} onReopen={handleReopen} onDelete={handleDelete} />
          </div>
        )}

        {error && (
          <div className="mt-4 flex items-start gap-3 rounded-2xl border border-red-400/40 bg-red-500/10 p-4 text-sm text-red-200 glow-red">
            <ShieldIcon className="mt-0.5 h-5 w-5 shrink-0" />
            <div>
              <p className="font-semibold">Analysis could not complete</p>
              <p className="mt-0.5 opacity-90">{error}</p>
            </div>
          </div>
        )}

        {loading && (
          <div
            className="glow-border mt-6 flex items-center justify-center gap-3 rounded-2xl bg-white/[0.025] px-4 py-5 text-sm text-blue-200/90"
            role="status"
            aria-live="polite"
          >
            <span className="spinner h-4 w-4 shrink-0 rounded-full border-2 border-blue-400/30 border-t-blue-300" />
            <span>
              <span className="font-semibold text-blue-100">Running acquisition analysis</span>
              <span className="hidden sm:inline"> — comps, ARV, repairs, risk, confidence, and all offer strategies.</span>
            </span>
          </div>
        )}

        {result && (
          <div id="results" className="mt-8 scroll-mt-6">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <ArchiveIcon className="h-4 w-4 text-blue-300" />
                <h2 className="label-term text-slate-300">Acquisition Analysis</h2>
              </div>
              <button
                type="button"
                onClick={handleSave}
                disabled={savedId != null}
                className="shrink-0 rounded-xl border border-blue-400/40 bg-blue-400/10 px-3 py-1.5 text-xs font-semibold text-blue-200 transition hover:bg-blue-400/20 disabled:cursor-default disabled:border-emerald-400/40 disabled:bg-emerald-400/10 disabled:text-emerald-300"
              >
                {savedId != null ? 'Saved ✓' : 'Save Analysis'}
              </button>
            </div>
            <ResultsDashboard result={result} />
          </div>
        )}
      </main>

      <footer className="mx-auto max-w-6xl px-4 py-8 text-center text-xs text-slate-500 sm:px-6">
        Conservative by design. No scraping — data comes from licensed providers or the mock provider. Not
        financial, legal, tax, or investment advice.
      </footer>

      <OnboardingModal
        open={helpOpen || !onboardingDismissed}
        onStart={closeOnboarding}
        onDismiss={closeOnboarding}
        onClose={closeOnboarding}
      />

      {/* Floating help button (mobile + always available) */}
      <button
        type="button"
        onClick={() => setHelpOpen(true)}
        className="glow-blue fixed right-4 bottom-4 z-40 inline-flex h-11 w-11 items-center justify-center rounded-full border border-blue-400/40 bg-[#0F172A]/90 text-blue-200 backdrop-blur transition hover:bg-blue-400/20"
        aria-label="How it works"
        title="How it works"
      >
        <HelpIcon className="h-5 w-5" />
      </button>
    </div>
  );
}
