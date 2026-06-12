# OpenMed Integration Plan

OpenMed is a good fit for Mere Medical when it is treated as an optional local
clinical NLP service, not as a replacement for FHIR sync or the existing
Ollama/OpenAI assistant path.

## Implemented Foundation

- Add local experimental settings for an OpenMed REST endpoint.
- Add a browser-side OpenMed client for `/health` and `/pii/deidentify`.
- Add a settings connection test for local OpenMed.
- When the user selects OpenAI and enables OpenMed de-identification, run the
  retrieved RAG context and patient question through OpenMed before building the
  OpenAI prompt.
- Fail closed if OpenMed de-identification fails, so raw medical record context
  is not sent to the cloud provider.

## Realistic Follow-Up Phases

### Phase 1: Private Cloud-AI Guardrail

Scope:

- Keep OpenMed behind experimental settings.
- Apply de-identification only to prompt context sent to OpenAI.
- Keep source documents local and unchanged so citations still work in Mere.

Why first:

- Smallest surface area.
- No schema migration.
- Clear privacy benefit for users who opt into OpenAI.

### Phase 2: Export and Sharing De-Identification

Scope:

- Add an optional "De-identify with OpenMed" checkbox to record export and
  sharing flows.
- Transform only generated export payloads; do not mutate stored records.
- Include an export note that the package was de-identified locally.

Likely files:

- `apps/web/src/features/record-export/RecordExportTab.tsx`
- `apps/web/src/features/sharing/SharingTab.tsx`
- `apps/web/src/services/emrpkg`

Important constraint:

- Export de-identification should handle JSON/FHIR fields deliberately, not by
  stringifying full resources and replacing text blindly. Dates, coded values,
  identifiers, attachments, and provenance each need explicit rules.

### Phase 3: Clinical Entity Extraction

Scope:

- Add OpenMed `/analyze` support to the client.
- Extract clinical entities from `DocumentReference` text, manual notes, and
  selected free-text fields.
- Store extracted entities as derived metadata in a new local collection or
  workflow record, not in the source FHIR resources.

Potential uses:

- Better document search facets.
- Timeline badges for diseases, medications, anatomy, procedures, genes, and
  chemicals.
- Visit-prep summaries with entity-level citations.

Important constraint:

- Treat OpenMed output as derived hints. Do not create diagnoses, medications,
  or allergies from model output without user review.

### Phase 4: RAG Retrieval Improvements

Scope:

- Include extracted entities in vector chunks.
- Use entity overlap to boost or filter search results before reranking.
- Keep Ollama as the preferred default for fully local Q&A.

Why later:

- Retrieval quality changes are harder to validate than a privacy guardrail.
- It needs fixtures and comparison tests to avoid making search worse.

## Local Runtime Assumption

Mere should assume OpenMed is user-managed at first. The app only needs a local
HTTP endpoint that exposes compatible `/health` and `/pii/deidentify` routes.

Before publishing user-facing setup instructions, validate the exact OpenMed
service command against the target OpenMed release and document that version.
