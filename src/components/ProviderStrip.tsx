import Link from 'next/link';
import type { ProviderStatus } from '@/lib/types';
import { StatusPill } from './ui';

export function ProviderStrip({ status }: { status: ProviderStatus }) {
  const active = [...new Set(status.providers.filter((p) => p.active && p.type !== 'mock').map((p) => p.name.split(' ')[0]))];
  if (!active.length) return null;
  return (
    <Link href="/settings/providers" className="group flex flex-wrap items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-2.5 backdrop-blur-sm transition hover:border-blue-400/30" title="View data sources">
      <StatusPill label="Property data" value={active.join(', ')} tone="emerald" />
      <span className="ml-auto text-xs font-medium text-blue-300/70 transition group-hover:text-blue-300">Data sources →</span>
    </Link>
  );
}
