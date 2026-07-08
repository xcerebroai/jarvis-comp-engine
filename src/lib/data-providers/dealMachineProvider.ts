/**
 * DealMachine — the licensed real-data provider (official REST API only; no
 * scraping). Documented at https://api.docs.dealmachine.com:
 *
 *   POST /v1/enrichment/address  { data: [{ full_address }] }         → property record
 *   POST /v1/comps               { property_ids, location, criteria } → comps + value estimate
 *   Auth: Authorization: Bearer $DEALMACHINE_API_KEY   (server-side only)
 *
 * Fills the property, comps, public-records, and valuation slots from those two
 * endpoints. DealMachine's own value_estimation is passed through ONLY as a
 * supporting ProviderValuation — it is never the ARV, and its confidence_level
 * is never fed to our engine (the engine derives confidence from its own graded
 * comp set). Raw responses are cached per address for the process lifetime so
 * one analysis run makes at most two API calls (DealMachine also dedupes
 * credits server-side within a billing cycle).
 */
import { DEALMACHINE_RULES } from '@/config/analysisConfig';
import type {
  Comp,
  NormalizedAddress,
  ProviderValuation,
  PublicRecord,
  SubjectProperty,
} from '@/lib/types';
import type {
  ComparableSalesProvider,
  PropertyDataProvider,
  ProviderContext,
  ProviderResponse,
  PublicRecordsProvider,
  ValuationProvider,
} from './providerTypes';

const BASE_URL = 'https://api.v2.dealmachine.com/v1';
const PROVIDER_NAME = 'DealMachine';

type Rec = Record<string, unknown>;
const isRec = (v: unknown): v is Rec => typeof v === 'object' && v !== null && !Array.isArray(v);
const num = (v: unknown): number | undefined => (typeof v === 'number' && Number.isFinite(v) ? v : undefined);
const str = (v: unknown): string | undefined => (typeof v === 'string' && v.length > 0 ? v : undefined);

function apiKey(): string | undefined {
  return process.env.DEALMACHINE_API_KEY || undefined;
}

async function post(path: string, body: unknown): Promise<Rec> {
  const key = apiKey();
  if (!key) throw new Error('DealMachine is not configured (DEALMACHINE_API_KEY missing).');
  const res = await fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error(`DealMachine ${path} returned non-JSON (HTTP ${res.status}).`);
  }
  if (!res.ok) {
    throw new Error(`DealMachine ${path} failed (HTTP ${res.status}): ${JSON.stringify(json).slice(0, 300)}`);
  }
  if (!isRec(json)) throw new Error(`DealMachine ${path} returned an unexpected shape.`);
  return json;
}

/* ------------------------------ raw fetchers ----------------------------- */

/** Enrichment record for a matched address (flat property fields). */
export interface DmEnriched {
  record: Rec;
  propertyId: string;
}

// Process-lifetime caches so one analysis run = at most two API calls.
const enrichCache = new Map<string, Promise<DmEnriched | null>>();
const compsCache = new Map<string, Promise<Rec | null>>();

function cacheKeyFor(address: NormalizedAddress): string {
  return address.key || address.formatted.toLowerCase();
}

async function enrichAddress(address: NormalizedAddress): Promise<DmEnriched | null> {
  const key = cacheKeyFor(address);
  const cached = enrichCache.get(key);
  if (cached) return cached;
  const p = (async () => {
    const json = await post('/enrichment/address', {
      data: [{ full_address: address.formatted }],
    });
    const entries = Array.isArray(json.data) ? json.data.filter(isRec) : [];
    const match = entries.find((e) => e.matched === true);
    if (!match) return null;
    const propertyId = str(match.dm_property_id);
    if (!propertyId) return null;
    return { record: match, propertyId };
  })();
  enrichCache.set(key, p);
  p.catch(() => enrichCache.delete(key)); // don't cache failures
  return p;
}

/** The `data[0]` entry of the /comps response: { subject, comps, summary, value_estimation }. */
async function fetchComps(propertyId: string): Promise<Rec | null> {
  const cached = compsCache.get(propertyId);
  if (cached) return cached;
  const p = (async () => {
    const json = await post('/comps', {
      property_ids: [propertyId],
      location: { type: 'radius', radius_miles: DEALMACHINE_RULES.radiusMiles },
      criteria: {
        timeframe: DEALMACHINE_RULES.timeframe,
        sort_by: DEALMACHINE_RULES.sortBy,
        limit: DEALMACHINE_RULES.limit,
      },
    });
    const entries = Array.isArray(json.data) ? json.data.filter(isRec) : [];
    return entries[0] ?? null;
  })();
  compsCache.set(propertyId, p);
  p.catch(() => compsCache.delete(propertyId));
  return p;
}

/** Test hook: clear caches between test cases. */
export function _clearDealMachineCaches(): void {
  enrichCache.clear();
  compsCache.clear();
}

/* -------------------------------- mappers -------------------------------- */

export function mapSubject(record: Rec, address: NormalizedAddress, propertyId: string): SubjectProperty {
  return {
    address,
    propertyType: 'single_family', // DealMachine comps are SFH-focused; enrichment omits type
    facts: {
      beds: num(record.num_bedrooms),
      baths: num(record.num_bathrooms),
      sqft: num(record.living_area_sqft),
      lotSqft: num(record.lot_size_sqft),
      yearBuilt: num(record.year_built),
    },
    condition: 'unknown', // condition comes from the investor's repair intel, not the API
    providerValueEstimate: num(record.estimated_value),
    externalIds: { dealmachine: propertyId },
    sources: ['dealmachine'],
  };
}

