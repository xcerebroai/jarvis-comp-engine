# Contributing

Thanks for helping build Jarvis Comp Engine. This project analyzes real money
decisions, so correctness, conservatism, and compliance come first.

## Workflow

1. **Branch off `main`.** No direct commits to `main`.
   - Branch naming: `feat/…`, `fix/…`, `chore/…`, `docs/…`, `refactor/…`,
     `test/…` (e.g. `feat/pdf-export`, `fix/arv-rounding`).
2. **Make focused changes** with clear commits.
3. **Run all checks before opening a PR** (see below).
4. **Open a PR** and fill in the checklist in the PR template.
5. A green CI run is required. Squash or keep history tidy.

## Run checks before a PR

```bash
npm run lint
npx tsc --noEmit
npm test
npm run build
```

All four must pass. CI runs the same steps on every PR and push to `main`.

## Project principles

- **No scraping.** Never add code that crawls or hits the private APIs of
  Zillow/Redfin/Realtor/Trulia/Opendoor/MLS, and no browser automation against
  restricted sites. Licensed/compliant providers only. See
  [`docs/legal/DATA_SOURCING.md`](docs/legal/DATA_SOURCING.md).
- **Keep domain math pure and testable.** Everything in `src/lib/analysis/**`
  (and `src/lib/domain/**`) should be pure functions — no I/O, no `Date.now()`
  baked into logic — so it stays deterministic and unit-testable. Add or update
  Vitest tests alongside logic changes.
- **Keep provider adapters isolated.** External data enters only through the
  provider interfaces in `src/lib/data-providers`. Adapters normalize into the
  shared domain types and return the standard `ProviderResponse` envelope. New
  data sources are new adapters, never inline fetches in the pipeline.
- **Keep mock-data warnings visible.** Mock vs. real must remain unmistakable in
  the UI, deal memo, and source audit. Don't weaken or hide these.
- **Be conservative by default.** ARV leans low, repairs round up, offers keep a
  real profit floor. External AVMs are supporting context only — the conservative
  ARV engine makes the final valuation call. Tunable numbers live in
  `src/config`, not hard-coded in logic.
- **Manual paste / manual comps are fallback only**, not the primary path.

## Security

Never commit secrets or private data. See [`SECURITY.md`](SECURITY.md). Use
`.env.local` for keys; keep `.env.example` blank.
