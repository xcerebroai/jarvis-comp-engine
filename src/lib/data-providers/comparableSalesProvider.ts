/**
 * Licensed comparable-sales adapter (sold + active listings).
 *
 * Placeholder for a licensed comps feed. Falls back to mock until configured.
 * NEVER back this with scraping of restricted listing sites.
 */
import type { ComparableSalesProvider } from './providerTypes';

const API_KEY = process.env.JARVIS_COMPS_API_KEY;

export const licensedComparablesProvider: ComparableSalesProvider = {
  id: 'licensed_comps_api',
  isConfigured: () => Boolean(API_KEY),
  async getComparables() {
    // TODO: call the licensed comps API and map results to Comp[].
    return [];
  },
};
