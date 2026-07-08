/**
 * Results dashboard — the acquisition command center output: summary metrics,
 * property snapshot, repairs, conservative ARV, comps, offer options,
 * recommended strategy, data sources, and the deal memo. (Styling only — the
 * data and warnings are unchanged.)
 */
'use client';

import { useState } from 'react';
import type {
  AnalysisResult,
  CompDisposition,
  GradedComp,
  OfferResult,
} from '@/lib/types';
import {
  REHAB_LEVEL_LABEL,
  REPAIR_CATEGORY_LABEL,
  RISK_TONE,
  RISK_TONE_ACCENT,
  STRATEGY_LABEL,
  confidenceWord,
  money,
} from '@/lib/labels';
import {
  ChartIcon,
  DatabaseIcon,
  DollarIcon,
  LocationIcon,
  ShieldIcon,
  TargetIcon,
  ToolsIcon,
  WarningIcon,
} from './icons';
import { Badge, Card, CommandCard, MetricCard, ScoreBar, Section, Stat, WarningBanner } from './ui';

const confTone = (s: number) => (s >= 70 ? 'emerald' : s >= 45 ? 'amber' : 'red');

const DISPOSITION_TONE: Record<CompDisposition, string> = {
  qualified: 'text-emerald-300 bg-emerald-400/10 border-emerald-400/30',
  support: 'text-cyan-300 bg-cyan-400/10 border-cyan-400/30',
  penalized: 'text-amber-300 bg-amber-400/10 border-amber-400/30',
  rejected: 'text-slate-400 bg-white/5 border-white/10',
};

// Inlined at build time; true only in the GitHub Pages static demo.
const IS_PAGES = process.env.NEXT_PUBLIC_GITHUB_PAGES === 'true';

function MockBanner() {
  return (
    <WarningBanner
      tone="red"
      icon={<WarningIcon className="h-5 w-5" />}
      title={IS_PAGES ? 'Mock Data — Static Public Demo' : 'Mock Data Mode'}
    >
      {IS_PAGES
        ? 'This is a static public demo using mock data only — every property, comp, and dollar figure below is simulated. '
        : 'This analysis is using simulated property/comparable data for testing. '}
      <span className="font-semibold">Do not use this valuation for real offers.</span>
    </WarningBanner>
  );
}

