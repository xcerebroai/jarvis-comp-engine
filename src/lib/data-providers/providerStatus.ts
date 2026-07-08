/**
 * Provider status system — the single source of truth for "where does data
 * come from right now?". There is no mock mode in the server pipeline: real
 * providers or an honest error. The deterministic mock exists only in the
 * loudly-labeled GitHub Pages demo build (NEXT_PUBLIC_GITHUB_PAGES=true).
 *
 * COMPLIANCE: a configured key only means "a LICENSED adapter may run". No
 * provider here ever scrapes a restricted site. See providerTypes.ts.
 */
import type {
  ProviderSlotType,
  ProviderStatus,
  ProviderStatusEntry,
} from '@/lib/types';

/** The exact error surfaced when no real provider is configured. */
export const NO_PROVIDER_MESSAGE =
  'No real data provider is configured. Set DEALMACHINE_API_KEY (or configure another licensed data provider).';

/** Normalized view of the provider-related environment. */
export interface ProviderEnv {
  /** True only in the static GitHub Pages demo build. */
  isPagesDemo: boolean;
  dealMachineApiKey?: string;
  rentProviderApiKey?: string;
}

interface SlotDef {
  name: string;
  type: Exclude<ProviderSlotType, 'mock'>;
  key: keyof Omit<ProviderEnv, 'isPagesDemo'>;
}

/**
 * Real-provider slots and the env key that configures each. DealMachine backs
 * property facts, comps, public records, and its supporting value estimate.
 */
const SLOTS: SlotDef[] = [
  { name: 'DealMachine Property Data', type: 'property', key: 'dealMachineApiKey' },
  { name: 'DealMachine Comparable Sales', type: 'comps', key: 'dealMachineApiKey' },
  { name: 'DealMachine Public Records', type: 'county', key: 'dealMachineApiKey' },
  { name: 'DealMachine Value Estimate', type: 'valuation', key: 'dealMachineApiKey' },
  { name: 'Rent Estimate Provider', type: 'rent', key: 'rentProviderApiKey' },
];

/** Pure: turn a normalized env into a full ProviderStatus. */
export function computeProviderStatus(env: ProviderEnv): ProviderStatus {
  const providers: ProviderStatusEntry[] = SLOTS.map((s) => {
    const configured = Boolean(env[s.key]);
    const active = !env.isPagesDemo && configured;
    const warnings: string[] = [];
    if (env.isPagesDemo) warnings.push('Static demo build — live providers are never called here.');
    else if (!configured) warnings.push('Not configured — this slot supplies no data.');
    return { name: s.name, type: s.type, configured, active, warnings };
  });

  const realProvidersConfigured = providers.some((p) => p.configured);
  const globalWarnings: string[] = [];

  if (env.isPagesDemo) {
    globalWarnings.push(
      'Static public demo — analyses use simulated data only. Do not use these valuations for real offers.',
    );
    providers.unshift({
      name: 'Simulated Demo Data (in-browser)',
      type: 'mock',
      configured: true,
      active: true,
      warnings: ['Simulated data for the public demo only — never licensed provider data.'],
    });
  } else if (!realProvidersConfigured) {
    globalWarnings.push(NO_PROVIDER_MESSAGE);
  }

  return {
    mockProviderEnabled: env.isPagesDemo,
    realProvidersConfigured,
    providers,
    globalWarnings,
  };
}

/** Read the live process env into a normalized ProviderEnv (fresh each call). */
export function readProviderEnv(): ProviderEnv {
  return {
    isPagesDemo: process.env.NEXT_PUBLIC_GITHUB_PAGES === 'true',
    dealMachineApiKey: process.env.DEALMACHINE_API_KEY || undefined,
    rentProviderApiKey: process.env.RENT_PROVIDER_API_KEY || undefined,
  };
}

/** Convenience: current provider status from the live environment. */
export function getProviderStatus(): ProviderStatus {
  return computeProviderStatus(readProviderEnv());
}
