# Records: data‑structure, import, linking & interface analysis

_Analysis of the Caleb dataset (AHS MyChart JSON, MyHealth Records XML‑JSON, the Lucy/IHE_XDM "Health Summary" CCDA bundle, the surgical‑consent HTML) against the Mere Medical fork in this repo, plus the live `.emrpkg` you shared on Drive._

> How this was verified: I downloaded the Drive `.emrpkg` (the `1ac…Zy4-` file). It is an **unencrypted** ZIP holding a live RxDB dump — `manifest.json` + `tables/*.json`. The manifest says it was produced by app version **`ahs-mychart-builder`**, i.e. the offline tool in `tools/`, not by the running web app. It contains **1 user, 1 connection, and 949 clinical_documents**. Every number below comes from that real data.

---

## 0. TL;DR

* **The UI is genuinely data‑driven, not hard‑coded.** Every clinical screen queries `clinical_documents` by `user_id` + `resource_type` and renders whatever exists. The only hard‑coded data is legitimate reference data (CDC growth percentiles, lab‑unit aliases). So "make sure the UI can do it, not just hard‑coded" is already true — the gaps are about *which fields/links the data carries* and *which screens exist*, not about hard‑coding.
* **Two separate worlds move data in.** (1) Offline Node tools in `tools/*.mjs` parse the external EMR exports → emit a `.emrpkg`. (2) The web app only imports `.emrpkg`. **The app cannot directly ingest AHS MyChart JSON, MyHealth XML‑JSON, or the CCDA folder** — only the offline builder understands those.
* **Records were inputted *mostly* correctly, but with three structural problems:** (a) the builder writes its source links on metadata keys the app's UI **doesn't read**, so the Documents↔Records feature is effectively dark for this data; (b) results are **not linked to the encounter/location/provider** where they happened; (c) several source sections are **silently dropped**.
* **"A test has multiple results" is the one link that works** — `DiagnosticReport.result[]` → member `Observation`s resolves 100 % (135/135 refs). But only 32 of 76 reports carry it, and abnormal flags/reference ranges are inconsistently preserved.
* **Several data types have no screen** (allergies, encounters/visits, referrals, vitals/BP/SpO₂ trends, locations, providers), and three feature folders aren't wired into navigation (`results`, `diabetes`, `ai-recommendations`).

---

## 0b. What's been implemented in this branch

| Workstream | Status | What shipped |
|---|---|---|
| **Source‑document linking (P0)** | ✅ Done | Builder now defaults `source_file`, runs a `linkSourceDocuments()` post‑pass, and stamps `source_document_id`. App runs `backfillSourceDocumentLinks()` after every `.emrpkg` import **and** via a new **Settings → Data → "Repair source links"** button, so existing packages are fixed without rebuilding. Verified end‑to‑end on your data (**802 records linked, all resolving, no self‑links**). Unit tests added. |
| **Encounter / location / provider (P0/P1)** | ◑ Display side done | New **Visits** screen shows each encounter's parsed location + a date‑based "same‑day records" count; new **Providers & locations** directory dedupes providers (from CareTeam) and parses the mashed facility strings into name/address/phone. _Not yet:_ materialising hard FHIR refs (`Observation.encounter`, `Location`/`Practitioner` resources) in the builder — the heaviest CCDA rewrite; current associations are date/string‑based and labelled as such. |
| **Capture dropped data (P1)** | ◑ Mostly done | Builder now captures MyChart **letters** and the previously‑dropped MyHealth **bloodPressure / vitalSigns / bloodOxygen / procedures** sections, and no longer stamps undated procedures with the export timestamp (your dental extraction is now correctly undated). _Not yet:_ parsing CCDA `METADATA.XML` for nicer document titles; promoting the surgical‑consent HTML to a structured Procedure/Consent; allergy reaction/severity enrichment. |
| **New screens (P2)** | ✅ Done | Added data‑driven **Allergies**, **Vitals** (BP from `component[]` + sparkline trend), **Visits/Encounters**, **Referrals**, and **Providers & locations** tabs, and wired the previously‑unrouted **Results** hub. All query `clinical_documents` generically — no hardcoded data. |

