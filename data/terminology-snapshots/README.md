# Terminology Snapshots

This folder stores compressed, redistributable terminology source snapshots used
to generate local-first terminology packs.

These files are intentionally source snapshots, not the runtime IndexedDB pack
format. Runtime packs should still be generated through importer scripts so the
app can stay modular and support licensed or user-supplied sources later.

Included now:

- Health Canada CCDD main CSV files, concatenated and gzipped.
- CDC CVX vaccine code table, gzipped from the current HTML table payload.
- PHAC National Vaccine Catalogue FHIR Bundle, gzipped from the public API.
- Health Canada DPD marketed `allfiles.zip`, kept in its original compressed
  zip format because the source is already compressed.
- A reduced HL7 Terminology R4 encounter/ActCode-focused subset.

Not included:

- LOINC source files, because download requires a LOINC account and license
  review.
- RxNorm/RxTerms source files, because UMLS download access is gated.
- SNOMED CT CA and ICD-10-CA/CCI, because they are licensed/import-only sources.
- Legacy Canadian Vaccine Catalogue exports, because the PHAC National Vaccine
  Catalogue is now the preferred public Canada-first vaccine source.

Refresh snapshots with:

```sh
node tools/fetch-terminology-snapshots.mjs
```

After refresh, inspect `manifest.json` and update docs if source versions or
sizes changed materially.
