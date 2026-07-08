import { DealWorkbench } from '@/components/DealWorkbench';
import { getProviderStatus } from '@/lib/data-providers/providerStatus';

export const dynamic = 'force-dynamic'; // reflect current provider env

export default function Home() {
  return <DealWorkbench providerStatus={getProviderStatus()} />;
}
