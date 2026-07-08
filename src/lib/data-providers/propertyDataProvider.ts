/**
 * Licensed property-data adapter (subject facts: beds/baths/sqft/year/type).
 *
 * Placeholder for a real, licensed API (e.g. ATTOM, CoreLogic, a RESO/MLS Web
 * API feed you are credentialed for). It is `isConfigured() === false` until
 * its env key is set, so the resolver falls back to the mock. NEVER wire this
 * to a scraper of Zillow/Redfin/Realtor/Trulia/Opendoor/MLS.
 */
import type { PropertyDataProvider } from './providerTypes';

// ATTOM supplies subject facts (beds/baths/sqft/year/type). Read live so tests
// and runtime both see the current environment.
export const licensedPropertyProvider: PropertyDataProvider = {
  id: 'licensed_property_api',
  isConfigured: () => Boolean(process.env.ATTOM_API_KEY),
  async getProperty() {
    // TODO: call the licensed property API and map its response to
    // SubjectProperty. Until then, signal "no data" so we fall back.
    return null;
  },
};
