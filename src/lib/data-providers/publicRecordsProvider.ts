/**
 * Public-records adapter (assessor / recorder: APN, tax, last sale).
 *
 * Placeholder for a compliant public-records API or official bulk/API access.
 * Public data must still be accessed lawfully — prefer official APIs over
 * scraping a county portal that forbids it. Falls back to mock until configured.
 */
import type { PublicRecordsProvider } from './providerTypes';

export const compliantPublicRecordsProvider: PublicRecordsProvider = {
  id: 'public_records_api',
  isConfigured: () => Boolean(process.env.COUNTY_PROVIDER_API_KEY),
  async getPublicRecord() {
    // TODO: call the compliant public-records API and map to PublicRecord.
    return null;
  },
};
