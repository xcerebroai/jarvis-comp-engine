/**
 * FutureRentProvider — estimated rent, rent confidence, and rental-comp support
 * where the licensed feed provides it. Used for hold-strategy cash flow.
 *
 * STUB: no network call yet. Refuses to run without BOTH key and base URL, and
 * throws until the real mapping is implemented.
 */
import type { RentProvider } from './providerTypes';

export const futureRentProvider: RentProvider = {
  id: 'rent',
  isConfigured: () => Boolean(process.env.RENT_PROVIDER_API_KEY),
  async getRentEstimate() {
    const key = process.env.RENT_PROVIDER_API_KEY;
    const baseUrl = process.env.RENT_PROVIDER_BASE_URL;
    if (!key)
      throw new Error('Rent provider is not configured (RENT_PROVIDER_API_KEY missing).');
    if (!baseUrl)
      throw new Error(
        'Rent provider has no RENT_PROVIDER_BASE_URL configured — refusing to call an unknown endpoint.',
      );
    // TODO: Implement the real rent-estimate lookup. Endpoint, params, and
    // response→RentEstimate mapping MUST be verified against the official rent
    // provider documentation before enabling. Do NOT guess endpoints.
    throw new Error(
      'Rent provider endpoint mapping is not implemented yet — verify against official provider docs before enabling.',
    );
  },
};

export const licensedRentProvider = futureRentProvider;
