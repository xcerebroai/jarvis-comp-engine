/**
 * Provider status system — the single source of truth for "where does data
 * come from right now?". It reads the environment (mock flag + licensed API
 * keys) and reports, per slot, whether a real provider is configured and
 * active. The UI and deal memo use this to make mock-vs-real unmistakable.
 *
 * COMPLIANCE: a configured key only means "a LICENSED adapter may run". No
 * provider here ever scrapes a restricted site. See providerTypes.ts.
 */
import type {
  ProviderSlotType,
  ProviderStatus,
  ProviderStatusEntry,
} from '@/lib/types';

/** The exact error surfaced when real mode is on but nothing is configured. */
export const NO_PROVIDER_MESSAGE =
  'No real data provider is configured. Enable mock mode for testing or configure a licensed data provider.';

/** Normalized view of the provider-related environment. */
export interface ProviderEnv {
  useMock: boolean;
  attomApiKey?: string;
  mlsApiKey?: string;
  rentProviderApiKey?: string;
  countyProviderApiKey?: string;
}

interface SlotDef {
  name: string;
  type: Exclude<ProviderSlotType, 'mock'>;
  key: keyof Omit<ProviderEnv, 'useMock'>;
}

/**
 * The real-provider slots and the env key that configures each. ATTOM supplies
 * both subject facts and its AVM, so it backs `property` and `valuation`.
 */
const SLOTS: SlotDef[] = [
  { name: 'ATTOM Property Data', type: 'property', key: 'attomApiKey' },
  { name: 'MLS Comparable Sales', type: 'comps', key: 'mlsApiKey' },
  { name: 'Rent Estimate Provider', type: 'rent', key: 'rentProviderApiKey' },
  { name: 'County Public Records', type: 'county', key: 'countyProviderApiKey' },
  { name: 'ATTOM AVM Valuation', type: 'valuation', key: 'attomApiKey' },
];

/** Pure: turn a normalized env into a full ProviderStatus. */
export function computeProviderStatus(env: ProviderEnv): ProviderStatus {
  const providers: ProviderStatusEntry[] = SLOTS.map((s) => {
    const configured = Boolean(env[s.key]);
    const active = !env.useMock && configured;
    const warnings: string[] = [];
    if (env.useMock) warnings.push('Mock mode is on — this provider is not being used.');
    else if (!configured) warnings.push('Not configured — no data for this slot in real mode.');
    return { name: s.name, type: s.type, configured, active, warnings };
  });

  const realProvidersConfigured = providers.some((p) => p.configured);
  const globalWarnings: string[] = [];

  if (env.useMock) {
    globalWarnings.push(
      'Mock data mode is ON — analyses use simulated property and comparable data. Do not use these valuations for real offers.',
    );
    // Mock is the active provider in this mode.
    providers.unshift({
      name: 'Simulated Mock Provider',
      type: 'mock',
      configured: true,
      active: true,
      warnings: ['Simulated data for testing only — not licensed provider data.'],
    });
  } else if (!realProvidersConfigured) {
    globalWarnings.push(NO_PROVIDER_MESSAGE);
  }

  return {
    mockProviderEnabled: env.useMock,
    realProvidersConfigured,
    providers,
    globalWarnings,
  };
}

/** Read the live process env into a normalized ProviderEnv (fresh each call). */
export function readProviderEnv(): ProviderEnv {
  return {
    useMock: process.env.JARVIS_USE_MOCK_PROVIDER !== 'false',
    attomApiKey: process.env.ATTOM_API_KEY || undefined,
    mlsApiKey: process.env.MLS_API_KEY || undefined,
    rentProviderApiKey: process.env.RENT_PROVIDER_API_KEY || undefined,
    countyProviderApiKey: process.env.COUNTY_PROVIDER_API_KEY || undefined,
  };
}

/** Convenience: current provider status from the live environment. */
export function getProviderStatus(): ProviderStatus {
  return computeProviderStatus(readProviderEnv());
}

/** True when the app is running on the mock provider. */
export function isMockEnabled(): boolean {
  return readProviderEnv().useMock;
}
