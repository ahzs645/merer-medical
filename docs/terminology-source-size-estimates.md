# Terminology Source Size Estimates

Measured on 2026-05-26 unless noted. Sizes are for source files and the
practical reduced packs we would use for the local-first terminology feature,
not for patient data.

## Recommended Local Packs

| Domain                                   | Source                              |                                                                                                                                                              Source size |                                                                     Compressed size for app use | Local app recommendation                                                                                                                                       |
| ---------------------------------------- | ----------------------------------- | -----------------------------------------------------------------------------------------------------------------------------------------------------------------------: | ----------------------------------------------------------------------------------------------: | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Labs/vitals                              | LOINC 2.82                          |                                                                                                                                        85 MB official zip; 109,325 terms |                                    Estimate 5-15 MB for a reduced labs/vitals autocomplete pack | Import/reduce at build or user import time. Do not ship modified meanings.                                                                                     |
| Labs/vitals units                        | UCUM                                |                                                                                                                                                                    Small |                                                                       Estimate less than 100 KB | Bundle a curated unit table plus aliases.                                                                                                                      |
| Canada medications                       | Health Canada CCDD                  |                                                                                                                      11.6 MiB CSV across main files checked; 55,968 rows |               1.9 MiB gzip for the main CSV files; estimate 2-5 MB as normalized app JSON/index | Best Canada-first medication autocomplete source.                                                                                                              |
| Canada medication product/DIN enrichment | Health Canada DPD marketed allfiles |                                                                1.4 MiB zip for `allfiles.zip`; Canada.ca states about 117 MB uncompressed for the broader extract family |             1.4 MiB if storing the marketed zip; estimate 1-3 MB for reduced DIN/product lookup | Use as enrichment, not the primary medication search surface.                                                                                                  |
| US/global medications                    | RxNorm / RxTerms                    | Full RxNorm and Current Prescribable release ZIP sizes are not exposed publicly without UTS-authenticated download; RxNav-in-a-Box requires 100 GB disk and 12 GB memory | Local lookup cache should usually stay under 1 MB; full local RxNorm/RxNav stack is much larger | Use RxNav APIs plus IndexedDB cache for now. Do not bundle full RxNorm. Consider Current Prescribable subset only if we need offline first-time normalization. |
| Medication interactions                  | DDInter                             |                                                                                                13,134,657 bytes vendored CSV bundle; about 13 MB / 12.5 MiB; 8 CSV files |                                    Estimate 30-60 MB IndexedDB after parsed records and indexes | Bundle for prototype/local interaction checking, but review DDInter non-commercial terms before distribution.                                                  |
| Immunizations, Canada                    | PHAC National Vaccine Catalogue     |                                                                                                           8.1 MB FHIR JSON bundle; 16 bundle entries; updated 2026-05-21 |                                                     316 KB gzip for the full public FHIR bundle | Preferred Canada-first vaccine terminology and product source.                                                                                                 |
| Immunizations, US/global                 | CDC CVX                             |                                                                                                                                        282 KB current HTML table payload |                      66 KB gzip before normalization; likely less than 100 KB as app JSON/index | Easy to bundle for US/global profile.                                                                                                                          |
| Encounters/FHIR value sets               | HL7 Terminology R4 package 7.0.1    |                                                                                                                                       4.6 MB `.tgz`; 4,111 package files |                                             554 KB for a rough encounter/ActCode-focused subset | Bundle or import a reduced encounter value-set subset.                                                                                                         |
| Canada conditions/procedures/allergies   | SNOMED CT CA                        |                                                                                                                                                     Licensed/login-gated |                                                                                         Unknown | Do not bundle. Support licensed import or terminology server.                                                                                                  |
| Canada ICD/procedure classifications     | ICD-10-CA / CCI                     |                                                                                                                                                                 Licensed |                                                                                         Unknown | Do not bundle. Support licensed import or terminology server.                                                                                                  |

## CCDD Measurement Detail

Direct Health Canada CCDD CSV endpoints checked:

| File                                       | Raw size |   Rows |
| ------------------------------------------ | -------: | -----: |
| `mp` manufactured products                 |  4.0 MiB | 15,356 |
| `ntp` non-proprietary therapeutic products | 0.86 MiB |  5,267 |
| `tm` therapeutic moieties                  | 0.12 MiB |  1,748 |
| `mp_ntp_tm_relationship_en`                | 2.95 MiB | 15,340 |
| `mp_ntp_tm_relationship_fr`                | 3.11 MiB | 15,340 |
| `special_groupings`                        | 0.54 MiB |  2,899 |
| `coded_attribute`                          |   1.2 KB |     10 |
| `device-ntp`                               |    843 B |      8 |

All of those files concatenated and gzipped measured 1.9 MiB. The app should
not store the raw source shape directly. A normalized pack should keep only the
fields needed for search and coding: code, English/French display, aliases,
ingredient/product relationships, source version, and license/source metadata.

## What We Would Actually Store

The installed IndexedDB footprint will be larger than network gzip because
Dexie stores structured records and search indexes. Practical targets:

| Pack                           | Download/import payload target | IndexedDB target |
| ------------------------------ | -----------------------------: | ---------------: |
| Canada starter pack            |                less than 50 KB | less than 250 KB |
| CCDD medication pack           |                         2-5 MB |          5-15 MB |
| LOINC labs/vitals reduced pack |                        5-15 MB |         10-30 MB |
| UCUM units                     |               less than 100 KB | less than 500 KB |
| PHAC NVC immunization pack     |                     250-750 KB |           1-3 MB |
| CDC CVX                        |               less than 100 KB | less than 500 KB |
| HL7 encounter subset           |                     250-750 KB |           1-2 MB |
| DPD DIN/product reduced pack   |                         1-3 MB |           2-8 MB |

