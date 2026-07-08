/**
 * Command-center UI primitives. Dark, glassy panels with subtle neon glow so the
 * app reads like an investor terminal. Kept dependency-free and consistent.
 */
'use client';

import type { ReactNode } from 'react';

export type Tone = 'cyan' | 'violet' | 'emerald' | 'amber' | 'red' | 'slate';

const GLOW: Record<Tone, string> = {
  cyan: 'glow-cyan',
  violet: 'glow-violet',
  emerald: 'glow-emerald',
  amber: 'glow-amber',
  red: 'glow-red',
  slate: '',
};

const ICON_TONE: Record<Tone, string> = {
  cyan: 'text-cyan-300 border-cyan-400/30',
  violet: 'text-violet-300 border-violet-400/30',
  emerald: 'text-emerald-300 border-emerald-400/30',
  amber: 'text-amber-300 border-amber-400/30',
  red: 'text-red-300 border-red-400/30',
  slate: 'text-slate-300 border-white/15',
};

const DOT_TONE: Record<Tone, string> = {
  cyan: 'bg-cyan-400',
  violet: 'bg-violet-400',
  emerald: 'bg-emerald-400',
  amber: 'bg-amber-400',
  red: 'bg-red-400',
  slate: 'bg-slate-400',
};

/* -------------------------------- Panels -------------------------------- */

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`glow-border rounded-2xl bg-white/[0.025] backdrop-blur-sm ${className}`}>{children}</div>
  );
}

/** A translucent panel with an optional accent glow — the base command card. */
export function CommandCard({
  children,
  tone = 'slate',
  glow = false,
  className = '',
}: {
  children: ReactNode;
  tone?: Tone;
  glow?: boolean;
  className?: string;
}) {
  return (
    <div
      className={`glow-border rounded-2xl bg-white/[0.025] backdrop-blur-sm ${glow ? GLOW[tone] : ''} ${className}`}
    >
      {children}
    </div>
  );
}

/** Icon in a glowing rounded tile. Pass an inline SVG as `icon`. */
export function GlowIcon({ icon, tone = 'cyan', size = 'md' }: { icon: ReactNode; tone?: Tone; size?: 'sm' | 'md' }) {
  const box = size === 'sm' ? 'h-8 w-8' : 'h-10 w-10';
  const svg = size === 'sm' ? 'h-4 w-4' : 'h-5 w-5';
  return (
    <span
      className={`inline-flex ${box} shrink-0 items-center justify-center rounded-xl border bg-white/[0.03] ${ICON_TONE[tone]} ${GLOW[tone]}`}
    >
      <span className={svg}>{icon}</span>
    </span>
  );
}

/** Section header: glowing icon + optional step + uppercase title + subtitle. */
export function SectionHeader({
  icon,
  tone = 'cyan',
  step,
  title,
  subtitle,
  right,
}: {
  icon?: ReactNode;
  tone?: Tone;
  step?: number | string;
  title: string;
  subtitle?: string;
  right?: ReactNode;
}) {
  return (
    <div className="mb-4 flex items-start justify-between gap-3">
      <div className="flex items-start gap-3">
        {icon && <GlowIcon icon={icon} tone={tone} />}
        <div>
          <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-100">
            {step != null && <span className="label-term text-cyan-300/80">{step}</span>}
            <span className="tracking-wide">{title}</span>
          </h2>
          {subtitle && <p className="mt-0.5 text-sm text-slate-400">{subtitle}</p>}
        </div>
      </div>
      {right}
    </div>
  );
}

/** A section = command card + header. Backwards-compatible with the old API. */
export function Section({
  step,
  title,
  subtitle,
  icon,
  tone = 'cyan',
  right,
  children,
}: {
  step?: number | string;
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  tone?: Tone;
  right?: ReactNode;
  children: ReactNode;
}) {
  return (
    <CommandCard className="p-5 sm:p-6">
      <SectionHeader icon={icon} tone={tone} step={step} title={title} subtitle={subtitle} right={right} />
      {children}
    </CommandCard>
  );
}

/* -------------------------------- Status -------------------------------- */

