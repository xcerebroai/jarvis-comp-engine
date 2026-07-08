/**
 * ProviderStrip — a compact banner near the top of the dashboard summarizing
 * how data is being sourced right now (mock vs. real, which providers active).
 */
'use client';

import type { ProviderStatus } from '@/lib/types';

function Item({ label, value, tone = 'slate' }: { label: string; value: string; tone?: 'slate' | 'red' | 'emerald' }) {
  const toneClass =
    tone === 'red' ? 'text-red-700' : tone === 'emerald' ? 'text-emerald-700' : 'text-slate-700';
  return (
    <div>
      <span className="text-[11px] font-medium tracking-wide text-slate-400 uppercase">{label}: </span>
      <span className={`text-xs font-semibold ${toneClass}`}>{value}</span>
    </div>
  );
}

export function ProviderStrip({ status }: { status: ProviderStatus }) {
  const mock = status.mockProviderEnabled;
  const real = status.providers.filter((p) => p.type !== 'mock');
  const active = real.filter((p) => p.active).map((p) => p.name);
  const missing = real.filter((p) => !p.configured).map((p) => p.name);

  const wrap = mock
    ? 'border-red-200 bg-red-50'
    : status.realProvidersConfigured
      ? 'border-emerald-200 bg-emerald-50'
      : 'border-amber-200 bg-amber-50';

  return (
    <div className={`flex flex-wrap items-center gap-x-6 gap-y-1.5 rounded-xl border px-4 py-2.5 ${wrap}`}>
      <Item label="Provider Mode" value={mock ? 'Mock Data' : 'Real Data'} tone={mock ? 'red' : 'emerald'} />
      {mock ? (
        <>
          <Item label="Real Providers" value={status.realProvidersConfigured ? 'Configured (inactive in mock mode)' : 'Not Configured'} />
          <Item label="Data Confidence" value="Testing Only" tone="red" />
        </>
      ) : (
        <>
          <Item label="Active Providers" value={active.length ? active.join(', ') : 'None'} tone={active.length ? 'emerald' : 'red'} />
          <Item label="Missing Providers" value={missing.length ? missing.join(', ') : 'None'} />
        </>
      )}
    </div>
  );
}
