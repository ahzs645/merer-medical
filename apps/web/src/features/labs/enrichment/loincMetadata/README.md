# LOINC Metadata

LOINC belongs here as terminology metadata, not clinical interpretation.

Use this area for:

- LOINC code to internal lab ID aliases.
- Display names, long common names, short names, related names, and search
  synonyms.
- Example UCUM units and ranking hints.
- Panel/component grouping metadata.

Do not store clinical normal ranges in this folder. LOINC example units are
examples, not preferred or required units for a patient's result.

Recommended future shape:

```text
loincMetadata/
  README.md
  loincAliases.json
  loincCatalog.ts
  types.ts
```

The current hardcoded `loincLabAliases` map can eventually move here once we
have a reduced LOINC terminology pack.
