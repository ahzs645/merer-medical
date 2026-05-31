---
title: "AI Feature Notes"
description: "Agent-oriented notes for AI providers, RAG, and vector storage."
sidebar:
  order: 3
---

Mere Medical includes AI chat, recommendations, and vector-backed retrieval features. These features can process sensitive health records, so changes need a tighter privacy review than ordinary UI work.

## Key Files

| Area | Files |
| --- | --- |
| Provider interface | `apps/web/src/services/ai/types.ts` |
| OpenAI provider | `apps/web/src/services/ai/openai-provider.ts` |
| Ollama provider | `apps/web/src/services/ai/ollama-provider.ts` |
| Chat/RAG orchestration | `apps/web/src/features/ai-chat` |
| Vector storage | `libs/vector-storage/src/VectorStorage.ts` |
| Vector React providers | `apps/web/src/features/vectors` |
| User setup docs | `docs/starlight/src/content/docs/getting-started/ai-setup.md` |

## Provider Contract

An `AIProvider` supports:

- `complete`
- `completeJSON`
- `streamComplete`
- optional `getConfig`

Provider implementations should preserve the same call semantics so chat, reranking, document preparation, and recommendation flows can swap providers without provider-specific branches spread through the UI.

## Vector Storage

`VectorStorage` keeps vector documents in an RxDB-backed collection and accepts either an OpenAI API key or a custom `embedTextsFn`. It hashes text content, avoids re-embedding unchanged documents, and can filter similarity search results by metadata.

The vector pipeline is currently tied to RxDB. It is disabled when the development Dexie repository flag is enabled:

```js
localStorage.setItem('mere.useDexieRepos', 'true');
```

Do not remove that guard until vector reads and writes have a Dexie-compatible path.

## Privacy Boundaries

- Local Ollama keeps model calls on the user's machine, subject to their local setup.
- OpenAI calls send selected prompt and context content to an external provider based on user configuration.
- RAG and reranking code should minimize the amount of record text included in prompts.
- Do not log prompts, retrieved chunks, generated summaries, or source record content.

## Agent Checklist

Before returning AI-related changes:

- Confirm which provider path was changed.
- Confirm whether prompts or retrieved context can contain health data.
- Add tests for provider parsing, JSON completion, reranking, or document-preparation behavior where practical.
- Update user-facing or developer docs if setup, privacy behavior, or provider configuration changed.