export function mapPublicRecord(record: Rec): PublicRecord {
  return {
    apn: str(record.apn),
    lastSalePrice: num(record.last_sale_amount),
    lastSaleDate: str(record.last_sale_date),
    taxAssessedValue: num(record.total_assessed_value),
    annualTaxes: num(record.annual_property_tax_amount),
    lotSqft: num(record.lot_size_sqft),
    yearBuilt: num(record.year_built),
    source: 'dealmachine',
  };
}

/** Map one raw DealMachine comp into the domain Comp. Null when unusable. */
export function mapComp(raw: Rec, index: number): Comp | null {
  const salePrice = num(raw.sale_price);
  const isListing = raw.type === 'listing';
  // Sold comps must carry a real sale price. Listings use list price if present;
  // we never substitute a modeled estimate as a price.
  const listPrice = num(raw.list_price) ?? num(raw.price);
  const price = isListing ? listPrice : salePrice;
  if (price == null || price <= 0) return null;

  const [cityPart, statePart, zipPart] = String(raw.display_line_2 ?? '')
    .split(',')
    .map((s) => s.trim());

  return {
    id: str(raw.dm_property_id) ?? `dm-comp-${index + 1}`,
    address: {
      street: str(raw.display_line_1) ?? str(raw.address) ?? `Comp ${index + 1}`,
      city: cityPart ?? '',
      state: statePart ?? '',
      zip: zipPart ?? '',
    },
    facts: {
      beds: num(raw.bedrooms),
      baths: num(raw.bathrooms),
      sqft: num(raw.sqft),
      yearBuilt: num(raw.year_built),
    },
    condition: 'unknown',
    price,
    status: isListing ? 'active' : 'sold',
    date: str(raw.sale_date) ?? str(raw.list_date) ?? '',
    distanceMiles: num(raw.distance) ?? 0,
    saleType: str(raw.sale_type),
    source: 'dealmachine',
  };
}

export function mapValuation(entry: Rec): ProviderValuation | null {
  const ve = entry.value_estimation;
  if (!isRec(ve)) return null;
  const estimate = num(ve.estimated_value);
  if (estimate == null) return null;
  const ci = isRec(ve.confidence_interval) ? ve.confidence_interval : {};
  return {
    estimate,
    low: num(ci.low) ?? estimate,
    high: num(ci.high) ?? estimate,
    // Deliberately NOT DealMachine's confidence_level — supporting context
    // only; our engine derives its own confidence from its graded comp set.
    confidence: 0.5,
    source: 'dealmachine',
  };
}

/* ------------------------------- envelope -------------------------------- */

function envelope<T>(sourceType: string, data: T, ctx: ProviderContext, warnings: string[] = []): ProviderResponse<T> {
  return {
    providerName: PROVIDER_NAME,
    sourceType,
    isMock: false,
    fetchedAt: ctx.asOf,
    confidence: 'medium',
    data,
    warnings,
  };
}

/* ------------------------------- providers ------------------------------- */

export const dealMachinePropertyProvider: PropertyDataProvider = {
  id: 'dealmachine',
  isConfigured: () => Boolean(apiKey()),
  async getPropertyByAddress(address, ctx) {
    const hit = await enrichAddress(address);
    if (!hit) {
      return envelope('property', null, ctx, [
        `DealMachine found no property at "${address.formatted}". Check the address; misses are free.`,
      ]);
    }
    return envelope('property', mapSubject(hit.record, address, hit.propertyId), ctx);
  },
};

export const dealMachineCompsProvider: ComparableSalesProvider = {
  id: 'dealmachine',
  isConfigured: () => Boolean(apiKey()),
  async getComparableSales(address, subject, ctx) {
    const propertyId = subject.externalIds?.dealmachine ?? (await enrichAddress(address))?.propertyId;
    if (!propertyId) return envelope('comps', [] as Comp[], ctx, ['No DealMachine property id — comps unavailable.']);
    const entry = await fetchComps(propertyId);
    if (!entry) return envelope('comps', [] as Comp[], ctx, ['DealMachine returned no comps entry.']);

    const rawComps = Array.isArray(entry.comps) ? entry.comps.filter(isRec) : [];
    const mapped = rawComps.map(mapComp).filter((c): c is Comp => c !== null);
    const dropped = rawComps.length - mapped.length;

    const warnings: string[] = [];
    const total = num(entry.total_comps_found) ?? mapped.length;
    if (total === 0) warnings.push('DealMachine found no comparable sales for this property/criteria.');
    else if (total < 3)
      warnings.push(`DealMachine found only ${total} comp${total === 1 ? '' : 's'} — thin comp data; treat the value with caution.`);
    if (dropped > 0) warnings.push(`${dropped} comp record${dropped === 1 ? '' : 's'} dropped (no usable price).`);
    return envelope('comps', mapped, ctx, warnings);
  },
};

export const dealMachinePublicRecordsProvider: PublicRecordsProvider = {
  id: 'dealmachine',
  isConfigured: () => Boolean(apiKey()),
  async getPublicRecord(address, ctx) {
    const hit = await enrichAddress(address);
    if (!hit) return envelope('public_record', null, ctx, ['No property matched — no public record.']);
    return envelope('public_record', mapPublicRecord(hit.record), ctx);
  },
};

export const dealMachineValuationProvider: ValuationProvider = {
  id: 'dealmachine',
  isConfigured: () => Boolean(apiKey()),
  async getExternalValuations(address, subject, ctx) {
    const propertyId = subject.externalIds?.dealmachine ?? (await enrichAddress(address))?.propertyId;
    if (!propertyId) return envelope('valuation', [] as ProviderValuation[], ctx);
    const entry = await fetchComps(propertyId);
    const valuation = entry ? mapValuation(entry) : null;
    return envelope('valuation', valuation ? [valuation] : [], ctx, [
      'DealMachine value estimate is supporting context only — never the final ARV.',
    ]);
  },
};
