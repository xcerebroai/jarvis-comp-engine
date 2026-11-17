import { ProductEntry } from '@/components/ProductEntry';
import { DealWorkbench } from '@/components/DealWorkbench';
import { getProviderStatus } from '@/lib/data-providers/providerStatus';

// Prerendered at build time (provider status reflects the build-time env). This
// keeps the page compatible with the GitHub Pages static export; set provider
// env before building for server deploys.
export const dynamic = 'force-static';

export default function Home() {
  if (process.env.NEXT_PUBLIC_GITHUB_PAGES === 'true') return <ProductEntry />;
  return <DealWorkbench providerStatus={getProviderStatus()} />;
}
