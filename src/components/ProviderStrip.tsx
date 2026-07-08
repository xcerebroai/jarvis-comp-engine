/**
 * ProviderStrip — a live terminal-style status bar summarizing how data is
 * sourced right now. Clicking it opens the provider settings page.
 */
'use client';

import Link from 'next/link';
import type { ProviderStatus } from '@/lib/types';
import { StatusPill } from './ui';

const IS_PAGES = process.env.NEXT_PUBLIC_GITHUB_PAGES === 'true';

export function ProviderStrip({ status }: { status: ProviderStatus }) {
  const mock = status.mockProviderEnabled;
  const real = status.providers.filter((p) => p.type !== 'mock');
  const active = real.filter((p) => p.active).map((p) => p.name.replace(/ (Provider|Data)$/, ''));

  return (
    <Link
      href="/settings/providers"
      className="group flex flex-wrap items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-2.5 backdrop-blur-sm transition hover:border-cyan-400/30"
      title="Open provider settings"
    >
      {IS_PAGES ? (
        <>
          <StatusPill label="Provider Mode" value="GitHub Pages Demo" tone="amber" />
          <StatusPill label="Data Source" value="Mock Data Only" tone="amber" />
          <StatusPill label="Data Confidence" value="Testing Only" tone="red" />
        </>
      ) : (
        <>
          <StatusPill label="Provider Mode" value={mock ? 'Mock Data' : 'Real Data'} tone={mock ? 'amber' : 'emerald'} />
          {mock ? (
            <StatusPill
              label="Real Providers"
              value={status.realProvidersConfigured ? 'Configured (inactive)' : 'Not Configured'}
              tone="slate"
            />
          ) : (
            <StatusPill label="Active" value={active.length ? active.join(', ') : 'None'} tone={active.length ? 'emerald' : 'red'} />
          )}
          <StatusPill label="Data Confidence" value={mock ? 'Testing Only' : 'Live'} tone={mock ? 'red' : 'cyan'} />
        </>
      )}
      <StatusPill label="No-Scraping Boundary" value="Active" tone="emerald" />
      <span className="ml-auto hidden text-xs font-medium text-cyan-300/70 transition group-hover:text-cyan-300 sm:block">
        Provider Status →
      </span>
    </Link>
  );
}
