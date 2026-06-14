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

## OpenMed Capabilities Worth Bringing Over

The OpenMed docs currently describe these capabilities that line up with Mere:

- REST endpoints for `/health`, `/models/loaded`, `/models/unload`,
  `/analyze`, `/pii/extract`, and `/pii/deidentify`.
- Advanced NER post-processing with confidence filtering, short-span cleanup,
  regex exclusions, edge stripping, adjacent entity merging, and BIO grouping
  fixes.
- Output formatting that can normalize predictions into dictionaries, JSON,
  HTML snippets, or CSV rows.
- HTML entity output with semantic `data-entity` attributes, which is a natural
  fit for record previews and document viewers.
- Sentence spans and metadata forwarding so extracted entities can retain their
  originating document, clinical section, or model context.
- Smart PII entity merging for dates, phone numbers, IDs, and other semantic
  units that token classifiers may fragment.
- Batch processing and model keep-alive support for longer-running sync or
  import workflows.

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

### Phase 4: Entity Highlights in Record Previews

Scope:

- Add OpenMed `/analyze` support to the browser client.
- Build a derived entity model with text span offsets, entity labels,
  confidence, source document ID, model name, and extraction timestamp.
- Highlight clinical entities inside text and HTML record previews.
- When privacy mode is enabled, call `/pii/deidentify` first and render the
  de-identified preview with clinical entities overlaid on the scrubbed text.
- Keep the original FHIR resources and attachments unchanged.

Likely files:

- `apps/web/src/services/openmed/openmedClient.ts`
- `apps/web/src/features/timeline/components/document-reference/ShowDocumentReferenceResultsExpandable.tsx`
- `apps/web/src/features/timeline/components/document-reference/EmbeddedAttachmentViewer.tsx`
- `apps/web/src/features/timeline/components/document-reference/DisplayCCDARawSection.tsx`
- `apps/web/src/features/documents/DocumentsTab.tsx`
- `apps/web/src/models/workflow-record` or a new derived-entity collection

Rendering approach:

- Prefer JSON entity spans as the source of truth inside Mere.
- Generate highlight markup in Mere from sanitized source text and offsets.
- Accept OpenMed HTML only as a convenience output after sanitizing with
  DOMPurify and restricting allowed attributes to safe metadata such as
  `data-entity`.
- Use one visual style per high-level entity class: condition, medication,
  procedure, lab/result, anatomy, gene, chemical, PHI.
- Tooltips can show label, confidence, and source model, but should avoid
  clinical claims beyond the extracted span.

Privacy behavior:

- Default preview mode should show the original local record because the user is
  viewing their own data on their own device.
- A privacy toggle can switch previews into de-identified mode for screen
  sharing, caregiver review, screenshots, or export preparation.
- In privacy mode, PHI spans should be hidden or replaced before clinical entity
  highlighting is rendered.
- If OpenMed is unavailable, privacy mode should fail closed for any preview
  that would otherwise claim to be de-identified.

Data model:

- Store entity extraction as derived data keyed by source document ID and source
  text hash.
- Re-run extraction only when the source text hash, model name, threshold, or
  OpenMed version changes.
- Keep derived records disposable so users can clear them without affecting
  synced medical records.

Testing:

- Unit-test offset-to-highlight rendering with overlapping, adjacent, and
  repeated spans.
- Verify DOMPurify strips unsafe HTML while preserving permitted `data-entity`
  attributes.
- Add fixtures for PHI plus clinical entities in the same sentence.
- Add a UI test for toggling original vs de-identified preview.

Do not do:

- Do not write OpenMed-highlighted HTML back into FHIR resources.
- Do not treat highlighted entities as confirmed diagnoses, medications, or
  allergies.
- Do not send original record text to OpenAI to produce highlights; OpenMed is
  the local extraction path.

### Phase 5: RAG Retrieval Improvements

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

Current OpenMed REST docs show local startup on port `8080`:

```sh
uvicorn openmed.service.app:app --host 0.0.0.0 --port 8080
```

Before publishing user-facing setup instructions, validate the exact install
command, service command, and endpoint schema against the target OpenMed release
and document that version.

## Source Notes

- OpenMed docs, June 12, 2026: REST service endpoints and local `uvicorn`
  startup.
- OpenMed docs, June 11, 2026: advanced NER processing, output formatter,
  HTML snippets with `data-entity`, CSV/JSON-style formatting, sentence spans,
  metadata forwarding, and guardrails.
- OpenMed docs, PII smart entity merging: fragmented token handling for dates,
  phone numbers, IDs, and other semantic units.
