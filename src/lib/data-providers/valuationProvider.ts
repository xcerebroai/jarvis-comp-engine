/**
 * FutureValuationProvider — external AVM / valuation estimates. These are
 * SUPPORTING CONTEXT ONLY and are never the final ARV; the conservative ARV
 * engine always makes the final valuation recommendation.
 *
 * STUB: no network call yet. Refuses to run without BOTH key and base URL, and
 * throws until the real mapping is implemented. Shares the ATTOM key (ATTOM AVM)
 * unless a dedicated valuation feed is added later.
 */
import type { ValuationProvider } from './providerTypes';

export const futureValuationProvider: ValuationProvider = {
  id: 'valuation',
  isConfigured: () => Boolean(process.env.ATTOM_API_KEY),
  async getExternalValuations() {
    const key = process.env.ATTOM_API_KEY;
    const baseUrl = process.env.ATTOM_BASE_URL;
    if (!key)
      throw new Error('Valuation provider is not configured (ATTOM_API_KEY missing).');
    if (!baseUrl)
      throw new Error(
        'Valuation provider has no ATTOM_BASE_URL configured — refusing to call an unknown endpoint.',
      );
    // TODO: Implement the real AVM lookup. Endpoint, params, and
    // response→ProviderValuation[] mapping MUST be verified against official
    // provider (ATTOM AVM) documentation before enabling. External valuations
    // are supporting context only — never the final ARV.
    throw new Error(
      'Valuation provider endpoint mapping is not implemented yet — verify against official AVM API docs before enabling.',
    );
  },
};

export const licensedValuationProvider = futureValuationProvider;
