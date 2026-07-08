/**
 * Licensed valuation (AVM) adapter. Used only as a sanity check against the
 * comp-derived ARV — never to inflate it. Falls back to mock until configured.
 */
import type { ValuationProvider } from './providerTypes';

// ATTOM's AVM. Shares the ATTOM key with the property provider.
export const licensedValuationProvider: ValuationProvider = {
  id: 'licensed_valuation_api',
  isConfigured: () => Boolean(process.env.ATTOM_API_KEY),
  async getValuation() {
    // TODO: call the licensed AVM API and map to ProviderValuation.
    return null;
  },
};