> Build note: a full `nx build` can't complete in this sandbox because the `@mere/immunization-forecast` git submodule isn't fetchable here (proxy 403) — a pre‑existing environment gap unrelated to these changes. Everything else was verified via `tsc`, ESLint, Jest (emrpkg + new backfill tests), and a real end‑to‑end builder run.

---

## 1. What you actually have

| Source file | What it really is | Richness |
|---|---|---|
| `caleb.json` | AHS **MyChart/MyAHSConnect** export, first pass — test results are **unnamed** stubs | low (names missing) |
| `caleb2.json` | Same export, **named** test results with `components[]` (value/unit/referenceRange/isAbnormal) or `narrative` | **high** — this is the good lab source |
| `myhealth_records_export_copy.json` | **MyHealth Records (AHS)** — an XML→JSON dump (`LabTestResultsItem[]`, `referrals`, `medications`, `immunizations`, and empty `procedures`/`bloodPressure`/`vitalSigns`/`bloodOxygen`) | medium; carries lab order group, ordering info, AHS clinical codes |
| `Consent_Surgery_Invasive_Procedure.HTML` | AHS **surgical consent** (Exploratory Laparoscopy, Lysis of Adhesions) with PHN/ULI/MRN, surgical service (ACES), MRHP, witness | structured fields, currently kept only as a document blob |
| `HealthSummary.zip` (Lucy / IHE_XDM) | **122 C‑CDA XML docs** (DOC0001–0121), `METADATA.XML`, `INDEX.HTM`, 2 summary PDFs | **richest** — problems, meds, immunizations, encounters w/ locations, results, care teams, coverage, consent |

These overlap heavily (the same CBC can appear in caleb2.json *and* a CCDA doc), so de‑duplication matters — and the builder mostly handles it (only 1 duplicate observation group survived: "Tobacco smoking status").

---

## 2. How the data is structured today

### Storage model
Everything is a row in **`clinical_documents`** that wraps raw FHIR:

```
clinical_documents row
├─ id (composite: connection_record_id | user_id | metadata.id)
├─ connection_record_id  → connection_documents   (all 949 → the one "AHS MyChart import")
├─ user_id               → user_documents
├─ data_record { format:"FHIR.R4", resource_type, raw:{ resource:{…FHIR…} }, version_history:[] }
└─ metadata { id, date, display_name, loinc_coding, …builder extras… }
```

### What's in the package (949 records)

| resource_type | n | resource_type | n |
|---|--:|---|--:|
| observation | 189 | immunization | 65 |
| documentreference | 138 | procedure | 7 |
| encounter | 130 | familymemberhistory | 5 |
| careteam | 121 | careplan | 4 |
| medicationstatement | 111 | consent | 3 |
| condition | 93 | coverage | 2 |
| diagnosticreport | 76 | patient / allergyintolerance / servicerequest / provenance / medicationrequest | 1 each |

### Key architectural fact: links are computed at render time, never stored
The FHIR mappers (`services/fhir/R4.ts`, `DSTU2.ts`) are a **pure flattening layer** — they copy the resource into `data_record.raw` and extract only `metadata.id/date/display_name` (+ `loinc_coding` for observations). **No reference field is read at ingestion.** Relationships survive only inside `raw`, and the UI re‑derives them on every render. The single exception that is *persisted* as an app‑level link is `metadata.source_document_id` / `source_attachment_id` (the Documents↔Records feature).

---

## 3. Were the records inputted properly? (data‑quality audit)

**Mostly yes**, with concrete defects:

