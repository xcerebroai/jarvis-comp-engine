/**
 * Intake form — the FIRST thing the user sees. Address + repairs are the
 * primary inputs; seller/debt info is optional. Emits the exact AnalysisInput
 * shape the pipeline consumes.
 */
'use client';

import { useState } from 'react';
import {
  REPAIR_CATEGORIES,
  REPAIR_LEVELS,
  REHAB_LEVELS,
  type AnalysisInput,
  type CompInput,
  type CompInputStatus,
  type RehabLevel,
  type RepairCategories,
  type RepairCategory,
  type RepairLevel,
} from '@/lib/types';
import {
  MOTIVATION_OPTIONS,
  OCCUPANCY_OPTIONS,
  REHAB_LEVEL_LABEL,
  REPAIR_CATEGORY_LABEL,
  REPAIR_LEVEL_LABEL,
} from '@/lib/labels';
import { Field, Section, Select, TextArea, TextInput } from './ui';

const toNum = (s: string): number | undefined => {
  const n = Number(s.replace(/[^0-9.]/g, ''));
  return s.trim() && Number.isFinite(n) && n > 0 ? n : undefined;
};

const emptyCategories = (): Record<RepairCategory, RepairLevel> =>
  Object.fromEntries(REPAIR_CATEGORIES.map((c) => [c, 'not_needed'])) as Record<RepairCategory, RepairLevel>;

const CONDITION_OPTIONS = ['unknown', 'distressed', 'below_average', 'average', 'updated', 'renovated'];
const COMP_STATUS_OPTIONS: CompInputStatus[] = ['sold', 'active', 'pending', 'listed'];
type CompRow = Record<string, string>;

function toCompInput(row: CompRow): CompInput {
  return {
    address: row.address?.trim() || undefined,
    soldPrice: toNum(row.soldPrice ?? ''),
    soldDate: row.soldDate?.trim() || undefined,
    beds: toNum(row.beds ?? ''),
    baths: toNum(row.baths ?? ''),
    sqft: toNum(row.sqft ?? ''),
    yearBuilt: toNum(row.yearBuilt ?? ''),
    distanceMiles: toNum(row.distanceMiles ?? ''),
    condition: row.condition || undefined,
    status: (row.status as CompInputStatus) || undefined,
    source: row.source?.trim() || undefined,
    notes: row.notes?.trim() || undefined,
  };
}

