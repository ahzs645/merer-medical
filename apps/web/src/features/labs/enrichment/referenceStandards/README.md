# Lab Reference Standards

Reference standards are grouped by country, then by lab domain:

```text
referenceStandards/
  australian/
    index.json
    chemistry.json
    hematology.json
  canadian/
    index.json
    hematology.json
    lipids.json
  uk/
    index.json
    chemistry.json
    hematology.json
```

Each domain file exports an array of lab definitions. Keep sex and age
partitions together inside the test's `bands` array instead of splitting them
into separate files.

```json
{
  "testIds": ["rbc"],
  "name": "Red blood cells",
  "bands": [
    {
      "sex": "male",
      "label": "Male, 18 years up to 150 years",
      "kind": "range",
      "display": "4.50-6.50",
      "unit": "10^12/L",
      "low": 4.5,
      "high": 6.5,
      "citationId": "UK-WORCS-FBC",
      "ageMinYears": 18,
      "ageMaxYears": 150
    }
  ]
}
```

Age partitions can use `ageMinDays` / `ageMaxDays`, `ageMinWeeks` /
`ageMaxWeeks`, or `ageMinYears` / `ageMaxYears`. Use days or weeks for neonatal
and pediatric bands where exact boundaries matter.

Bands can also record assay-specific caveats:

```json
{
  "label": "Abbott Architect, female, 12 years up to 18 years",
  "kind": "range",
  "display": "example",
  "citationId": "SOURCE-ID",
  "sex": "female",
  "assayPlatform": "Abbott Architect",
  "method": "example method",
  "specimen": "serum"
}
```

Do not import analyzer-specific datasets, such as CALIPER, as a single generic
country standard unless the relevant platform is modeled or selected.

Clinical reference intervals and plausibility thresholds are separate concepts.
Do not add OHDSI/DataQualityDashboard plausibility bounds to this folder. Keep
those in a separate `plausibilityRanges` module if we add them.

Preferred source order for curated additions:

1. Country harmonised intervals with clear units, age partitions, and citations.
2. Country or regional pathology manuals when harmonised tables are unavailable.
3. Lab-specific manuals only when clearly labeled as source-specific.
4. General medical tables only as fallback references, not country standards.

Current source posture:

- RCPA harmonised intervals: good candidate for Australian chemistry, but treat
  as permission-gated before bundled bulk import.
- NHS pathology manuals: useful for curated UK hematology/chemistry additions;
  cite individual Trust pages and avoid blind scraping.
- CALIPER: link-only until redistribution rights and platform/assay selection
  are handled.
- Merck Manual / ABIM tables: citation-only fallback, not a country standard.
- LOINC: identity and alias metadata only, not reference intervals.
- OHDSI/DataQualityDashboard: plausibility thresholds only, not clinical
  normal ranges.
