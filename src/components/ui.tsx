/**
 * Small, unstyled-ish UI primitives so the intake form and dashboard stay
 * consistent without a component library. Light-theme, investor-clean.
 */
'use client';

import type { ReactNode } from 'react';

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-xl border border-slate-200 bg-white shadow-sm ${className}`}>{children}</div>
  );
}

export function Section({
  step,
  title,
  subtitle,
  children,
}: {
  step?: number;
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <Card className="p-5 sm:p-6">
      <div className="mb-4">
        <h2 className="flex items-center gap-2 text-sm font-semibold tracking-wide text-slate-500 uppercase">
          {step != null && (
            <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-indigo-600 text-[11px] font-bold text-white">
              {step}
            </span>
          )}
          {title}
        </h2>
        {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
      </div>
      {children}
    </Card>
  );
}

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-slate-600">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-[11px] text-slate-400">{hint}</span>}
    </label>
  );
}

const inputBase =
  'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 placeholder:text-slate-400';

export function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`${inputBase} ${props.className ?? ''}`} />;
}

export function TextArea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={`${inputBase} min-h-[72px] resize-y ${props.className ?? ''}`} />;
}

export function Select({
  value,
  onChange,
  children,
  className = '',
}: {
  value: string;
  onChange: (v: string) => void;
  children: ReactNode;
  className?: string;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={`${inputBase} cursor-pointer ${className}`}
    >
      {children}
    </select>
  );
}

export function Badge({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium ${className}`}>
      {children}
    </span>
  );
}

/** A 0–100 score bar with a numeric label. */
export function ScoreBar({ score, tone = 'indigo' }: { score: number; tone?: string }) {
  const toneMap: Record<string, string> = {
    indigo: 'bg-indigo-500',
    emerald: 'bg-emerald-500',
    amber: 'bg-amber-500',
    red: 'bg-red-500',
  };
  return (
    <div className="flex items-center gap-2">
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
        <div className={`h-full rounded-full ${toneMap[tone] ?? toneMap.indigo}`} style={{ width: `${Math.max(0, Math.min(100, score))}%` }} />
      </div>
      <span className="w-10 text-right text-xs font-semibold tabular-nums text-slate-600">{Math.round(score)}</span>
    </div>
  );
}

export function Stat({ label, value, emphasis = false }: { label: string; value: ReactNode; emphasis?: boolean }) {
  return (
    <div>
      <div className="text-[11px] font-medium tracking-wide text-slate-400 uppercase">{label}</div>
      <div className={`${emphasis ? 'text-xl font-bold text-slate-900' : 'text-sm font-semibold text-slate-700'} tabular-nums`}>{value}</div>
    </div>
  );
}
