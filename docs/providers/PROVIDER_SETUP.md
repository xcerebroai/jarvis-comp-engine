# Provider Setup

How Jarvis Comp Engine sources data, and how to move it from mock data to real,
licensed providers.

## Principles (non-negotiable)

- **No scraping.** This app does **not** scrape Zillow, Redfin, Realtor, Trulia,
  Opendoor, MLS portals, or any site that prohibits automated access. It uses no
  browser automation against restricted sites. See
  [`docs/legal/DATA_SOURCING.md`](../legal/DATA_SOURCING.md).
- **Licensed access only.** Automated data requires legal/licensed provider
  access (ATTOM, an MLS/RESO Web API you are credentialed for, a compliant
  public-records API, a rent-data provider, etc.).
- **Mock mode is for testing only.** Its numbers are simulated and must never be
  used for real offers.
- **Manual paste / manual comps are a fallback only**, not the primary path.
- **External valuations are supporting context only.** An AVM never sets the
  final number — the app's **conservative ARV engine always makes the final
  valuation recommendation**.

## GitHub Pages demo (static hosting)

The live demo at **https://xcerebroai.github.io/jarvis-comp-engine/** is a
static export (`NEXT_PUBLIC_GITHUB_PAGES=true`). Because GitHub Pages is static
hosting:

- **It cannot use private API keys.** There is no server and no secret store, so
  no licensed provider can run there.
- **It uses mock data only.** The browser runs the same pure pipeline
  (`runClientMockAnalysis` → `runPropertyAnalysis` with the mock bundle) — no
  API route, no network calls.
- **Real provider activation requires a backend/server runtime** (a normal
  `next build` + `next start`, or any Node host) where env vars stay server-side.
- **Never put an API key in a `NEXT_PUBLIC_*` variable.** Those are inlined into
  the client bundle and would be publicly exposed. Provider keys
  (`DEALMACHINE_API_KEY`, etc.) are read only on the server and must never be prefixed
  `NEXT_PUBLIC_`.

## Modes

There is **no sample/mock mode in the server app**: real providers or an honest
error. The resolver (`src/lib/data-providers/index.ts`) supports:

### Real providers (the only server mode)
```
DEALMACHINE_API_KEY=dm_sk_live_...
```
DealMachine fills property facts, comparable sales, public records, and a
supporting value estimate. Slots with no configured provider stay inert with a
warning (e.g. rent). Missing comps → the analysis fails cleanly with an
"insufficient comparable data" error — no fabricated comps, ever.

### Nothing configured
Clean error:
> No real data provider is configured. Set DEALMACHINE_API_KEY (or configure another licensed data provider).

### GitHub Pages demo (the only simulated surface)
The static demo build (`NEXT_PUBLIC_GITHUB_PAGES=true`) pins the deterministic
mock bundle in-browser and labels everything "static public demo / mock data
only." The server resolver can never return mock data.

## Environment variables

```bash
DEALMACHINE_API_KEY=      # DealMachine: property, comps, records, value estimate
RENT_PROVIDER_API_KEY=    # optional future rent provider
RENT_PROVIDER_BASE_URL=
ANTHROPIC_API_KEY=        # Claude: paste-parsing + memo prose (never numbers)
DATABASE_URL="file:./dev.db"
```

## Providers and what they supply

| Provider (slot) | Env | Supplies |
| --- | --- | --- |
| **DealMachine** (`property`, `comps`, `county`, `valuation`) | `DEALMACHINE_API_KEY` | Subject facts; comparable sales with recorder `sale_type` (drives the non-disclosure flag); APN/tax/last-sale records; supporting value estimate — never the final ARV |
| **Rent Provider** (`rent`) | `RENT_PROVIDER_API_KEY` (+ `RENT_PROVIDER_BASE_URL`) | Estimated rent; rent confidence (future) |


## Implementing a real provider

The `Future*` adapters
(`src/lib/data-providers/{propertyDataProvider,comparableSalesProvider,rentProvider,publicRecordsProvider,valuationProvider}.ts`)
are stubs. Each one:

1. Reports `isConfigured()` from its required env var.
2. Refuses to run without **both** the API key and an explicit base URL.
3. Throws a clean, descriptive error until the real request/response mapping is
   implemented.

Before enabling any real call, **verify the exact endpoint, auth, query
parameters, and response→domain mapping against the provider's official API
documentation.** Do not guess undocumented endpoints. Map each provider response
into the normalized domain types (`SubjectProperty`, `Comp[]`, `PublicRecord`,
`ProviderValuation[]`, `RentEstimate`) and return the standard
`ProviderResponse` envelope:

```ts
{
  providerName: string;
  sourceType: string;               // property | comps | public_record | valuation | rent
  isMock: boolean;                  // false for licensed data
  fetchedAt: string;                // ISO timestamp
  confidence: 'low' | 'medium' | 'high' | 'testing_only';
  data: unknown;                    // the normalized domain payload
  warnings: string[];
}
```
