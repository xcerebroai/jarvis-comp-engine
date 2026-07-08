/**
 * Provider settings — server component. Reads the live environment (mock flag +
 * licensed keys) and shows the current mode plus a status card per provider.
 * Read-only: providers are configured via environment variables, not here.
 */
import Link from 'next/link';
import { getProviderStatus } from '@/lib/data-providers/providerStatus';
import { getProviderCards } from '@/lib/data-providers/providerCatalog';

export const dynamic = 'force-dynamic'; // always reflect current env

function YesNo({ value }: { value: boolean }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold ${
        value
          ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
          : 'border-slate-200 bg-slate-50 text-slate-500'
      }`}
    >
      {value ? 'Yes' : 'No'}
    </span>
  );
}

export default function ProviderSettingsPage() {
  const status = getProviderStatus();
  const cards = getProviderCards();

  const mode = status.mockProviderEnabled ? 'Mock Data (testing)' : 'Real Provider Mode';

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-4xl px-4 py-5 sm:px-6">
          <Link href="/" className="text-xs font-medium text-indigo-600 hover:text-indigo-700">
            ← Back to analyzer
          </Link>
          <h1 className="mt-1 text-lg font-bold text-slate-900">Provider Settings</h1>
          <p className="text-sm text-slate-500">
            Data sourcing configuration. This app never scrapes restricted sites — real data
            requires licensed provider keys set as environment variables.
          </p>
        </div>
      </header>

      <main className="mx-auto max-w-4xl space-y-4 px-4 py-6 sm:px-6">
        {/* Mode summary */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <div className="text-[11px] font-medium tracking-wide text-slate-400 uppercase">Provider Mode</div>
              <div className="text-base font-bold text-slate-900">{mode}</div>
            </div>
            <div>
              <div className="text-[11px] font-medium tracking-wide text-slate-400 uppercase">Mock Enabled</div>
              <div className="mt-0.5"><YesNo value={status.mockProviderEnabled} /></div>
            </div>
            <div>
              <div className="text-[11px] font-medium tracking-wide text-slate-400 uppercase">Real Providers Configured</div>
              <div className="mt-0.5"><YesNo value={status.realProvidersConfigured} /></div>
            </div>
          </div>
          {status.globalWarnings.length > 0 && (
            <ul className="mt-4 space-y-1 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
              {status.globalWarnings.map((w, i) => (
                <li key={i}>⚠︎ {w}</li>
              ))}
            </ul>
          )}
        </div>

        {/* Provider cards */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {cards.map((c) => (
            <div key={`${c.type}-${c.name}`} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h2 className="text-sm font-bold text-slate-900">{c.name}</h2>
                  <div className="text-xs text-slate-500">{c.type}</div>
                </div>
                <div className="flex shrink-0 gap-1.5">
                  {c.active && (
                    <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                      active
                    </span>
                  )}
                  <span
                    className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold ${
                      c.configured
                        ? 'border-sky-200 bg-sky-50 text-sky-700'
                        : 'border-slate-200 bg-slate-50 text-slate-500'
                    }`}
                  >
                    {c.configured ? 'configured' : 'not configured'}
                  </span>
                </div>
              </div>

              <dl className="mt-3 space-y-2 text-sm">
                <div className="flex justify-between gap-2">
                  <dt className="text-slate-500">Configured</dt>
                  <dd><YesNo value={c.configured} /></dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-slate-500">Active</dt>
                  <dd><YesNo value={c.active} /></dd>
                </div>
              </dl>

              <div className="mt-3">
                <div className="text-[11px] font-medium tracking-wide text-slate-400 uppercase">Required env</div>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {c.requiredEnv.map((e) => (
                    <code key={e} className="rounded bg-slate-100 px-1.5 py-0.5 text-[11px] text-slate-700">{e}</code>
                  ))}
                  {c.optionalEnv.map((e) => (
                    <code key={e} className="rounded bg-slate-50 px-1.5 py-0.5 text-[11px] text-slate-400">{e} (optional)</code>
                  ))}
                </div>
              </div>

              <div className="mt-3">
                <div className="text-[11px] font-medium tracking-wide text-slate-400 uppercase">Supplies</div>
                <ul className="mt-1 space-y-0.5 text-sm text-slate-600">
                  {c.supplies.map((s) => (
                    <li key={s}>• {s}</li>
                  ))}
                </ul>
              </div>

              {c.warnings.length > 0 && (
                <ul className="mt-3 space-y-0.5 text-xs text-amber-700">
                  {c.warnings.map((w, i) => (
                    <li key={i}>⚠︎ {w}</li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>

        <p className="px-1 text-xs text-slate-400">
          To activate a real provider, set its environment variables (see docs/providers/PROVIDER_SETUP.md)
          and set JARVIS_USE_MOCK_PROVIDER=false, then restart the server. External valuations are supporting
          context only — the conservative ARV engine always makes the final valuation recommendation.
        </p>
      </main>
    </div>
  );
}
