/**
 * FutureCountyRecordsProvider — assessor / recorder data: tax assessed value,
 * deed/sale history, APN, and (only where legally available) owner and lien
 * details. Backed by a COMPLIANT public-records API or official bulk/API access.
 *
 * STUB: no network call yet. Refuses to run without BOTH key and base URL, and
 * throws until the real mapping is implemented. Public data must still be
 * accessed lawfully — prefer official APIs over scraping a county portal.
 */
import type { PublicRecordsProvider } from './providerTypes';

export const futureCountyRecordsProvider: PublicRecordsProvider = {
  id: 'county',
  isConfigured: () => Boolean(process.env.COUNTY_PROVIDER_API_KEY),
  async getPublicRecord() {
    const key = process.env.COUNTY_PROVIDER_API_KEY;
    const baseUrl = process.env.COUNTY_PROVIDER_BASE_URL;
    if (!key)
      throw new Error('County records provider is not configured (COUNTY_PROVIDER_API_KEY missing).');
    if (!baseUrl)
      throw new Error(
        'County records provider has no COUNTY_PROVIDER_BASE_URL configured — refusing to call an unknown endpoint.',
      );
    // TODO: Implement the real public-records lookup against a COMPLIANT API.
    // Endpoint, params, and response→PublicRecord mapping MUST be verified
    // against the official provider documentation before enabling. Only surface
    // owner/lien fields where legally permitted. No scraping of county portals
    // that prohibit automated access.
    throw new Error(
      'County records endpoint mapping is not implemented yet — verify against official compliant public-records API docs before enabling.',
    );
  },
};

export const compliantPublicRecordsProvider = futureCountyRecordsProvider;
