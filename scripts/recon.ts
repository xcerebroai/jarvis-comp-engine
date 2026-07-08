/**
 * PHASE 1 RECON — DealMachine comps endpoint discovery.
 *
 * Usage:  npm run recon -- "123 Main St, Austin, TX 78701" [radiusMiles] [timeframe]
 *
 * Flow (per official docs at https://api.docs.dealmachine.com):
 *   1. POST /v1/enrichment/address  { data: [{ full_address }] }  -> property record + ID
 *   2. POST /v1/comps               { property_ids, location, criteria } -> comps + value estimate
 *
 * Prints the FULL raw JSON of both responses, then a flattened per-comp summary
 * (address, sold price, sold date, distance, sqft, beds, baths, year built,
 * similarity/match score if present), and saves the raw comps response to
 * fixtures/<slug>.json.
 *
 * NOTE: fixtures/ is git-ignored — this repo is public and DealMachine responses
 * are licensed data that must not be redistributed.
 *
 * Auth: Authorization: Bearer $DEALMACHINE_API_KEY (loaded from .env.local).
 * Costs ~1-2 property data credits per run. No scraping — official API only.
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const BASE_URL = 'https://api.v2.dealmachine.com/v1';

/* ------------------------- env (.env.local) loader ----------------------- */

function loadEnvLocal(): void {
  if (process.env.DEALMACHINE_API_KEY) return;
  const path = join(process.cwd(), '.env.local');
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const m = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim();
  }
}

/* --------------------------------- http --------------------------------- */

async function post(path: string, body: unknown, key: string): Promise<unknown> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error(`${path} returned non-JSON (HTTP ${res.status}): ${text.slice(0, 400)}`);
  }
  if (!res.ok) {
    throw new Error(`${path} failed (HTTP ${res.status}): ${JSON.stringify(json).slice(0, 600)}`);
  }
  return json;
}

/* ------------------------- defensive field access ------------------------ */

type Rec = Record<string, unknown>;
const isRec = (v: unknown): v is Rec => typeof v === 'object' && v !== null && !Array.isArray(v);

/** First defined value among candidate key paths (supports "a.b" nesting). */
function pick(obj: Rec, ...paths: string[]): unknown {
  for (const p of paths) {
    let cur: unknown = obj;
    for (const part of p.split('.')) {
      if (!isRec(cur)) {
        cur = undefined;
        break;
      }
      cur = cur[part];
    }
    if (cur !== undefined && cur !== null) return cur;
  }
  return undefined;
}

const show = (v: unknown): string =>
  v === undefined || v === null ? '—' : typeof v === 'object' ? JSON.stringify(v) : String(v);

/** Find the first array of objects in a response envelope (data, comps, results…). */
function findCompArray(json: unknown): Rec[] {
  if (Array.isArray(json)) return json.filter(isRec);
  if (!isRec(json)) return [];
  for (const key of ['comps', 'comparables', 'data', 'results', 'properties']) {
    const v = json[key];
    if (Array.isArray(v) && v.some(isRec)) return v.filter(isRec);
    if (isRec(v)) {
      const nested = findCompArray(v);
      if (nested.length) return nested;
    }
  }
  return [];
}

/* ---------------------------------- main --------------------------------- */

async function main(): Promise<void> {
  loadEnvLocal();
  const key = process.env.DEALMACHINE_API_KEY;
  if (!key) {
    console.error('DEALMACHINE_API_KEY is not set. Add it to .env.local (git-ignored).');
    process.exit(1);
  }

  const address = process.argv[2];
  if (!address) {
    console.error('Usage: npm run recon -- "123 Main St, City, ST 12345" [radiusMiles] [timeframe]');
    process.exit(1);
  }
  const radiusMiles = Number(process.argv[3] ?? '1');
  const timeframe = process.argv[4] ?? '12months';

  console.log(`\n━━━ 1. POST /enrichment/address — resolving "${address}" ━━━`);
  const enrich = await post('/enrichment/address', { data: [{ full_address: address }] }, key);
  console.log(JSON.stringify(enrich, null, 2));

  // Enrichment envelope: { data: [{ input, matched, property? | match_failure }] }
  const entries = findCompArray(enrich).filter((e) => e.matched !== false);
  if (entries.length === 0) {
    console.error('\nNo property matched this address — no comps requested. (Misses are free.)');
    process.exit(2);
  }
  const entry = entries[0];
  const subject = isRec(entry.property) ? entry.property : entry;
  const propertyId = pick(subject, 'dm_property_id', 'id', 'property_id', 'dealmachine_id');
  if (propertyId === undefined) {
    console.error('\nMatched a record but found no id field. Keys:', Object.keys(subject).join(', '));
    process.exit(2);
  }
  console.log(`\nSubject property id: ${show(propertyId)}`);

  console.log(`\n━━━ 2. POST /comps — radius ${radiusMiles}mi, timeframe ${timeframe} ━━━`);
  const comps = await post(
    '/comps',
    {
      property_ids: [String(propertyId)],
      location: { type: 'radius', radius_miles: radiusMiles },
      criteria: { timeframe, sort_by: 'match', limit: 25 },
    },
    key,
  );

  console.log('\n━━━ RAW COMPS RESPONSE ━━━');
  console.log(JSON.stringify(comps, null, 2));

  // Save fixture (git-ignored — licensed data, public repo).
  const slug = address
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  mkdirSync(join(process.cwd(), 'fixtures'), { recursive: true });
  const fixturePath = join(process.cwd(), 'fixtures', `${slug}.json`);
  writeFileSync(fixturePath, JSON.stringify({ address, enrich, comps }, null, 2));
  console.log(`\nSaved raw response → ${fixturePath}`);

  // Flattened per-comp summary. Discovered envelope:
  //   { data: [{ dm_property_id, found, subject, comps: [...], summary, value_estimation }] }
  const compEntry = findCompArray(comps)[0];
  const rows =
    compEntry && Array.isArray(compEntry.comps) ? compEntry.comps.filter(isRec) : findCompArray(comps);
  console.log(`\n━━━ FLATTENED COMPS (${rows.length}) ━━━`);
  if (rows.length === 0) {
    console.log('No comp array found in the response — inspect the raw JSON above.');
  } else {
    console.log('Keys on first comp:', Object.keys(rows[0]).join(', '));
    console.log('');
    for (const [i, c] of rows.entries()) {
      const line = [
        `#${String(i + 1).padStart(2, '0')}`,
        show(pick(c, 'display_line_1', 'address', 'full_address')),
        `sold: ${show(pick(c, 'sale_price', 'sold_price', 'last_sale_amount'))}`,
        `date: ${String(show(pick(c, 'sale_date', 'sold_date', 'last_sale_date'))).slice(0, 10)}`,
        `dist: ${show(pick(c, 'distance', 'distance_miles'))}mi`,
        `sqft: ${show(pick(c, 'sqft', 'living_area_sqft'))}`,
        `bd: ${show(pick(c, 'bedrooms', 'num_bedrooms'))}`,
        `ba: ${show(pick(c, 'bathrooms', 'num_bathrooms'))}`,
        `yr: ${show(pick(c, 'year_built'))}`,
        `match: ${show(pick(c, 'match_score.overall', 'match_score', 'similarity_score'))}`,
      ].join(' | ');
      console.log(line);
    }
  }
  console.log('\nRecon complete.');
}

main().catch((e: unknown) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