| Area | Status | Evidence |
|---|---|---|
| Lab panels → component results | ✅ correct | 135/135 `DiagnosticReport.result[]` refs resolve to a stored Observation |
| Reference ranges on labs | ⚠️ partial | only **101/189** observations carry `referenceRange` (early CCDA labs with blank ranges lost them) |
| Abnormal / interpretation flags | ❌ missing | **0/189** observations have `interpretation` (the builder only emits it when `isAbnormal` is true, and this patient has none — but the field is never carried as normal/H/L either) |
| `Observation.component[]` | ⚠️ not used | multi‑analyte single‑Observation panels would not display — the labs/results/timeline code reads only top‑level `valueQuantity` |
| Procedure dates | ❌ wrong | the dental extraction `Procedure.performedDateTime` = the **export timestamp** (2026‑05‑29), not the real date |
| Provider modeling | ⚠️ duplicated | **121 CareTeam** rows (one per provider mention), no Practitioner records, lots of repetition |
| De‑duplication across sources | ✅ good | only 1 colliding observation group |
| Patient identity | ⚠️ thin | `last_name` empty; gender "unknown"; PHN/ULI/MRN from the consent/coverage not on the patient record |

---

## 4. Is the data linked properly? (the core of your question)

| Link you asked about | Modeled? | Reality in the data |
|---|---|---|
| **Test → its multiple results** | ✅ Yes | `DiagnosticReport.result[]` → Observations; resolves 100 %. **But** 44/76 reports (imaging/path narratives) have no members, and 54/189 observations are orphans (vitals, social history, standalone MyChart labs). |
| **Record → where it happened (location)** | ❌ No real link | Location exists **only** as a mashed display string on Encounters (`"Jasper Healthcare Centre Lab/DI 518 Robson Street Jasper, AB T0E 1E0 780‑852‑6606"`) — name+address+phone concatenated. No `Location` resources. No lab/report/procedure points at a location. |
| **Record → encounter/visit** | ❌ No | 130 encounters exist but **nothing references them** — `Observation.encounter` / `DiagnosticReport.encounter` are never set. Encounters float in the timeline disconnected from the results produced at them. |
| **Record → ordering / performing provider** | ❌ No | Providers live in 121 CareTeam rows; reports/observations don't reference them. Only 4/76 reports even have a `performer` display string. You can't ask "all records from Dr. Arthur". |
| **Record → source document** | ❌ **Broken by convention mismatch** | **This is the big one.** The builder records provenance on `metadata.source_file` (821), `ccda_source_file` (68), `ccda_section`, `source_lab_panel`, `myhealth_result_unique_id`, etc. But the app's Documents↔Records UI reads **`metadata.source_document_id`**, which is set on **0/949** records. So **every** record's "view source document" / "records from this document" link is empty, even though the 122 C‑CDA docs and all source PDFs/HTML/TIF **are** stored. |

### The good news: the source‑document link is 100 % recoverable
I matched every record's `ccda_source_file` against the stored C‑CDA DocumentReferences (joined on `metadata.source_file`): **68/68 matched.** The PDFs, the consent HTML, and the JSON exports are all present as documents too. So bridging `source_file`/`ccda_source_file` → `source_document_id` would light up the entire Documents↔Records experience for this dataset with no data loss — it's purely a key‑naming reconciliation.

---

## 5. What was NOT incorporated (dropped data)

| Dropped | Where it should go |
|---|---|
| **MyChart `letters[]`** | never parsed as records (only inside the raw JSON blob) → should become DocumentReferences |
| **MyHealth `procedures`, `bloodPressure`, `vitalSigns`, `bloodOxygen`** | the builder has **no readers** for these sections (empty here, but real on other patients) → Observations/Procedure |
| **CCDA `METADATA.XML` & `INDEX.HTM`** | never parsed → they hold each document's real **title, type, and date**, which would make the Documents list far more legible than "C‑CDA document" |
| **Surgical consent structured fields** | the HTML is stored as a blob, but the procedure (Exploratory Laparoscopy/Lysis of Adhesions), surgical service (ACES), MRHP and witness aren't a structured Procedure/Consent |
| **Allergy reaction / severity / criticality** | flattened to `code.text` only |
| **Encounter ↔ participants/providers, reasons** | participants dropped (0/130) |
| **Per‑item family‑history dates, most patient demographics** | dropped |
| **Real version history** | `version_history` is re‑initialised to `[]` on every map — historical versions are not retained |

---

## 6. Interface gaps

