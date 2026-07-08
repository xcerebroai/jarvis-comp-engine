/**
 * Licensed rent-estimate adapter (for hold-strategy cash flow). Falls back to
 * mock until configured.
 */
import type { RentProvider } from './providerTypes';

export const licensedRentProvider: RentProvider = {
  id: 'licensed_rent_api',
  isConfigured: () => Boolean(process.env.RENT_PROVIDER_API_KEY),
  async getRent() {
    // TODO: call the licensed rent API and map to RentEstimate.
    return null;
  },
};
