/**
 * FutureAttomProvider — subject property facts (beds/baths/sqft/year/type) and,
 * where the licensed endpoint supports it, public-record / tax / sale-history
 * context. Backed by a LICENSED ATTOM API when configured.
 *
 * This is a STUB. It never makes a network call yet. It refuses to run unless
 * BOTH the API key and an explicit base URL are present, and even then throws
 * because the real request/response mapping is not implemented. NEVER wire this
 * to a scraper of Zillow/Redfin/Realtor/Trulia/Opendoor/MLS.
 */
import type { PropertyDataProvider } from './providerTypes';

export const futureAttomProvider: PropertyDataProvider = {
  id: 'attom',
  // "Configured" = the API key is present. A base URL is additionally required
  // before any call is permitted (see below).
  isConfigured: () => Boolean(process.env.ATTOM_API_KEY),
  async getPropertyByAddress() {
    const key = process.env.ATTOM_API_KEY;
    const baseUrl = process.env.ATTOM_BASE_URL;
    if (!key)
      throw new Error('ATTOM provider is not configured (ATTOM_API_KEY missing).');
    if (!baseUrl)
      throw new Error(
        'ATTOM provider has no ATTOM_BASE_URL configured — refusing to call an unknown endpoint.',
      );
    // TODO: Implement the real ATTOM property lookup. The exact endpoint path,
    // request params, auth header, and response→SubjectProperty mapping MUST be
    // verified against official ATTOM API documentation before enabling. Do NOT
    // guess endpoints. No scraping. No browser automation.
    throw new Error(
      'ATTOM property endpoint mapping is not implemented yet — verify against official ATTOM API docs before enabling.',
    );
  },
};

// Back-compat alias for existing imports.
export const licensedPropertyProvider = futureAttomProvider;
