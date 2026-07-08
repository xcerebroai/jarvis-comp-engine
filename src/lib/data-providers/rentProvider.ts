/**
 * Licensed rent-estimate adapter (for hold-strategy cash flow). Falls back to
 * mock until configured.
 */
import type { RentProvider } from './providerTypes';

const API_KEY = process.env.JARVIS_RENT_API_KEY;

export const licensedRentProvider: RentProvider = {
  id: 'licensed_rent_api',
  isConfigured: () => Boolean(API_KEY),
  async getRent() {
    // TODO: call the licensed rent API and map to RentEstimate.
    return null;
  },
};