export function ResultsDashboard({ result }: { result: AnalysisResult }) {
  const { subject, arv, repairEstimate, comps, offers, risk, confidence, recommendation, memo } = result;
  const f = subject.facts;

  const qualified = comps.filter((c) => c.disposition === 'qualified');
  const support = comps.filter((c) => c.disposition === 'support');
  const rejected = comps.filter((c) => c.disposition === 'rejected' || c.disposition === 'penalized');
  const sortedComps = [...comps].sort((a, b) => b.score - a.score);

  return (
    <div className="space-y-4">
      {/* Top-level mock-data warning */}
      {result.usedMockProvider && <MockBanner />}

      {/* Warnings banner */}
      {result.warnings.length > 0 && (
        <Card className="border-amber-400/30 bg-amber-500/[0.06] p-4">
          <ul className="space-y-1 text-sm text-amber-200/90">
            {result.warnings.map((w, i) => (
              <li key={i}>⚠︎ {w}</li>
            ))}
          </ul>
        </Card>
      )}

      {/* Summary metric cards — 2-up on phones, 3-up on tablets, 6-up only on wide desktop. */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
        <MetricCard label="Conservative ARV" value={money(arv.conservative)} tone="emerald" icon={<ShieldIcon />} />
        <MetricCard label="Repair Estimate" value={money(repairEstimate.recommended)} tone="violet" icon={<ToolsIcon />} />
        <MetricCard label="Strategy" value={recommendation.label} tone="cyan" icon={<TargetIcon />} />
        <MetricCard
          label="Risk"
          value={`${risk.level.replace('_', ' ')}`}
          sub={`${risk.score}/100`}
          tone={RISK_TONE_ACCENT[risk.level]}
          icon={<WarningIcon />}
        />
        <MetricCard
          label="Confidence"
          value={`${confidence.score}/100`}
          sub={confidenceWord(confidence.score, result.usedMockProvider)}
          tone={confTone(confidence.score)}
        />
        <MetricCard
          label="Provider Mode"
          value={IS_PAGES ? 'Demo' : result.usedMockProvider ? 'Mock Data' : 'Real Data'}
          sub={IS_PAGES ? 'Mock data only' : result.usedMockProvider ? 'Testing only' : 'Live'}
          tone={result.usedMockProvider ? 'amber' : 'emerald'}
        />
      </div>

      {/* 1 — Property Snapshot */}
      <Section step="01" icon={<LocationIcon />} tone="cyan" title="Property Snapshot">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div className="col-span-2 sm:col-span-4">
            <div className="text-base font-semibold text-slate-50">{result.address.formatted || 'Address unavailable'}</div>
          </div>
          <Stat label="Beds / Baths" value={`${f.beds ?? '?'} / ${f.baths ?? '?'}`} />
          <Stat label="Sqft" value={f.sqft ? f.sqft.toLocaleString() : '?'} />
          <Stat label="Year built" value={f.yearBuilt ?? '?'} />
          <Stat label="Type" value={subject.propertyType.replace('_', ' ')} />
        </div>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {result.dataSources.map((s) => (
            <Badge key={s} className="border-white/10 bg-white/5 text-slate-300">{s.replace(/_/g, ' ')}</Badge>
          ))}
        </div>
      </Section>

      {/* 2 — Repair Summary */}
      <Section step="02" icon={<ToolsIcon />} tone="violet" title="Repair Summary">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Stat label="Rehab level" value={REHAB_LEVEL_LABEL[repairEstimate.rehabLevel]} />
          <Stat label="Low estimate" value={money(repairEstimate.low)} />
          <Stat label="High estimate" value={money(repairEstimate.high)} />
          <Stat label="Recommended" value={money(repairEstimate.recommended)} emphasis />
        </div>
        <div className="mt-3">
          <div className="mb-1 label-term">Repair confidence</div>
          <ScoreBar score={repairEstimate.confidence} tone={confTone(repairEstimate.confidence)} />
        </div>
        {repairEstimate.lineItems.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {repairEstimate.lineItems.map((li) => (
              <Badge key={li.category} className="border-white/10 bg-white/5 text-slate-300">
                {REPAIR_CATEGORY_LABEL[li.category]}: {money(li.recommended)}
              </Badge>
            ))}
          </div>
        )}
        {repairEstimate.warnings.length > 0 && (
          <ul className="mt-3 space-y-1 text-xs text-amber-300/90">
            {repairEstimate.warnings.map((w, i) => <li key={i}>⚠︎ {w}</li>)}
          </ul>
        )}
      </Section>

      {/* Mock warning — directly above the ARV. */}
      {result.usedMockProvider && <MockBanner />}

      {/* 3 — Conservative ARV */}
      <Section step="03" icon={<ShieldIcon />} tone="emerald" title="Conservative ARV">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Stat label="Low" value={money(arv.low)} />
          <Stat label="Median" value={money(arv.median)} />
          <Stat label="High" value={money(arv.high)} />
          <Stat label="Recommended" value={money(arv.conservative)} emphasis />
        </div>
        <div className="mt-3">
          <div className="mb-1 label-term">ARV confidence</div>
          <ScoreBar score={arv.confidence} tone={confTone(arv.confidence)} />
        </div>
        <p className="mt-3 text-sm text-slate-400">{arv.explanation}</p>
        {arv.warnings.length > 0 && (
          <ul className="mt-2 space-y-1 text-xs text-amber-300/90">
            {arv.warnings.map((w, i) => <li key={i}>⚠︎ {w}</li>)}
          </ul>
        )}
      </Section>

      {/* Mock warning — directly above the comp table. */}
      {result.usedMockProvider && <MockBanner />}

      {/* 4 — Comparable Sales */}
      <Section
        step="04"
        icon={<ChartIcon />}
        tone="cyan"
        title="Comparable Sales"
        subtitle={`${qualified.length} qualified · ${support.length} active support · ${rejected.length} penalized/rejected`}
      >
        <div className="space-y-2">
          {sortedComps.map((g) => <CompRow key={g.comp.id} g={g} subjectSqft={f.sqft} />)}
        </div>
      </Section>

      {/* 5 — Offer Options (recommended strategy leads for easy comparison) */}
      <Section
        step="05"
        icon={<TargetIcon />}
        tone="violet"
        title="Offer Options"
        subtitle="All four strategies, priced off the conservative ARV. The recommended strategy is listed first."
      >
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {[offers.fix_and_flip, offers.wholesale, offers.subject_to, offers.creative_finance]
            .sort((a, b) =>
              (a.strategy === recommendation.strategy ? -1 : 0) - (b.strategy === recommendation.strategy ? -1 : 0),
            )
            .map((o) => (
              <OfferCard key={o.strategy} o={o} recommended={o.strategy === recommendation.strategy} />
            ))}
        </div>
      </Section>

      {/* 6 — Recommended Strategy */}
      <Section step="06" icon={<TargetIcon />} tone="emerald" title="Recommended Strategy">
        <div className="flex items-center gap-3">
          <Badge className="border-cyan-400/40 bg-cyan-400/10 text-base font-bold text-cyan-200 glow-cyan">{recommendation.label}</Badge>
        </div>
        <p className="mt-2 text-sm text-slate-300">{recommendation.summary}</p>
        <ul className="mt-3 space-y-1 text-sm text-slate-400">
          {recommendation.rationale.map((r, i) => <li key={i}>• {r}</li>)}
        </ul>
        <div className="mt-4 space-y-1.5">
          {recommendation.ranking.map((r) => (
            <div key={r.strategy} className="flex items-center gap-3">
              <span className="w-32 text-xs text-slate-400">{STRATEGY_LABEL[r.strategy]}</span>
              <div className="flex-1"><ScoreBar score={Math.max(0, Math.min(100, r.score))} /></div>
            </div>
          ))}
        </div>
      </Section>

      {/* 7 — Deal Memo */}
      <DealMemoBlock memo={memo} />

      {/* 8 — Data Sources & Providers */}
      <DataSourcesBlock result={result} />
    </div>
  );
}

