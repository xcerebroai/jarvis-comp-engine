/**
 * Results dashboard — the 7 output blocks: property snapshot, repair summary,
 * conservative ARV, comparable sales, offer options, recommended strategy, and
 * the deal memo.
 */
'use client';

import { useState } from 'react';
import type {
  AnalysisResult,
  CompDisposition,
  GradedComp,
  OfferResult,
} from '@/lib/types';
import { REHAB_LEVEL_LABEL, REPAIR_CATEGORY_LABEL, RISK_TONE, STRATEGY_LABEL, money } from '@/lib/labels';
import { Badge, Card, ScoreBar, Section, Stat } from './ui';

const confTone = (s: number) => (s >= 70 ? 'emerald' : s >= 45 ? 'amber' : 'red');

const DISPOSITION_TONE: Record<CompDisposition, string> = {
  qualified: 'text-emerald-700 bg-emerald-50 border-emerald-200',
  support: 'text-sky-700 bg-sky-50 border-sky-200',
  penalized: 'text-amber-700 bg-amber-50 border-amber-200',
  rejected: 'text-slate-500 bg-slate-50 border-slate-200',
};

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
        <Card className="border-amber-200 bg-amber-50 p-4">
          <ul className="space-y-1 text-sm text-amber-800">
            {result.warnings.map((w, i) => (
              <li key={i}>⚠︎ {w}</li>
            ))}
          </ul>
        </Card>
      )}

      {/* Headline scores */}
      <Card className="p-5">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Stat label="Conservative ARV" value={money(arv.conservative)} emphasis />
          <Stat label="Repairs" value={money(repairEstimate.recommended)} emphasis />
          <div>
            <div className="text-[11px] font-medium tracking-wide text-slate-400 uppercase">Confidence</div>
            <ScoreBar score={confidence.score} tone={confTone(confidence.score)} />
          </div>
          <div>
            <div className="text-[11px] font-medium tracking-wide text-slate-400 uppercase">Risk</div>
            <div className="mt-0.5">
              <Badge className={RISK_TONE[risk.level]}>{risk.level.replace('_', ' ')} · {risk.score}/100</Badge>
            </div>
          </div>
        </div>
      </Card>

      {/* 1 — Property Snapshot */}
      <Section title="1 · Property Snapshot">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div className="col-span-2 sm:col-span-4">
            <div className="text-base font-semibold text-slate-900">{result.address.formatted || 'Address unavailable'}</div>
          </div>
          <Stat label="Beds / Baths" value={`${f.beds ?? '?'} / ${f.baths ?? '?'}`} />
          <Stat label="Sqft" value={f.sqft ? f.sqft.toLocaleString() : '?'} />
          <Stat label="Year built" value={f.yearBuilt ?? '?'} />
          <Stat label="Type" value={subject.propertyType.replace('_', ' ')} />
        </div>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {result.dataSources.map((s) => (
            <Badge key={s} className="border-slate-200 bg-slate-50 text-slate-600">{s.replace(/_/g, ' ')}</Badge>
          ))}
        </div>
      </Section>

      {/* 2 — Repair Summary */}
      <Section title="2 · Repair Summary">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Stat label="Rehab level" value={REHAB_LEVEL_LABEL[repairEstimate.rehabLevel]} />
          <Stat label="Low estimate" value={money(repairEstimate.low)} />
          <Stat label="High estimate" value={money(repairEstimate.high)} />
          <Stat label="Recommended" value={money(repairEstimate.recommended)} emphasis />
        </div>
        <div className="mt-3">
          <div className="mb-1 text-[11px] font-medium tracking-wide text-slate-400 uppercase">Repair confidence</div>
          <ScoreBar score={repairEstimate.confidence} tone={confTone(repairEstimate.confidence)} />
        </div>
        {repairEstimate.lineItems.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {repairEstimate.lineItems.map((li) => (
              <Badge key={li.category} className="border-slate-200 bg-slate-50 text-slate-600">
                {REPAIR_CATEGORY_LABEL[li.category]}: {money(li.recommended)}
              </Badge>
            ))}
          </div>
        )}
        {repairEstimate.warnings.length > 0 && (
          <ul className="mt-3 space-y-1 text-xs text-amber-700">
            {repairEstimate.warnings.map((w, i) => <li key={i}>⚠︎ {w}</li>)}
          </ul>
        )}
      </Section>

      {/* Mock warning — directly above the ARV, per production-safety spec. */}
      {result.usedMockProvider && <MockBanner />}

      {/* 3 — Conservative ARV */}
      <Section title="3 · Conservative ARV">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Stat label="Low" value={money(arv.low)} />
          <Stat label="Median" value={money(arv.median)} />
          <Stat label="High" value={money(arv.high)} />
          <Stat label="Recommended" value={money(arv.conservative)} emphasis />
        </div>
        <div className="mt-3">
          <div className="mb-1 text-[11px] font-medium tracking-wide text-slate-400 uppercase">ARV confidence</div>
          <ScoreBar score={arv.confidence} tone={confTone(arv.confidence)} />
        </div>
        <p className="mt-3 text-sm text-slate-600">{arv.explanation}</p>
        {arv.warnings.length > 0 && (
          <ul className="mt-2 space-y-1 text-xs text-amber-700">
            {arv.warnings.map((w, i) => <li key={i}>⚠︎ {w}</li>)}
          </ul>
        )}
      </Section>

      {/* Mock warning — directly above the comp table, per production-safety spec. */}
      {result.usedMockProvider && <MockBanner />}

      {/* 4 — Comparable Sales */}
      <Section title="4 · Comparable Sales" subtitle={`${qualified.length} qualified · ${support.length} active support · ${rejected.length} penalized/rejected`}>
        <div className="space-y-2">
          {sortedComps.map((g) => <CompRow key={g.comp.id} g={g} subjectSqft={f.sqft} />)}
        </div>
      </Section>

      {/* 5 — Offer Options */}
      <Section title="5 · Offer Options">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {[offers.fix_and_flip, offers.wholesale, offers.subject_to, offers.creative_finance].map((o) => (
            <OfferCard key={o.strategy} o={o} recommended={o.strategy === recommendation.strategy} />
          ))}
        </div>
      </Section>

      {/* 6 — Recommended Strategy */}
      <Section title="6 · Recommended Strategy">
        <div className="flex items-center gap-3">
          <Badge className="border-indigo-200 bg-indigo-50 text-base font-bold text-indigo-700">{recommendation.label}</Badge>
        </div>
        <p className="mt-2 text-sm text-slate-700">{recommendation.summary}</p>
        <ul className="mt-3 space-y-1 text-sm text-slate-600">
          {recommendation.rationale.map((r, i) => <li key={i}>• {r}</li>)}
        </ul>
        <div className="mt-4 space-y-1.5">
          {recommendation.ranking.map((r) => (
            <div key={r.strategy} className="flex items-center gap-3">
              <span className="w-32 text-xs text-slate-500">{STRATEGY_LABEL[r.strategy]}</span>
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

function MockBanner() {
  return (
    <Card className="border-red-300 bg-red-50 p-4">
      <p className="text-sm font-bold text-red-800">⚠︎ Mock Data Mode</p>
      <p className="mt-1 text-sm text-red-700">
        This analysis is using simulated property/comparable data for testing.{' '}
        <span className="font-semibold">Do not use this valuation for real offers.</span>
      </p>
    </Card>
  );
}

function DataSourcesBlock({ result }: { result: AnalysisResult }) {
  const { providerStatus, sourceAudit } = result;
  return (
    <Section title="8 · Data Sources & Providers" subtitle="Provenance and provider configuration for this analysis.">
      {/* Provider configuration */}
      <div className="space-y-1.5">
        {providerStatus.providers.map((p) => (
          <div key={`${p.type}-${p.name}`} className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 px-3 py-2">
            <div className="min-w-0">
              <div className="truncate text-sm font-medium text-slate-800">{p.name}</div>
              <div className="text-xs text-slate-500">{p.type}</div>
            </div>
            <div className="flex shrink-0 gap-1.5">
              {p.active && <Badge className="border-emerald-200 bg-emerald-50 text-emerald-700">active</Badge>}
              <Badge className={p.configured ? 'border-sky-200 bg-sky-50 text-sky-700' : 'border-slate-200 bg-slate-50 text-slate-500'}>
                {p.configured ? 'configured' : 'not configured'}
              </Badge>
            </div>
          </div>
        ))}
      </div>

      {/* Source audit */}
      <div className="mt-4">
        <div className="mb-2 text-[11px] font-semibold tracking-wide text-slate-400 uppercase">Source Audit</div>
        <div className="space-y-2">
          {sourceAudit.map((a, i) => (
            <div key={i} className="rounded-lg border border-slate-200 p-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium text-slate-800">{a.provider}</span>
                <div className="flex gap-1.5">
                  {a.mock && <Badge className="border-red-200 bg-red-50 text-red-700">mock</Badge>}
                  <Badge className="border-slate-200 bg-slate-50 text-slate-600">{a.sourceType.replace('_', ' ')}</Badge>
                </div>
              </div>
              <p className="mt-1 text-xs text-slate-600">{a.supplied}</p>
              <div className="mt-1 flex flex-wrap gap-x-3 text-[11px] text-slate-400">
                <span>fetched {new Date(a.fetchedAt).toLocaleString()}</span>
                {a.confidence != null && <span>confidence {a.confidence}/100</span>}
              </div>
              {a.warnings.length > 0 && (
                <ul className="mt-1 space-y-0.5 text-[11px] text-amber-700">
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

function CompRow({ g, subjectSqft }: { g: GradedComp; subjectSqft?: number }) {
  const [open, setOpen] = useState(false);
  const c = g.comp;
  return (
    <div className="rounded-lg border border-slate-200 p-3">
      <button type="button" onClick={() => setOpen((o) => !o)} className="flex w-full items-center gap-3 text-left">
        <div className="w-24 shrink-0"><ScoreBar score={g.score} tone={g.score >= 70 ? 'emerald' : g.score >= 45 ? 'amber' : 'red'} /></div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-medium text-slate-800">{c.address.street}</div>
          <div className="text-xs text-slate-500">
            {money(c.price)} · {c.status} · {c.facts.sqft?.toLocaleString() ?? '?'} sqft · {c.distanceMiles} mi
            {subjectSqft && c.facts.sqft ? ` · implies ${money(g.impliedValue)}` : ''}
          </div>
        </div>
        <Badge className={DISPOSITION_TONE[g.disposition]}>{g.disposition}</Badge>
      </button>
      {open && (
        <div className="mt-2 border-t border-slate-100 pt-2 text-xs text-slate-600">
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
    <Card className={`p-4 ${recommended ? 'ring-2 ring-indigo-500' : ''}`}>
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-bold text-slate-900">{STRATEGY_LABEL[o.strategy]}</h3>
          {recommended && <Badge className="border-indigo-200 bg-indigo-50 text-indigo-700">Recommended</Badge>}
          {!o.viable && <Badge className="border-slate-200 bg-slate-50 text-slate-500">marginal</Badge>}
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
          <div className="text-[11px] font-medium tracking-wide text-slate-400 uppercase">Confidence</div>
          <ScoreBar score={o.confidence} tone={confTone(o.confidence)} />
        </div>
      </div>

      <p className="mt-3 text-xs text-slate-600">{o.explanation}</p>

      {o.terms && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {Object.entries(o.terms).map(([k, v]) => (
            <Badge key={k} className="border-slate-200 bg-slate-50 text-slate-600">{k}: {v}</Badge>
          ))}
        </div>
      )}

      {o.redFlags.length > 0 && (
        <ul className="mt-2 space-y-0.5 text-xs text-red-600">
          {o.redFlags.map((r, i) => <li key={i}>⚑ {r}</li>)}
        </ul>
      )}

      {o.sellerQuestions.length > 0 && (
        <details className="mt-2">
          <summary className="cursor-pointer text-xs font-medium text-slate-500">Seller questions ({o.sellerQuestions.length})</summary>
          <ul className="mt-1 space-y-0.5 text-xs text-slate-600">
            {o.sellerQuestions.map((q, i) => <li key={i}>? {q}</li>)}
          </ul>
        </details>
      )}
    </Card>
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
    <Section title="7 · Deal Memo">
      <div className="mb-3 flex items-start justify-between gap-3">
        <p className="text-sm font-medium text-slate-800">{memo.headline}</p>
        <button type="button" onClick={copy} className="shrink-0 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50">
          {copied ? 'Copied!' : 'Copy memo'}
        </button>
      </div>
      <div className="space-y-3">
        {memo.sections.map((s) => (
          <div key={s.title}>
            <div className="text-[11px] font-semibold tracking-wide text-slate-400 uppercase">{s.title}</div>
            <p className="whitespace-pre-line text-sm text-slate-700">{s.body}</p>
          </div>
        ))}
      </div>
      {memo.redFlags.length > 0 && (
        <div className="mt-4">
          <div className="text-[11px] font-semibold tracking-wide text-red-400 uppercase">Red Flags</div>
          <ul className="mt-1 space-y-0.5 text-sm text-red-600">
            {memo.redFlags.map((r, i) => <li key={i}>⚑ {r}</li>)}
          </ul>
        </div>
      )}
      <div className="mt-4">
        <div className="text-[11px] font-semibold tracking-wide text-slate-400 uppercase">Next Questions for the Seller</div>
        <ul className="mt-1 space-y-0.5 text-sm text-slate-700">
          {memo.nextQuestions.map((q, i) => <li key={i}>? {q}</li>)}
        </ul>
      </div>
    </Section>
  );
}
