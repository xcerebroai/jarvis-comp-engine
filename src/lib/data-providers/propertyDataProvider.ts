/**
 * Licensed property-data adapter (subject facts: beds/baths/sqft/year/type).
 *
 * Placeholder for a real, licensed API (e.g. ATTOM, CoreLogic, a RESO/MLS Web
 * API feed you are credentialed for). It is `isConfigured() === false` until
 * its env key is set, so the resolver falls back to the mock. NEVER wire this
 * to a scraper of Zillow/Redfin/Realtor/Trulia/Opendoor/MLS.
 */
import type { PropertyDataProvider } from './providerTypes';

const API_KEY = process.env.JARVIS_PROPERTY_API_KEY;

export const licensedPropertyProvider: PropertyDataProvider = {
  id: 'licensed_property_api',
  isConfigured: () => Boolean(API_KEY),
  async getProperty() {
    // TODO: call the licensed property API and map its response to
    // SubjectProperty. Until then, signal "no data" so we fall back.
    return null;
  },
};