/** Terminal status pill: pulsing dot + label + value. */
export function StatusPill({ label, value, tone = 'cyan' }: { label: string; value: string; tone?: Tone }) {
  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1">
      <span className={`status-dot h-1.5 w-1.5 rounded-full ${DOT_TONE[tone]}`} />
      <span className="label-term">{label}</span>
      <span className="text-xs font-semibold text-slate-100">{value}</span>
    </div>
  );
}

/** Big metric tile for the results summary. */
export function MetricCard({
  label,
  value,
  sub,
  tone = 'slate',
  icon,
}: {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  tone?: Tone;
  icon?: ReactNode;
}) {
  const valueTone =
    tone === 'emerald'
      ? 'text-emerald-300'
      : tone === 'red'
        ? 'text-red-300'
        : tone === 'amber'
          ? 'text-amber-300'
          : tone === 'violet'
            ? 'text-violet-200'
            : 'text-slate-50';
  return (
    <CommandCard tone={tone} glow={tone !== 'slate'} className="p-4">
      <div className="flex items-center justify-between">
        <span className="label-term">{label}</span>
        {icon && <GlowIcon icon={icon} tone={tone} size="sm" />}
      </div>
      <div className={`mt-1 text-2xl font-bold tabular-nums ${valueTone}`}>{value}</div>
      {sub && <div className="mt-0.5 text-xs text-slate-400">{sub}</div>}
    </CommandCard>
  );
}

/** Loud warning banner (amber/red) with icon and copy. */
export function WarningBanner({
  tone = 'red',
  icon,
  title,
  children,
}: {
  tone?: 'red' | 'amber';
  icon?: ReactNode;
  title: string;
  children?: ReactNode;
}) {
  const cls =
    tone === 'red'
      ? 'border-red-400/40 bg-red-500/10 text-red-200 glow-red'
      : 'border-amber-400/40 bg-amber-500/10 text-amber-200 glow-amber';
  return (
    <div className={`flex items-start gap-3 rounded-2xl border p-4 ${cls}`}>
      {icon && <span className="mt-0.5 h-5 w-5 shrink-0">{icon}</span>}
      <div>
        <p className="text-sm font-bold">{title}</p>
        {children && <div className="mt-1 text-sm opacity-90">{children}</div>}
      </div>
    </div>
  );
}

/* -------------------------------- Inputs -------------------------------- */

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-slate-300">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-[11px] text-slate-500">{hint}</span>}
    </label>
  );
}

const inputBase =
  'w-full rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-cyan-400/60 focus:ring-2 focus:ring-cyan-400/15';

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
      className={`${inputBase} cursor-pointer [&>option]:bg-slate-900 [&>option]:text-slate-100 ${className}`}
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

/** A 0–100 score bar with a numeric label — dark track, glowing fill. */
export function ScoreBar({ score, tone = 'cyan' }: { score: number; tone?: string }) {
  const toneMap: Record<string, string> = {
    cyan: 'bg-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.6)]',
    indigo: 'bg-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.6)]',
    emerald: 'bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.6)]',
    amber: 'bg-amber-400 shadow-[0_0_10px_rgba(251,191,36,0.6)]',
    red: 'bg-red-400 shadow-[0_0_10px_rgba(248,113,113,0.6)]',
  };
  return (
    <div className="flex items-center gap-2">
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-white/10">
        <div
          className={`h-full rounded-full ${toneMap[tone] ?? toneMap.cyan}`}
          style={{ width: `${Math.max(0, Math.min(100, score))}%` }}
        />
      </div>
      <span className="w-10 text-right text-xs font-semibold tabular-nums text-slate-300">{Math.round(score)}</span>
    </div>
  );
}

export function Stat({ label, value, emphasis = false }: { label: string; value: ReactNode; emphasis?: boolean }) {
  return (
    <div>
      <div className="label-term">{label}</div>
      <div className={`${emphasis ? 'text-xl font-bold text-slate-50' : 'text-sm font-semibold text-slate-200'} tabular-nums`}>
        {value}
      </div>
    </div>
  );
}
