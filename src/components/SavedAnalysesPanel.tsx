/**
 * Saved analyses — a compact portfolio panel of locally-saved analyses the user
 * can reopen or delete. Data comes from localStorage via lib/savedAnalyses.
 */
'use client';

import type { SavedAnalysis } from '@/lib/savedAnalyses';
import { RISK_TONE, STRATEGY_LABEL, money } from '@/lib/labels';
import { ArchiveIcon } from './icons';
import { Badge, Section } from './ui';

export function SavedAnalysesPanel({
  items,
  onReopen,
  onDelete,
}: {
  items: SavedAnalysis[];
  onReopen: (item: SavedAnalysis) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <Section
      icon={<ArchiveIcon />}
      tone="violet"
      title="Saved Analyses"
      subtitle={`${items.length} saved locally on this device.`}
    >
      <div className="space-y-2">
        {items.map(({ summary: s }) => (
          <div key={s.id} className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.02] p-3">
            <button type="button" onClick={() => onReopen(items.find((i) => i.summary.id === s.id)!)} className="min-w-0 flex-1 text-left">
              <div className="flex items-center gap-2">
                <span className="truncate text-sm font-medium text-slate-100">{s.address}</span>
                {s.usedMockProvider ? (
                  <Badge className="border-red-400/30 bg-red-400/10 text-red-300">mock</Badge>
                ) : (
                  <Badge className="border-emerald-400/30 bg-emerald-400/10 text-emerald-300">real</Badge>
                )}
              </div>
              <div className="mt-0.5 flex flex-wrap gap-x-3 text-xs text-slate-400">
                <span>ARV {money(s.conservativeArv)}</span>
                <span>repairs {money(s.repairEstimate)}</span>
                <span>{STRATEGY_LABEL[s.recommendedStrategy]}</span>
                <span>conf {s.confidenceScore}/100</span>
                <span className="text-slate-500">{new Date(s.createdAt).toLocaleDateString()}</span>
              </div>
            </button>
            <Badge className={RISK_TONE[s.riskLevel]}>{s.riskLevel.replace('_', ' ')}</Badge>
            <button
              type="button"
              onClick={() => onDelete(s.id)}
              className="shrink-0 rounded-md border border-white/10 px-2 py-1 text-xs text-slate-400 transition hover:border-red-400/40 hover:text-red-300"
              aria-label={`Delete saved analysis for ${s.address}`}
            >
              Delete
            </button>
          </div>
        ))}
      </div>
    </Section>
  );
}