export function IntakeForm({
  loading,
  onAnalyze,
}: {
  loading: boolean;
  onAnalyze: (input: AnalysisInput) => void;
}) {
  const [fullAddress, setFullAddress] = useState('');
  const [street, setStreet] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [zip, setZip] = useState('');

  const [rehabLevel, setRehabLevel] = useState<RehabLevel | ''>('');
  const [repairNotes, setRepairNotes] = useState('');
  const [knownMajorRepairs, setKnownMajorRepairs] = useState('');
  const [showItemized, setShowItemized] = useState(false);
  const [categories, setCategories] = useState<Record<RepairCategory, RepairLevel>>(emptyCategories);

  const [showSeller, setShowSeller] = useState(false);
  const [seller, setSeller] = useState<Record<string, string>>({});
  const setS = (k: string, v: string) => setSeller((p) => ({ ...p, [k]: v }));

  const [showManualComps, setShowManualComps] = useState(false);
  const [manualComps, setManualComps] = useState<CompRow[]>([]);
  const addComp = () => setManualComps((p) => [...p, { status: 'sold', condition: 'unknown' }]);
  const updateComp = (i: number, k: string, v: string) =>
    setManualComps((p) => p.map((row, idx) => (idx === i ? { ...row, [k]: v } : row)));
  const removeComp = (i: number) => setManualComps((p) => p.filter((_, idx) => idx !== i));

  const canSubmit = Boolean(fullAddress.trim() || (street.trim() && (city.trim() || zip.trim())));

  function submit() {
    const cats: RepairCategories = {};
    for (const c of REPAIR_CATEGORIES) if (categories[c] !== 'not_needed') cats[c] = categories[c];

    const sellerInfo = {
      askingPrice: toNum(seller.askingPrice ?? ''),
      loanBalance: toNum(seller.loanBalance ?? ''),
      monthlyPiti: toNum(seller.monthlyPiti ?? ''),
      interestRate: toNum(seller.interestRate ?? ''),
      arrears: toNum(seller.arrears ?? ''),
      reinstatementAmount: toNum(seller.reinstatementAmount ?? ''),
      cashToSeller: toNum(seller.cashToSeller ?? ''),
      estimatedRent: toNum(seller.estimatedRent ?? ''),
      motivation: seller.motivation || undefined,
      occupancy: seller.occupancy || undefined,
    };
    const hasSeller = Object.values(sellerInfo).some((v) => v != null && v !== '');

    const comps = manualComps
      .map(toCompInput)
      .filter((c) => c.soldPrice != null || (c.address && c.address.length > 0));

    onAnalyze({
      address: {
        fullAddress: fullAddress.trim() || undefined,
        street: street.trim() || undefined,
        city: city.trim() || undefined,
        state: state.trim() || undefined,
        zip: zip.trim() || undefined,
      },
      repairs: {
        rehabLevel: rehabLevel || undefined,
        repairNotes: repairNotes.trim() || undefined,
        knownMajorRepairs: knownMajorRepairs.trim() || undefined,
        categories: Object.keys(cats).length ? cats : undefined,
      },
      sellerInfo: hasSeller ? sellerInfo : undefined,
      manualComps: comps.length ? comps : undefined,
    });
  }

  return (
    <div className="space-y-4">
      {/* SECTION 1 — Address */}
      <Section step={1} title="Property Address" subtitle="Paste a full address, or fill the fields below.">
        <div className="space-y-3">
          <Field label="Full address" hint="e.g. 123 Main St, Austin, TX 78701">
            <TextInput value={fullAddress} onChange={(e) => setFullAddress(e.target.value)} placeholder="123 Main St, Austin, TX 78701" />
          </Field>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-6">
            <div className="sm:col-span-3">
              <Field label="Street"><TextInput value={street} onChange={(e) => setStreet(e.target.value)} /></Field>
            </div>
            <div className="sm:col-span-3">
              <Field label="City"><TextInput value={city} onChange={(e) => setCity(e.target.value)} /></Field>
            </div>
            <div className="sm:col-span-1">
              <Field label="State"><TextInput value={state} maxLength={2} onChange={(e) => setState(e.target.value.toUpperCase())} placeholder="TX" /></Field>
            </div>
            <div className="sm:col-span-2">
              <Field label="ZIP"><TextInput value={zip} maxLength={5} onChange={(e) => setZip(e.target.value)} placeholder="78701" /></Field>
            </div>
          </div>
        </div>
      </Section>

      {/* SECTION 2 — Repairs */}
      <Section step={2} title="Repair Information" subtitle="Start with the overall level. Itemize only if you know specifics.">
        <div className="space-y-4">
          <Field label="Overall rehab level">
            <div className="flex flex-wrap gap-2">
              {REHAB_LEVELS.map((lvl) => (
                <button
                  key={lvl}
                  type="button"
                  onClick={() => setRehabLevel(rehabLevel === lvl ? '' : lvl)}
                  className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition ${
                    rehabLevel === lvl
                      ? 'border-indigo-600 bg-indigo-600 text-white'
                      : 'border-slate-300 bg-white text-slate-700 hover:border-indigo-400'
                  }`}
                >
                  {REHAB_LEVEL_LABEL[lvl]}
                </button>
              ))}
            </div>
          </Field>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Repair notes">
              <TextArea value={repairNotes} onChange={(e) => setRepairNotes(e.target.value)} placeholder="General condition, what you saw, scope of work…" />
            </Field>
            <Field label="Known major repairs">
              <TextArea value={knownMajorRepairs} onChange={(e) => setKnownMajorRepairs(e.target.value)} placeholder="Roof, foundation, HVAC, electrical, etc." />
            </Field>
          </div>

          <button
            type="button"
            onClick={() => setShowItemized((s) => !s)}
            className="text-sm font-medium text-indigo-600 hover:text-indigo-700"
          >
            {showItemized ? '− Hide' : '+ Add'} itemized repair categories (optional)
          </button>

          {showItemized && (
            <div className="grid grid-cols-1 gap-x-4 gap-y-2 sm:grid-cols-2">
              {REPAIR_CATEGORIES.map((cat) => (
                <div key={cat} className="flex items-center justify-between gap-3">
                  <span className="text-sm text-slate-700">{REPAIR_CATEGORY_LABEL[cat]}</span>
                  <div className="w-40">
                    <Select value={categories[cat]} onChange={(v) => setCategories((p) => ({ ...p, [cat]: v as RepairLevel }))}>
                      {REPAIR_LEVELS.map((l) => (
                        <option key={l} value={l}>{REPAIR_LEVEL_LABEL[l]}</option>
                      ))}
                    </Select>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </Section>

      {/* SECTION 3 — Seller / Debt (optional) */}
      <Section step={3} title="Seller / Debt Info" subtitle="Optional — unlocks subject-to and creative-finance analysis.">
        <button
          type="button"
          onClick={() => setShowSeller((s) => !s)}
          className="mb-3 text-sm font-medium text-indigo-600 hover:text-indigo-700"
        >
          {showSeller ? '− Hide' : '+ Add'} seller / debt details
        </button>
        {showSeller && (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {[
              ['askingPrice', 'Asking price'],
              ['loanBalance', 'Loan balance'],
              ['monthlyPiti', 'Monthly PITI'],
              ['interestRate', 'Interest rate (%)'],
              ['arrears', 'Arrears'],
              ['reinstatementAmount', 'Reinstatement amount'],
              ['cashToSeller', 'Cash to seller'],
              ['estimatedRent', 'Estimated rent /mo'],
            ].map(([k, label]) => (
              <Field key={k} label={label}>
                <TextInput inputMode="decimal" value={seller[k] ?? ''} onChange={(e) => setS(k, e.target.value)} placeholder="$" />
              </Field>
            ))}
            <Field label="Seller motivation">
              <Select value={seller.motivation ?? ''} onChange={(v) => setS('motivation', v)}>
                <option value="">—</option>
                {MOTIVATION_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
              </Select>
            </Field>
            <Field label="Occupancy">
              <Select value={seller.occupancy ?? ''} onChange={(v) => setS('occupancy', v)}>
                <option value="">—</option>
                {OCCUPANCY_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
              </Select>
            </Field>
          </div>
        )}
      </Section>

      {/* SECTION 4 — Manual comps (fallback) */}
      <Section step={4} title="Manual Comps" subtitle="Fallback only — used when no comparable-sales provider is configured.">
        <button
          type="button"
          onClick={() => {
            setShowManualComps((s) => !s);
            if (!showManualComps && manualComps.length === 0) addComp();
          }}
          className="mb-3 text-sm font-medium text-indigo-600 hover:text-indigo-700"
        >
          {showManualComps ? '− Hide' : '+ Add'} manual comps as fallback
        </button>
        {showManualComps && (
          <div className="space-y-4">
            {manualComps.map((row, i) => (
              <div key={i} className="rounded-lg border border-slate-200 p-3">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-500">Comp {i + 1}</span>
                  <button type="button" onClick={() => removeComp(i)} className="text-xs text-slate-400 hover:text-red-600">
                    Remove
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <div className="col-span-2 sm:col-span-4">
                    <Field label="Address"><TextInput value={row.address ?? ''} onChange={(e) => updateComp(i, 'address', e.target.value)} placeholder="456 Comp St" /></Field>
                  </div>
                  <Field label="Sold price"><TextInput inputMode="decimal" value={row.soldPrice ?? ''} onChange={(e) => updateComp(i, 'soldPrice', e.target.value)} placeholder="$" /></Field>
                  <Field label="Sold date"><TextInput value={row.soldDate ?? ''} onChange={(e) => updateComp(i, 'soldDate', e.target.value)} placeholder="YYYY-MM-DD" /></Field>
                  <Field label="Beds"><TextInput inputMode="decimal" value={row.beds ?? ''} onChange={(e) => updateComp(i, 'beds', e.target.value)} /></Field>
                  <Field label="Baths"><TextInput inputMode="decimal" value={row.baths ?? ''} onChange={(e) => updateComp(i, 'baths', e.target.value)} /></Field>
                  <Field label="Sqft"><TextInput inputMode="decimal" value={row.sqft ?? ''} onChange={(e) => updateComp(i, 'sqft', e.target.value)} /></Field>
                  <Field label="Year built"><TextInput inputMode="decimal" value={row.yearBuilt ?? ''} onChange={(e) => updateComp(i, 'yearBuilt', e.target.value)} /></Field>
                  <Field label="Distance (mi)"><TextInput inputMode="decimal" value={row.distanceMiles ?? ''} onChange={(e) => updateComp(i, 'distanceMiles', e.target.value)} /></Field>
                  <Field label="Condition">
                    <Select value={row.condition ?? 'unknown'} onChange={(v) => updateComp(i, 'condition', v)}>
                      {CONDITION_OPTIONS.map((c) => <option key={c} value={c}>{c.replace(/_/g, ' ')}</option>)}
                    </Select>
                  </Field>
                  <Field label="Status">
                    <Select value={row.status ?? 'sold'} onChange={(v) => updateComp(i, 'status', v)}>
                      {COMP_STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                    </Select>
                  </Field>
                  <Field label="Source"><TextInput value={row.source ?? ''} onChange={(e) => updateComp(i, 'source', e.target.value)} placeholder="MLS printout, agent…" /></Field>
                  <div className="col-span-2 sm:col-span-4">
                    <Field label="Notes"><TextInput value={row.notes ?? ''} onChange={(e) => updateComp(i, 'notes', e.target.value)} /></Field>
                  </div>
                </div>
              </div>
            ))}
            <button type="button" onClick={addComp} className="text-sm font-medium text-indigo-600 hover:text-indigo-700">
              + Add another comp
            </button>
          </div>
        )}
      </Section>

      {/* SECTION 5 — Analyze */}
      <button
        type="button"
        disabled={!canSubmit || loading}
        onClick={submit}
        className="w-full rounded-xl bg-indigo-600 py-3.5 text-base font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-slate-300"
      >
        {loading ? 'Analyzing…' : 'Analyze Property'}
      </button>
      {!canSubmit && (
        <p className="text-center text-xs text-slate-400">Enter an address to enable analysis.</p>
      )}
    </div>
  );
}
