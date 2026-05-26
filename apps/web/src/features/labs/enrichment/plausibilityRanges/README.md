# Plausibility Ranges

Plausibility ranges are data-quality guardrails, not clinical reference
intervals.

Use this area for sources such as OHDSI DataQualityDashboard thresholds where
the question is:

> Is this value likely impossible or suspicious for this code/unit?

Do not use plausibility ranges to set `LabFlag`, `referenceRange`, graph
reference overlays, or patient-facing high/low status. Clinical normal ranges
belong in `referenceStandards`.

Recommended future shape:

```text
plausibilityRanges/
  README.md
  ohdsiDqdCatalog.ts
  types.ts
  evaluatePlausibility.ts
```

Suggested statuses:

- `plausible`
- `implausibly-low`
- `implausibly-high`
- `unknown`
