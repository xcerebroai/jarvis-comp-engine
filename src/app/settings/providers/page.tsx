import Link from 'next/link';
import { getProviderCards } from '@/lib/data-providers/providerCatalog';
import { ArrowRightIcon, PlugIcon } from '@/components/icons';
import { ProductEntry } from '@/components/ProductEntry';

export const dynamic = 'force-static';

const SOURCE_DESCRIPTIONS: Record<string, string[]> = {
  property: ['Bedrooms, bathrooms, living area, lot size, and year built', 'Property address and supporting value information'],
  comps: ['Comparable sales, sale prices, and sale dates', 'Distance, size, and property characteristics for each comparable'],
  county: ['Parcel identifiers, assessed values, and property taxes', 'Recorded sales and available mortgage information'],
  valuation: ['Estimated property value and supporting range', 'Additional context alongside the comparable sales analysis'],
  rent: ['Estimated monthly rent and available rental comparables'],
};

export default function ProviderSettingsPage() {
  if (process.env.NEXT_PUBLIC_GITHUB_PAGES === 'true') return <ProductEntry />;
  const cards = getProviderCards().filter((card) => card.active);
  return (
    <div className="min-h-screen text-slate-100">
      <header className="border-b border-white/5">
        <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6">
          <Link href="/" className="inline-flex items-center gap-1.5 text-xs font-medium text-blue-300 transition hover:text-blue-200">
            <ArrowRightIcon className="h-3.5 w-3.5 rotate-180" /> Back to analyzer
          </Link>
          <div className="mt-4 flex items-center gap-3">
            <span className="glow-blue inline-flex h-10 w-10 items-center justify-center rounded-xl border border-blue-400/30 bg-white/[0.03] text-blue-300"><PlugIcon className="h-5 w-5" /></span>
            <div><h1 className="text-xl font-bold text-slate-50">Data Sources</h1><p className="label-term text-blue-300/80">Property intelligence</p></div>
          </div>
          <p className="mt-3 max-w-2xl text-sm text-slate-400">Understand the property records and comparable sales behind your analysis.</p>
        </div>
      </header>
      <main className="mx-auto max-w-4xl space-y-4 px-4 py-6 sm:px-6">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {cards.map((card) => (
            <section key={card.type} className="rounded-2xl border border-white/10 bg-white/[0.025] p-5">
              <h2 className="text-sm font-bold text-slate-50">{card.name}</h2>
              <ul className="mt-3 space-y-2 text-sm text-slate-300">{(SOURCE_DESCRIPTIONS[card.type] ?? []).map((description) => <li key={description}>• {description}</li>)}</ul>
            </section>
          ))}
        </div>
        <p className="text-xs leading-5 text-slate-500">Coverage varies by location and record availability. Value estimates support your research; comparable sales and property condition inform the recommended ARV.</p>
      </main>
    </div>
  );
}
