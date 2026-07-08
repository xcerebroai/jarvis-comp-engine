# Data Sourcing & Compliance Policy

Jarvis Comp Engine is a **private, internal** analysis tool. Its value comes
from good math on good data — not from harvesting data it isn't entitled to.
This document is the source of truth for how data may enter the app.

## Principles

1. **No ToS-breaking scraping.** We do not run automated crawlers/bots against
   Zillow, Redfin, Realtor.com, or any site whose Terms of Service prohibit
   automated access. No headless-browser scraping of those sites, no hitting
   their private/internal APIs.
2. **Manual paste is first-class.** The primary input is text the user has
   personally viewed and copied. Transcribing data you're looking at is not
   scraping.
3. **Automated data must be licensed.** Any automated feed must come from a
   source we are contractually allowed to use — e.g. an MLS/RESO Web API feed
   we're credentialed for, a paid data provider (ATTOM, CoreLogic, etc.), or a
   public-record API with permissive terms. These arrive as future
   `IngestionAdapter`s with `automated: true`.
4. **Public records, used lawfully.** County assessor / recorder data is often
   public, but access method still matters — prefer official bulk/API access or
   manual lookup over scraping a portal that forbids it.
5. **Attribution & retention.** Every ingested field carries a `DataSource`.
   Respect any licensing constraints on storage, display, and redistribution.

## The enforcement boundary

All external data enters through `src/lib/ingestion/adapters`. That's the only
layer allowed to touch raw input. Adapters are marked:

- `automated: false` — manual paste / user-supplied text (always allowed)
- `automated: true`  — licensed feed; MUST have a documented license before merge

If an adapter would require breaking a site's ToS to function, it does not get
built. No exceptions.

## Checklist before adding any automated adapter

- [ ] Written license / API terms permit our use case
- [ ] Terms permit storing + displaying the data internally
- [ ] Rate limits and attribution requirements are encoded in the adapter
- [ ] The adapter is documented here with its license reference