Those sizes are acceptable for a privacy-first offline app. The risky sources
are full LOINC, full RxNorm, SNOMED CT CA, and ICD-10-CA/CCI; those should be
imported as reduced packs or queried through configured terminology servers.

## Medication Interaction Data

The app currently vendors the public DDInter CSV bundle for local medication
interaction checks:

- Source directory: `apps/web/src/assets/ddinter`
- Source URL: https://ddinter.scbdd.com/download/
- Downloaded: 2026-05-30
- Files: 8 CSV files named `ddinter_downloads_code_A.csv` through selected
  DDInter letter groups `B`, `D`, `H`, `L`, `P`, `R`, and `V`
- Measured source size: 13,134,657 bytes, about 13 MB / 12.5 MiB
- Practical IndexedDB estimate: 30-60 MB after parsed records and indexes

DDInter is useful as an open-access interaction corpus, but it should be
treated as an informational source. A missing DDInter row must be displayed as
"not found in this installed DDInter bundle," not as "safe" or "no
interaction." DDInter terms indicate CC BY-NC-SA / non-commercial-style usage,
so commercial distribution needs legal review or a different licensed clinical
source.

## RxNorm Local Storage Decision

RxNorm is the right medication normalization layer, but not the interaction
source. The app should use RxNorm/RxNav to normalize medication strings and
RxCUIs before matching against DDInter aliases.

NLM publishes:

- Full RxNorm monthly release ZIPs, e.g. `RxNorm_full_05042026.zip`
- Current Prescribable Content ZIPs, e.g.
  `RxNorm_full_prescribe_05042026.zip`
- RxNorm/RxNav REST APIs
- RxNav-in-a-Box for local Docker deployment of RxNav APIs and applications

Important sizing/access findings:

| Option                              |                                                                                                                                       Verified sizing/access note | App recommendation                                                       |
| ----------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------: | ------------------------------------------------------------------------ |
| RxNorm lookup cache                 |                                                                                  Store only resolved app/user lookups; usually under 1 MB for normal personal use | Implement in IndexedDB                                                   |
| RxNorm Current Prescribable Content | No-license-required according to NLM docs, but direct release downloads still route through UTS; exact public ZIP size not exposed without authenticated download | Possible future offline pack if we need first-time offline normalization |
| Full RxNorm release                 |                          Requires UTS account; exact ZIP size not exposed publicly by unauthenticated headers; files are intended for relational database loading | Do not bundle in the app                                                 |
| RxNav-in-a-Box                      |                                                                                                             Official README requires 100 GB disk and 12 GB memory | Too heavy for this app; useful only as optional local infrastructure     |

Recommended cache shape:

```ts
type CachedRxNormLookup = {
  key: string;
  input: string;
  rxcui?: string;
  canonicalName?: string;
  synonyms: string[];
  ingredients: string[];
  brands: string[];
  relatedTerms: string[];
  fetchedAt: string;
  source: 'RxNav';
  status: 'resolved' | 'not-found' | 'error';
};
```

This gives repeat/offline checks for medications already seen by the app without
bundling a large terminology database or adding a UTS download workflow.

Implemented app behavior:

- Cache store: `mere-rxnorm-cache` IndexedDB database, `lookups` object store
- Name keys: `rxnorm:name:{normalizedInput}`
- RxCUI keys: `rxnorm:rxcui:{rxcui}`
- Stale threshold: 30 days
- Failed RxNav/error lookup stale threshold: 24 hours
- Stale entries remain usable offline and are marked in normalization
  provenance
- Settings exposes cache entry count, stale entry count, last updated date,
  clear cache, and refresh stale cache for current medication records
- RxNav failures are cached as `error` and fall back to local medication terms
- A small manual alias map handles hard brand/generic DDInter matching cases
  such as `Coumadin` to `warfarin`, `Tylenol` to `acetaminophen`, and
  `Glucophage` to `metformin`

## Source Links

- LOINC downloads: https://loinc.org/downloads/
- LOINC license: https://loinc.org/kb/license/
- UCUM license: https://ucum.org/license
- Health Canada CCDD: https://open.canada.ca/data/en/dataset/3e0a7b9e-a5e9-4131-bde4-ac685a1f1a38
- Health Canada DPD extract: https://www.canada.ca/en/health-canada/services/drugs-health-products/drug-products/drug-product-database/what-data-extract-drug-product-database.html
- PHAC National Vaccine Catalogue: https://nvc-cnv.canada.ca/en/vaccine-catalogue
- PHAC NVC FHIR API guide: https://nvc-cnv.canada.ca/downloads/NVC-API-Implementation-Guide.pdf
- RxNorm files: https://www.nlm.nih.gov/research/umls/rxnorm/docs/rxnormfiles.html
- RxNorm overview: https://www.nlm.nih.gov/research/umls/rxnorm/overview.html
- RxNav APIs: https://lhncbc.nlm.nih.gov/RxNav/APIs/index.html
- RxNav-in-a-Box README: https://data.lhncbc.nlm.nih.gov/public/rxnav/rxnav-in-a-box/README.txt
- DDInter downloads: https://ddinter.scbdd.com/download/
- DDInter terms: https://ddinter.scbdd.com/terms/
- RxTerms: https://catalog.data.gov/dataset/rxterms
- CDC CVX: https://www2.cdc.gov/vaccines/iis/iisstandards/vaccines.asp?rpt=cvx
- HL7 FHIR packages: https://hl7.org/fhir/packages.html
- Infoway SNOMED CT CA: https://infocentral.infoway-inforoute.ca/en/standards/canadian/snomed-ct
- CIHI Canadian classifications browser: https://www.cihi.ca/en/submit-data-and-view-standards/codes-classifications-and-terminologies/canadian-classifications-browser
