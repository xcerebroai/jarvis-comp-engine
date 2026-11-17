import { ArrowRightIcon, SparkIcon } from './icons';
import { GlowIcon } from './ui';

export function ProductEntry() {
  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-16 text-slate-100">
      <div className="glow-border w-full max-w-2xl rounded-3xl bg-white/[0.025] p-8 sm:p-12">
        <GlowIcon icon={<SparkIcon />} tone="blue" />
        <p className="label-term mt-6 text-blue-300/80">Property intelligence</p>
        <h1 className="mt-2 text-4xl font-bold tracking-tight text-slate-50">Jarvis Comps</h1>
        <p className="mt-4 max-w-xl text-base leading-7 text-slate-300">
          Research a property, compare recent sales, and evaluate its after-repair value
          with a clear view of the supporting comps.
        </p>
        <a href="https://comps.xcerebro.ai" className="glow-blue mt-8 inline-flex items-center gap-2 rounded-xl border border-blue-400/40 bg-blue-400/15 px-5 py-3 text-sm font-semibold text-blue-100 transition hover:bg-blue-400/25">
          Open Jarvis Comps <ArrowRightIcon className="h-4 w-4" />
        </a>
        <p className="mt-8 text-xs leading-5 text-slate-500">
          Property values are estimates for research and are not appraisals.
        </p>
      </div>
    </main>
  );
}
