# Parsers

Format-specific text parsers that turn **pasted** content into normalized
`Subject` / `Comp` objects. Each parser is a pure function:

```ts
(raw: string) => { subject?: Partial<Subject>; comps: Comp[]; warnings: string[] }
```

Planned parsers (all operate on user-pasted text — no network calls):

- `zillow.ts` — Zillow listing / price-history paste
- `redfin.ts` — Redfin listing paste
- `realtor.ts` — Realtor.com listing paste
- `county.ts` — county assessor / records paste
- `mlsNotes.ts` — MLS agent remarks
- `notes.ts` — free-form seller / repair / inspection notes

Keep parsers dumb and defensive: pasted data is messy and partial. Emit
`warnings` for anything unparsed rather than guessing.