function CompRow({ g, subjectSqft }: { g: GradedComp; subjectSqft?: number }) {
  const [open, setOpen] = useState(false);
  const c = g.comp;
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3 transition hover:border-white/20">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center gap-3 text-left"
      >
        <div className="hidden w-24 shrink-0 sm:block">
          <ScoreBar score={g.score} tone={g.score >= 70 ? 'emerald' : g.score >= 45 ? 'amber' : 'red'} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-medium text-slate-200">{c.address.street}</div>
          <div className="text-xs text-slate-500">
            {money(c.price)} · {c.status} · {c.facts.sqft?.toLocaleString() ?? '?'} sqft · {c.distanceMiles} mi
            {subjectSqft && c.facts.sqft ? ` · implies ${money(g.impliedValue)}` : ''}
            <span className="sm:hidden"> · score {g.score}/100</span>
          </div>
        </div>
        <Badge className={DISPOSITION_TONE[g.disposition]}>{g.disposition}</Badge>
        <span
          aria-hidden
          className={`shrink-0 text-xs text-slate-500 transition-transform duration-200 ${open ? 'rotate-90' : ''}`}
        >
          ▸
        </span>
      </button>
      {open && (
        <div className="mt-2 border-t border-white/10 pt-2 text-xs text-slate-400">
          <p>{g.explanation}</p>
          {g.penalties.length > 0 && (
            <ul className="mt-1.5 space-y-0.5">
              {g.penalties.map((p, i) => <li key={i}>− {p.points}: {p.label}</li>)}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

function OfferCard({ o, recommended }: { o: OfferResult; recommended: boolean }) {
  const isHold = o.strategy === 'subject_to' || o.strategy === 'creative_finance';
  return (
    <CommandCard
      tone={recommended ? 'cyan' : 'slate'}
      glow={recommended}
      className={`p-4 ${recommended ? 'border-cyan-400/50' : ''}`}
    >
      <div className="mb-3 flex items-center justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-sm font-bold text-slate-50">{STRATEGY_LABEL[o.strategy]}</h3>
          {recommended && <Badge className="border-cyan-400/50 bg-cyan-400/15 text-cyan-200 glow-cyan">Recommended Strategy</Badge>}
          {!o.viable && <Badge className="border-white/10 bg-white/5 text-slate-400">marginal</Badge>}
        </div>
        <Badge className={RISK_TONE[o.riskLevel]}>{o.riskLevel.replace('_', ' ')}</Badge>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Stat label={isHold ? 'Cash in' : 'Max offer'} value={money(o.maxOffer)} emphasis />
        <Stat label="Safer" value={money(o.saferOffer)} />
        {isHold ? (
          <Stat label="Equity" value={money(o.equity)} />
        ) : (
          <Stat label="Aggressive" value={money(o.aggressiveOffer)} />
        )}
      </div>
      <div className="mt-2 grid grid-cols-3 gap-3">
        {isHold ? (
          <Stat label="Cash flow /mo" value={o.monthlyCashFlow != null ? money(o.monthlyCashFlow) : '—'} />
        ) : (
          <Stat label="Projected profit" value={money(o.projectedProfit)} />
        )}
        <div className="col-span-2">
          <div className="label-term">Confidence</div>
          <ScoreBar score={o.confidence} tone={confTone(o.confidence)} />
        </div>
      </div>

      <p className="mt-3 text-xs text-slate-400">{o.explanation}</p>

      {o.terms && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {Object.entries(o.terms).map(([k, v]) => (
            <Badge key={k} className="border-white/10 bg-white/5 text-slate-300">{k}: {v}</Badge>
          ))}
        </div>
      )}

      {o.redFlags.length > 0 && (
        <ul className="mt-2 space-y-0.5 text-xs text-red-300/90">
          {o.redFlags.map((r, i) => <li key={i}>⚑ {r}</li>)}
        </ul>
      )}

      {o.sellerQuestions.length > 0 && (
        <details className="mt-2">
          <summary className="cursor-pointer text-xs font-medium text-slate-400">Seller questions ({o.sellerQuestions.length})</summary>
          <ul className="mt-1 space-y-0.5 text-xs text-slate-400">
            {o.sellerQuestions.map((q, i) => <li key={i}>? {q}</li>)}
          </ul>
        </details>
      )}
    </CommandCard>
  );
}

function DealMemoBlock({ memo }: { memo: AnalysisResult['memo'] }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(memo.plainText);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard unavailable */
    }
  }
  return (
    <Section
      step="07"
      icon={<DollarIcon />}
      tone="cyan"
      title="Deal Memo"
      right={
        <button
          type="button"
          onClick={copy}
          aria-live="polite"
          className={`shrink-0 rounded-lg border px-3 py-1.5 text-xs font-medium transition ${
            copied
              ? 'border-emerald-400/40 bg-emerald-400/10 text-emerald-300'
              : 'border-white/15 bg-white/[0.03] text-slate-200 hover:border-cyan-400/40 hover:text-cyan-200'
          }`}
        >
          {copied ? 'Copied ✓' : 'Copy memo'}
        </button>
      }
    >
      {IS_PAGES && (
        <p className="mb-3 rounded-lg border border-amber-400/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
          Static public demo — this memo was generated from mock data only and is not usable for a real offer.
        </p>
      )}
      <p className="mb-3 text-sm font-medium text-slate-200">{memo.headline}</p>
      <div className="space-y-3">
        {memo.sections.map((s) => (
          <div key={s.title}>
            <div className="label-term">{s.title}</div>
            <p className="mt-0.5 whitespace-pre-line text-sm text-slate-300">{s.body}</p>
          </div>
        ))}
      </div>
      {memo.redFlags.length > 0 && (
        <div className="mt-4">
          <div className="label-term text-red-300/80">Red Flags</div>
          <ul className="mt-1 space-y-0.5 text-sm text-red-300/90">
            {memo.redFlags.map((r, i) => <li key={i}>⚑ {r}</li>)}
          </ul>
        </div>
      )}
      <div className="mt-4">
        <div className="label-term">Next Questions for the Seller</div>
        <ul className="mt-1 space-y-0.5 text-sm text-slate-300">
          {memo.nextQuestions.map((q, i) => <li key={i}>? {q}</li>)}
        </ul>
      </div>
    </Section>
  );
}

function DataSourcesBlock({ result }: { result: AnalysisResult }) {
  const { providerStatus, sourceAudit } = result;
  return (
    <Section
      step="08"
      icon={<DatabaseIcon />}
      tone="violet"
      title="Data Sources & Providers"
      subtitle="Every number above traces back to a source listed here. Rows marked MOCK are simulated — testing only, never real market data."
    >
      <div className="space-y-1.5">
        {providerStatus.providers.map((p) => (
          <div key={`${p.type}-${p.name}`} className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.02] px-3 py-2">
            <div className="min-w-0">
              <div className="truncate text-sm font-medium text-slate-200">{p.name}</div>
              <div className="label-term">{p.type}</div>
            </div>
            <div className="flex shrink-0 gap-1.5">
              {p.active && <Badge className="border-emerald-400/30 bg-emerald-400/10 text-emerald-300">active</Badge>}
              <Badge className={p.configured ? 'border-cyan-400/30 bg-cyan-400/10 text-cyan-300' : 'border-white/10 bg-white/5 text-slate-400'}>
                {p.configured ? 'configured' : 'not configured'}
              </Badge>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4">
        <div className="mb-2 label-term">Source Audit</div>
        <div className="space-y-2">
          {sourceAudit.map((a, i) => (
            <div key={i} className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium text-slate-200">{a.provider}</span>
                <div className="flex gap-1.5">
                  {a.mock && <Badge className="border-red-400/30 bg-red-400/10 text-red-300">mock</Badge>}
                  <Badge className="border-white/10 bg-white/5 text-slate-300">{a.sourceType.replace('_', ' ')}</Badge>
                </div>
              </div>
              <p className="mt-1 text-xs text-slate-400">{a.supplied}</p>
              <div className="mt-1 flex flex-wrap gap-x-3 text-[11px] text-slate-500">
                <span>fetched {new Date(a.fetchedAt).toLocaleString()}</span>
                {a.confidence != null && <span>confidence {a.confidence}/100</span>}
              </div>
              {a.warnings.length > 0 && (
                <ul className="mt-1 space-y-0.5 text-[11px] text-amber-300/90">
                  {a.warnings.map((w, j) => <li key={j}>⚠︎ {w}</li>)}
                </ul>
              )}
            </div>
          ))}
        </div>
      </div>
    </Section>
  );
}
