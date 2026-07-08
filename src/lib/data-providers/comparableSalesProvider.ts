/**
 * FutureMlsResoProvider — comparable sales (sold + active listings) and, if
 * licensed, property details and listing history. Backed by a LICENSED MLS/RESO
 * Web API feed you are credentialed for.
 *
 * STUB: no network call yet. Refuses to run without BOTH key and base URL, and
 * throws until the real mapping is implemented. NEVER back this with scraping
 * of restricted listing sites.
 */
import type { ComparableSalesProvider } from './providerTypes';

export const futureMlsResoProvider: ComparableSalesProvider = {
  id: 'mls',
  isConfigured: () => Boolean(process.env.MLS_API_KEY),
  async getComparableSales() {
    const key = process.env.MLS_API_KEY;
    const baseUrl = process.env.MLS_BASE_URL;
    if (!key) throw new Error('MLS/RESO provider is not configured (MLS_API_KEY missing).');
    if (!baseUrl)
      throw new Error(
        'MLS/RESO provider has no MLS_BASE_URL configured — refusing to call an unknown endpoint.',
      );
    // TODO: Implement the real MLS/RESO comps query. The RESO resource/OData
    // query, auth, and response→Comp[] mapping MUST be verified against your
    // licensed MLS/RESO Web API documentation before enabling. Do NOT guess
    // endpoints. No scraping. No browser automation.
    throw new Error(
      'MLS/RESO comps endpoint mapping is not implemented yet — verify against your licensed MLS/RESO Web API docs before enabling.',
    );
  },
};

export const licensedComparablesProvider = futureMlsResoProvider;
