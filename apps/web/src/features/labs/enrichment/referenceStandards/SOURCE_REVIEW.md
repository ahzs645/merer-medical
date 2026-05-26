# Reference Source Review

This file records source decisions for supplementing lab reference intervals.

## RCPA Harmonised Intervals

Recommendation: high-value candidate for Australian chemistry, but
permission-gated before bundled bulk import.

Useful for:

- Sodium, potassium, chloride, bicarbonate.
- Creatinine with age and sex partitions.
- Calcium, corrected calcium, phosphate, magnesium.
- Total protein, bilirubin, ALT, AST, GGT, alkaline phosphatase, CK, LDH,
  lipase.

Implementation notes:

- Target `australian/chemistry.json`.
- Keep method and assay caveats in `note`, `method`, or `assayPlatform`.
- Add aliases for missing chemistry IDs such as sodium, potassium, chloride,
  bicarbonate, phosphate, magnesium, ALT, AST, GGT, alkaline phosphatase, CK,
  LDH, and lipase.
- RCPA LOINC-like identifiers belong in LOINC/alias metadata, not inside
  clinical range evaluation.

## CALIPER

Recommendation: link-only until redistribution rights and platform modeling are
handled.

Useful for:

- Pediatric and adolescent intervals.
- Age/sex partitioned biomarkers.
- Analyzer/platform-aware intervals.

Risks:

- No public bulk-download path found.
- Redistribution requires permission.
- Current model must not apply analyzer-specific CALIPER ranges as one generic
  Canadian standard.

Required before import:

- `assayPlatform` selection or separate platform-specific standards.
- Permission or a source we can redistribute.

## Australia / New Zealand Supplements

Recommendation: import only small curated/high-confidence subsets into the
runtime standard, and keep broader harmonisation/master-list sources as
review-only candidates unless they add source-specific method context.

Imported to runtime:

- Canterbury Health Laboratories general chemistry: selected chemistry ranges
  with clear age/sex partitions from the current PDF.
- Awanui Auckland biochemistry: selected glucose, HbA1c, albumin, calcium,
  phosphate, magnesium, and lipase rows.
- Awanui Auckland haematology: adult male/female CBC rows.
- PathWest blood gas: selected i-STAT CHEM8 chemistry rows with method tags.

Review-only candidates:

- Tate et al. 2014 AACB harmonised Australia/New Zealand intervals. This is
  useful provenance and cross-checking material, but most selected chemistry
  intervals overlap newer RCPA/runtime rows.
- Monash Health Pathology master list. This is a broad institution-specific
  source; the current pipeline extracts only selected blood gas candidates and
  leaves them out of promotion pending method-selection UX.
- PathWest standalone i-STAT POCT PDF. Text extraction did not expose usable
  interval rows, so it remains profile-only.

## NHS Pathology Manuals

Recommendation: use selected Trust pages as curated citation sources, not blind
bulk imports.

Useful for:

- UK hematology from Worcestershire Full Blood Count.
- UK chemistry starter data from individual Gloucestershire pages.

Implementation notes:

- Target `uk/hematology.json` and future `uk/chemistry.json`.
- Prefer small individual test pages over long unstructured tables.
- Add sex-specific adult bands for RBC, haemoglobin, and haematocrit when the
  patient context can select sex.
- Add aliases for WBC, MCV, sodium, potassium, and urea if those ranges are
  added.

## Merck Manual / ABIM

Recommendation: citation-only fallback, not imported as a country standard.

Reasons:

- Not country-specific.
- Current broad table points out to ABIM PDF rather than being a clean Merck
  structured dataset.
- Terms restrict reproduction/scraping.

## LOINC

Recommendation: terminology metadata only.

Use for:

- Code aliases.
- Display names and synonyms.
- Example UCUM units.
- Grouping/search metadata.

Do not use LOINC as a source of clinical normal ranges.

## OHDSI DataQualityDashboard

Recommendation: separate `plausibilityRanges` module.

Use for:

- Implausible low/high data-quality checks.
- Unit/code sanity checks.

Do not use OHDSI thresholds for patient-facing high/low status or graph
reference overlays.
