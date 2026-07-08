## Summary

<!-- What does this PR change and why? -->

## Checklist

- [ ] Typecheck passes (`npx tsc --noEmit`)
- [ ] Lint passes (`npm run lint`)
- [ ] Tests pass (`npm test`)
- [ ] Build passes (`npm run build`)
- [ ] No secrets committed (no API keys, tokens, or `.env.local`)
- [ ] No restricted scraping added (no Zillow/Redfin/Realtor/Trulia/Opendoor/MLS crawling, no browser automation against restricted sites)
- [ ] Mock data warnings preserved (mock vs. real remains obvious in UI + memo)
- [ ] Provider source audit preserved (every analysis still records provenance)
- [ ] Manual paste / manual comps remain fallback only (not the primary path)
- [ ] Valuation logic remains conservative (external AVMs are supporting context only; the conservative ARV engine makes the final call)

## Notes

<!-- Anything reviewers should know: trade-offs, follow-ups, screenshots. -->
