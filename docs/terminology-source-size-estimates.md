# Terminology Source Size Estimates

Measured on 2026-05-26 unless noted. Sizes are for source files and the
practical reduced packs we would use for the local-first terminology feature,
not for patient data.

## Recommended Local Packs

| Domain                                   | Source                              |                                                                                               Source size |                                                         Compressed size for app use | Local app recommendation                                                                     |
| ---------------------------------------- | ----------------------------------- | --------------------------------------------------------------------------------------------------------: | ----------------------------------------------------------------------------------: | -------------------------------------------------------------------------------------------- |
| Labs/vitals                              | LOINC 2.82                          |                                                                         85 MB official zip; 109,325 terms |                        Estimate 5-15 MB for a reduced labs/vitals autocomplete pack | Import/reduce at build or user import time. Do not ship modified meanings.                   |
| Labs/vitals units                        | UCUM                                |                                                                                                     Small |                                                           Estimate less than 100 KB | Bundle a curated unit table plus aliases.                                                    |
| Canada medications                       | Health Canada CCDD                  |                                                       11.6 MiB CSV across main files checked; 55,968 rows |   1.9 MiB gzip for the main CSV files; estimate 2-5 MB as normalized app JSON/index | Best Canada-first medication autocomplete source.                                            |
| Canada medication product/DIN enrichment | Health Canada DPD marketed allfiles | 1.4 MiB zip for `allfiles.zip`; Canada.ca states about 117 MB uncompressed for the broader extract family | 1.4 MiB if storing the marketed zip; estimate 1-3 MB for reduced DIN/product lookup | Use as enrichment, not the primary medication search surface.                                |
| US/global medications                    | RxNorm / RxTerms                    |                                   Login-gated UMLS downloads; size not exposed by unauthenticated headers |             Unknown until downloaded with UMLS credentials; likely larger than CCDD | Optional US/global pack or remote connector. Prefer RxTerms for autocomplete when available. |
| Immunizations, US/global                 | CDC CVX                             |                                                                         282 KB current HTML table payload |          66 KB gzip before normalization; likely less than 100 KB as app JSON/index | Easy to bundle for US/global profile.                                                        |
| Encounters/FHIR value sets               | HL7 Terminology R4 package 7.0.1    |                                                                        4.6 MB `.tgz`; 4,111 package files |                                 554 KB for a rough encounter/ActCode-focused subset | Bundle or import a reduced encounter value-set subset.                                       |
| Canada immunizations                     | Canadian Vaccine Catalogue          |                                                                Redistribution/API terms need confirmation |                                                                             Unknown | Support as import/API connector until redistribution terms are confirmed.                    |
| Canada conditions/procedures/allergies   | SNOMED CT CA                        |                                                                                      Licensed/login-gated |                                                                             Unknown | Do not bundle. Support licensed import or terminology server.                                |
| Canada ICD/procedure classifications     | ICD-10-CA / CCI                     |                                                                                                  Licensed |                                                                             Unknown | Do not bundle. Support licensed import or terminology server.                                |

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
| CDC CVX                        |               less than 100 KB | less than 500 KB |
| HL7 encounter subset           |                     250-750 KB |           1-2 MB |
| DPD DIN/product reduced pack   |                         1-3 MB |           2-8 MB |

Those sizes are acceptable for a privacy-first offline app. The risky sources
are full LOINC, full RxNorm, SNOMED CT CA, and ICD-10-CA/CCI; those should be
imported as reduced packs or queried through configured terminology servers.

## Source Links

- LOINC downloads: https://loinc.org/downloads/
- LOINC license: https://loinc.org/kb/license/
- UCUM license: https://ucum.org/license
- Health Canada CCDD: https://open.canada.ca/data/en/dataset/3e0a7b9e-a5e9-4131-bde4-ac685a1f1a38
- Health Canada DPD extract: https://www.canada.ca/en/health-canada/services/drugs-health-products/drug-products/drug-product-database/what-data-extract-drug-product-database.html
- RxNorm files: https://www.nlm.nih.gov/research/umls/rxnorm/docs/rxnormfiles.html
- RxTerms: https://catalog.data.gov/dataset/rxterms
- CDC CVX: https://www2.cdc.gov/vaccines/iis/iisstandards/vaccines.asp?rpt=cvx
- HL7 FHIR packages: https://hl7.org/fhir/packages.html
- Infoway SNOMED CT CA: https://infocentral.infoway-inforoute.ca/en/standards/canadian/snomed-ct
- CIHI Canadian classifications browser: https://www.cihi.ca/en/submit-data-and-view-standards/codes-classifications-and-terminologies/canadian-classifications-browser
