/**
 * First-visit onboarding modal — explains the acquisition workflow. Shown once
 * (localStorage), reopenable via the "How it works" button.
 */
'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import { ArrowRightIcon, CloseIcon, PlugIcon, SparkIcon } from './icons';
import { GlowIcon } from './ui';

const IS_PAGES = process.env.NEXT_PUBLIC_GITHUB_PAGES === 'true';

const STEPS = [
  'Enter the property address',
  'Add repair information',
  'Add seller / debt details if available',
  'Click Analyze Property',
  'Review conservative ARV, comps, repairs, and offers',
  'Use the deal memo to guide your next seller conversation',
];

export function OnboardingModal({
  open,
  onStart,
  onDismiss,
  onClose,
}: {
  open: boolean;
  onStart: () => void;
  onDismiss: () => void;
  onClose: () => void;
}) {
  // Escape closes the modal — standard dialog behavior.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="onboarding-title"
      onClick={onClose}
    >
      <div
        className="glow-border glow-blue relative w-full max-w-lg rounded-2xl bg-[#0F172A]/95 p-6 sm:p-7"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 transition hover:text-slate-100"
          aria-label="Close"
        >
          <CloseIcon className="h-5 w-5" />
        </button>

        <div className="flex items-center gap-3">
          <GlowIcon icon={<SparkIcon />} tone="blue" />
          <div>
            <h2 id="onboarding-title" className="text-lg font-bold text-slate-50">
              Welcome to Jarvis Comp Engine
            </h2>
            <p className="label-term text-blue-300/80">Autopilot Acquisition Analyst</p>
          </div>
        </div>

        <p className="mt-4 text-sm text-slate-300">
          Enter a property address, add repair intel, and Jarvis will run a conservative acquisition
          analysis across wholesale, fix-and-flip, subject-to, and creative finance.
        </p>

        {IS_PAGES && (
          <p className="mt-3 rounded-lg border border-amber-400/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
            You&apos;re viewing the static public demo — analysis runs in your browser using mock data
            only. Nothing here is real market data.
          </p>
        )}

        <ol className="mt-4 space-y-2">
          {STEPS.map((s, i) => (
            <li key={i} className="flex items-start gap-3 text-sm text-slate-200">
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-blue-400/40 bg-blue-400/10 text-[11px] font-bold text-blue-300">
                {i + 1}
              </span>
              {s}
            </li>
          ))}
        </ol>

        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:items-center">
          <button
            type="button"
            onClick={onStart}
            className="glow-blue inline-flex items-center justify-center gap-2 rounded-xl border border-blue-400/40 bg-blue-400/15 px-4 py-2.5 text-sm font-semibold text-blue-100 transition hover:bg-blue-400/25"
          >
            Start Analysis <ArrowRightIcon className="h-4 w-4" />
          </button>
          <Link
            href="/settings/providers"
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/[0.03] px-4 py-2.5 text-sm font-medium text-slate-200 transition hover:border-violet-400/40 hover:text-violet-200"
          >
            <PlugIcon className="h-4 w-4" /> View Provider Settings
          </Link>
          <button
            type="button"
            onClick={onDismiss}
            className="text-sm font-medium text-slate-400 transition hover:text-slate-200 sm:ml-auto"
          >
            Do Not Show Again
          </button>
        </div>
      </div>
    </div>
  );
}
