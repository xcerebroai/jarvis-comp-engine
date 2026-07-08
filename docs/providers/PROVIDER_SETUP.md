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

## Modes

The resolver (`src/lib/data-providers/index.ts`) supports exactly three modes:

### Mode A — Mock (default)
```
JARVIS_USE_MOCK_PROVIDER=true
```
Runs entirely on the deterministic mock provider. No network calls. A loud
"Mock Data" warning is shown throughout the UI and deal memo.

### Mode B — Real providers
```
JARVIS_USE_MOCK_PROVIDER=false
# + at least one real provider configured (see below)
```
Uses each configured licensed provider. Unconfigured slots are left **inert**
(they supply nothing) — the app never silently falls back to mock data. Missing
optional data degrades gracefully with warnings:

- **No rent provider** → subject-to and creative-finance cash-flow confidence
  drops, with a warning.
- **No comps provider** (and no manual comps) → the analysis fails cleanly with
  an "insufficient comparable data" error.
- **No public-records provider** → a warning is shown, but the analysis
  continues.
- **No external-valuation provider** → no problem; valuations are optional
  supporting context.

### Mode C — Invalid production
```
JARVIS_USE_MOCK_PROVIDER=false
# and NO real provider configured
```
Returns a clean error:
> No real data provider is configured. Enable mock mode for testing or configure a licensed data provider.

## Environment variables

```bash
JARVIS_USE_MOCK_PROVIDER=true   # true = mock; false = real providers
ATTOM_API_KEY=                  # subject facts + AVM (ATTOM)
MLS_API_KEY=                    # comparable sales (MLS/RESO)
RENT_PROVIDER_API_KEY=          # rent estimates
COUNTY_PROVIDER_API_KEY=        # county / public records
```

Optional future variables — a provider is considered *configured* once its API
key is present, but **no real call is made until its base URL is also set**:

```bash
ATTOM_BASE_URL=
MLS_BASE_URL=
RENT_PROVIDER_BASE_URL=
COUNTY_PROVIDER_BASE_URL=
```

Copy `.env.example` to `.env.local` and fill in the values you have. Restart the
dev/prod server after changing env. View live status at **`/settings/providers`**.

## Providers and what they supply

| Provider (slot) | Env | Supplies |
| --- | --- | --- |
| **Mock Provider** | `JARVIS_USE_MOCK_PROVIDER=true` | Simulated everything — testing only |
| **ATTOM Property Data** (`property`) | `ATTOM_API_KEY` (+ `ATTOM_BASE_URL`) | Subject property facts; public record data; tax data; sale history; comparable sale data if supported by the configured endpoint |
| **MLS / RESO Provider** (`comps`) | `MLS_API_KEY` (+ `MLS_BASE_URL`) | MLS sold comps; property details; listing history if licensed |
| **Rent Provider** (`rent`) | `RENT_PROVIDER_API_KEY` (+ `RENT_PROVIDER_BASE_URL`) | Estimated rent; rent confidence; rental comparable support if available |
| **County Records Provider** (`county`) | `COUNTY_PROVIDER_API_KEY` (+ `COUNTY_PROVIDER_BASE_URL`) | Owner info if legally available; tax assessed value; deed history; liens if legally available; public record details |
| **Valuation Provider** (`valuation`) | `ATTOM_API_KEY` (+ `ATTOM_BASE_URL`) | External valuation estimates — supporting context only, never the final ARV |

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
