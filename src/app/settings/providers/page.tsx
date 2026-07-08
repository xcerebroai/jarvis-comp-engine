/**
 * Provider settings — server component. Reads the live environment (mock flag +
 * licensed keys) and shows the current mode plus a status card per provider.
 * Read-only: providers are configured via environment variables, not here.
 */
import Link from 'next/link';
import { getProviderStatus } from '@/lib/data-providers/providerStatus';
import { getProviderCards } from '@/lib/data-providers/providerCatalog';
import { ArrowRightIcon, PlugIcon } from '@/components/icons';

// Prerendered at build time (reflects build-time env); compatible with the
// GitHub Pages static export.
export const dynamic = 'force-static';

function YesNo({ value }: { value: boolean }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold ${
        value
          ? 'border-emerald-400/30 bg-emerald-400/10 text-emerald-300'
          : 'border-white/10 bg-white/5 text-slate-400'
      }`}
    >
      {value ? 'Yes' : 'No'}
    </span>
  );
}

// Inlined at build time; true only in the GitHub Pages static demo.
const IS_PAGES = process.env.NEXT_PUBLIC_GITHUB_PAGES === 'true';

export default function ProviderSettingsPage() {
  const status = getProviderStatus();
  const cards = getProviderCards();
  const mode = IS_PAGES
    ? 'GitHub Pages Demo (mock data only)'
    : status.mockProviderEnabled
      ? 'Mock Data (testing)'
      : 'Real Provider Mode';

  return (
    <div className="min-h-screen text-slate-100">
      <header className="border-b border-white/5">
        <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6">
          <Link href="/" className="inline-flex items-center gap-1.5 text-xs font-medium text-cyan-300 transition hover:text-cyan-200">
            <ArrowRightIcon className="h-3.5 w-3.5 rotate-180" /> Back to analyzer
          </Link>
          <div className="mt-2 flex items-center gap-3">
            <span className="glow-cyan inline-flex h-10 w-10 items-center justify-center rounded-xl border border-cyan-400/30 bg-white/[0.03] text-cyan-300">
              <PlugIcon className="h-5 w-5" />
            </span>
            <div>
              <h1 className="text-lg font-bold text-slate-50">Provider Settings</h1>
              <p className="label-term text-cyan-300/80">Data Sourcing Configuration</p>
            </div>
          </div>
          <p className="mt-3 max-w-2xl text-sm text-slate-400">
            Jarvis Comp Engine does not scrape restricted websites. Automated property data requires
            legal/licensed provider access. Providers are configured via environment variables.
          </p>
        </div>
      </header>

      <main className="mx-auto max-w-4xl space-y-4 px-4 py-6 sm:px-6">
        {IS_PAGES && (
          <div className="rounded-2xl border border-amber-400/40 bg-amber-500/10 p-4 text-sm text-amber-200 glow-amber">
            <p className="font-bold">Static Public Demo</p>
            <p className="mt-1 opacity-90">
              GitHub Pages is static hosting — it cannot hold API keys or run licensed providers, so
              every provider below stays unconfigured and all analysis data is mock. Real provider
              activation requires a backend/server deployment.
            </p>
          </div>
        )}

        {/* Mode summary */}
        <div className="glow-border rounded-2xl bg-white/[0.025] p-5 backdrop-blur-sm">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <div className="label-term">Provider Mode</div>
              <div className="text-base font-bold text-slate-50">{mode}</div>
            </div>
            <div>
              <div className="label-term">Mock Enabled</div>
              <div className="mt-0.5"><YesNo value={status.mockProviderEnabled} /></div>
            </div>
            <div>
              <div className="label-term">Real Providers Configured</div>
              <div className="mt-0.5"><YesNo value={status.realProvidersConfigured} /></div>
            </div>
          </div>
          {status.globalWarnings.length > 0 && (
            <ul className="mt-4 space-y-1 rounded-xl border border-amber-400/30 bg-amber-500/10 p-3 text-sm text-amber-200">
              {status.globalWarnings.map((w, i) => (
                <li key={i}>⚠︎ {w}</li>
              ))}
            </ul>
          )}
        </div>

        {/* Provider cards */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {cards.map((c) => {
            const accent = c.active
              ? 'border-emerald-400/30 glow-emerald'
              : c.configured
                ? 'border-cyan-400/25'
                : 'border-white/10';
            return (
              <div key={`${c.type}-${c.name}`} className={`rounded-2xl border bg-white/[0.025] p-5 backdrop-blur-sm ${accent}`}>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h2 className="text-sm font-bold text-slate-50">{c.name}</h2>
                    <div className="label-term">{c.type}</div>
                  </div>
                  <div className="flex shrink-0 gap-1.5">
                    {c.active && (
                      <span className="inline-flex items-center rounded-full border border-emerald-400/30 bg-emerald-400/10 px-2 py-0.5 text-[11px] font-semibold text-emerald-300">
                        active
                      </span>
                    )}
                    <span
                      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold ${
                        c.configured
                          ? 'border-cyan-400/30 bg-cyan-400/10 text-cyan-300'
                          : 'border-white/10 bg-white/5 text-slate-400'
                      }`}
                    >
                      {c.configured ? 'configured' : 'not configured'}
                    </span>
                  </div>
                </div>

                <dl className="mt-3 space-y-2 text-sm">
                  <div className="flex justify-between gap-2">
                    <dt className="text-slate-400">Configured</dt>
                    <dd><YesNo value={c.configured} /></dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt className="text-slate-400">Active</dt>
                    <dd><YesNo value={c.active} /></dd>
                  </div>
                </dl>

                <div className="mt-3">
                  <div className="label-term">Required env</div>
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    {c.requiredEnv.map((e) => (
                      <code key={e} className="rounded bg-white/5 px-1.5 py-0.5 text-[11px] text-cyan-200/90">{e}</code>
                    ))}
                    {c.optionalEnv.map((e) => (
                      <code key={e} className="rounded bg-white/[0.03] px-1.5 py-0.5 text-[11px] text-slate-500">{e} (optional)</code>
                    ))}
                  </div>
                </div>

                <div className="mt-3">
                  <div className="label-term">Supplies</div>
                  <ul className="mt-1 space-y-0.5 text-sm text-slate-300">
                    {c.supplies.map((s) => (
                      <li key={s}>• {s}</li>
                    ))}
                  </ul>
                </div>

                {c.warnings.length > 0 && (
                  <ul className="mt-3 space-y-0.5 text-xs text-amber-300/90">
                    {c.warnings.map((w, i) => (
                      <li key={i}>⚠︎ {w}</li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })}
        </div>

        <p className="px-1 text-xs text-slate-500">
          To activate a provider, set its environment variables (see docs/providers/PROVIDER_SETUP.md)
          and restart the server. There is no sample mode — real data or an honest error. External valuations are supporting
          context only — the conservative ARV engine always makes the final valuation recommendation.
        </p>
      </main>
    </div>
  );
}
