/**
 * DealMachine mapping tests, driven by the saved recon fixture. fixtures/ is
 * git-ignored (licensed data, public repo), so the fixture-backed suite skips
 * cleanly when absent — e.g. in public CI — and runs locally after
 * `npm run recon`.
 */
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { mapComp, mapPublicRecord, mapSubject, mapValuation } from './dealMachineProvider';
import { normalizeAddress } from './addressNormalizer';

type Rec = Record<string, unknown>;

const FIXTURE_PATH = join(process.cwd(), 'fixtures', '671-lincoln-ave-winnetka-il-60093.json');
const hasFixture = existsSync(FIXTURE_PATH);

function loadFixture(): { enrichRecord: Rec; compsEntry: Rec } {
  const raw = JSON.parse(readFileSync(FIXTURE_PATH, 'utf8'));
  return {
    enrichRecord: raw.enrich.data[0] as Rec,
    compsEntry: raw.comps.data[0] as Rec,
  };
}

describe.skipIf(!hasFixture)('DealMachine mappers (recon fixture)', () => {
  const { enrichRecord, compsEntry } = hasFixture
    ? loadFixture()
    : { enrichRecord: {} as Rec, compsEntry: {} as Rec };
  const address = normalizeAddress({ fullAddress: '671 Lincoln Ave, Winnetka, IL 60093' });

  it('maps the enrichment record to a SubjectProperty with the DealMachine id', () => {
    const subject = mapSubject(enrichRecord, address, String(enrichRecord.dm_property_id));
    expect(subject.externalIds?.dealmachine).toMatch(/^prop_/);
    expect(subject.facts.sqft).toBe(5083);
    expect(subject.facts.beds).toBe(6);
    expect(subject.facts.yearBuilt).toBe(1921);
    expect(subject.providerValueEstimate).toBeGreaterThan(0);
    expect(subject.sources).toContain('dealmachine');
    // Condition is investor-supplied, never inferred from the API.
    expect(subject.condition).toBe('unknown');
  });

  it('maps the enrichment record to a PublicRecord (APN, taxes, last sale)', () => {
    const rec = mapPublicRecord(enrichRecord);
    expect(rec.apn).toBeTruthy();
    expect(rec.lastSalePrice).toBe(5500000);
    expect(rec.taxAssessedValue).toBeGreaterThan(0);
    expect(rec.source).toBe('dealmachine');
  });

  it('maps every fixture comp with a real sale price; sold comps keep sale_type', () => {
    const rawComps = (compsEntry.comps as Rec[]) ?? [];
    expect(rawComps.length).toBeGreaterThan(0);
    const mapped = rawComps.map((c, i) => mapComp(c, i));
    for (const [i, m] of mapped.entries()) {
      expect(m, `comp ${i}`).not.toBeNull();
      expect(m!.price).toBeGreaterThan(0);
      expect(m!.status).toBe('sold');
      expect(m!.saleType).toBeTruthy();
      expect(m!.distanceMiles).toBeGreaterThanOrEqual(0);
      expect(m!.source).toBe('dealmachine');
    }
  });

  it('never substitutes a modeled estimate as a price', () => {
    // A "sale" with no sale_price must be dropped, not priced from estimated_value.
    const m = mapComp({ type: 'sale', estimated_value: 500000, display_line_1: 'X St' }, 0);
    expect(m).toBeNull();
  });

  it('maps value_estimation to a supporting ProviderValuation (never their confidence_level)', () => {
    const v = mapValuation(compsEntry);
    expect(v).not.toBeNull();
    expect(v!.estimate).toBe(3359863);
    expect(v!.low).toBeLessThan(v!.estimate);
    expect(v!.high).toBeGreaterThan(v!.estimate);
    // Fixed neutral confidence — DealMachine's own confidence_level is never ingested.
    expect(v!.confidence).toBe(0.5);
    expect(v!.source).toBe('dealmachine');
  });
});