The app is data‑driven, so adding a screen mostly means adding a route + a query + a card — the patterns already exist (labs, imaging, conditions are good templates).

**Data types present in the data but with no dedicated screen:**
* **Allergies** — only a Summary/timeline card, no `/records/allergies` (despite being a first‑class manual record kind)
* **Encounters / visits** — timeline card only; no list/detail, so you can't browse visits or see "what happened at this visit"
* **Referrals (`servicerequest`)** — only surfaced inside Care Plans/Visit Prep; no referrals view (you have a real ortho referral with status "Queued for appointment")
* **Vital‑sign trends** — no vitals dashboard; **blood pressure and SpO₂ have no trend graph** (growth charts only trend height/weight/BMI/HC)
* **Locations / facilities** — no directory; "where" is only ever an inline string
* **Providers / practitioners** — no directory; ordering provider never shown

**Feature folders that exist but aren't wired into navigation:**
* `features/results` — `ResultsTab` is exported but never routed (only `ResultsHubContent` embeds in Summary)
* `features/diabetes` — only the LibreView import util; no route
* `features/ai-recommendations` — USPSTF engine, deliberately disabled

---

## 7. Recommendations

### A. Restructure the data so links are real (highest impact)
1. **Reconcile the source‑document link.** Make the builder write `metadata.source_document_id` (and `source_attachment_id`) pointing at the DocumentReference it already creates — *or* add a small in‑app migration/read‑path that maps `source_file`/`ccda_source_file` → the matching DocumentReference. Either lights up Documents↔Records for all 949 records. (68/68 CCDA + all JSON/PDF sources are matchable today.)
2. **Materialise Locations and link them.** Parse the concatenated location string into a real `Location` (name / address / phone), and set `Encounter.location[].location.reference` + `DiagnosticReport.encounter` / `Observation.encounter`. This is what makes "where did this happen / what was done at this visit" work.
3. **Model providers once.** Convert the 121 CareTeam mentions into deduplicated `Practitioner`/`PractitionerRole` records and reference them from encounters/reports (`performer`/`requester`). Enables "all records by provider X".
4. **Carry interpretation + reference ranges on every Observation** (normal/H/L + range), and read `Observation.component[]` so single‑Observation panels render.
5. **Set `entry_method` / `mapping_confidence`** so the Provenance panel shows truth instead of defaults.
6. **Fix `Procedure.performedDateTime`** (don't fall back to the export timestamp).

### B. Capture what's dropped
7. MyChart `letters` → DocumentReferences; MyHealth `procedures/bloodPressure/vitalSigns/bloodOxygen` → records; parse CCDA `METADATA.XML` for real document titles/dates; promote the surgical consent to a structured Procedure + Consent.

### C. Add the missing screens (all can be data‑driven, following existing patterns)
8. Allergies tab; Encounters/Visits list+detail (with the records produced at each visit, once §A2 lands); Referrals view; a Vitals dashboard with BP/SpO₂ trends; Locations and Providers directories; wire the `results` route.

### Suggested order
* **P0 — linking:** §A1 (source‑document reconcile) and §A2 (encounter/location). Biggest visible payoff, no new data needed.
* **P1 — fidelity:** §A3 providers, §A4 flags/ranges, §B captures, §A6 dates.
* **P2 — surfaces:** §C screens.

---

## 8. The `.emrpkg` format (for reference)
A ZIP of `manifest.json` + `tables/<collection>.json` (+ reserved `attachments/`). Round‑trips the RxDB collections (`user_documents`, `connection_documents`, `clinical_documents`, `user_preferences`, `summary_page_preferences`, `workflow_records`, `instance_config`, `uspstf_recommendation_documents`, `vector_storage`). Optional encryption: AES‑GCM‑256 via PBKDF2‑SHA256 (600k iters) **or** a WebAuthn‑PRF passkey, wrapped in a `MEREPKG1` envelope. The Drive file is the unencrypted variant. Import = unpack → per‑row `upsert` into RxDB (`apps/web/src/services/emrpkg/index.ts`).
