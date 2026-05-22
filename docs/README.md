# Developer Docs

This directory holds architecture and format documentation for developers
working on Mere Medical. End-user docs live in `apps/docs/` (the Docusaurus
site published at meremedical.co).

## Index

| File                                         | Topic                                                        |
| -------------------------------------------- | ------------------------------------------------------------ |
| [architecture.md](./architecture.md)         | Local-first data layer, `packages/` layout, Convex-shaped design.   |
| [emrpkg-format.md](./emrpkg-format.md)       | `.emrpkg` file format spec: envelope, zip, manifest, encryption.    |
| [migration.md](./migration.md)               | RxDB → Dexie migration roadmap, the feature flag, what's left.      |
| [serverless-mode.md](./serverless-mode.md)   | Running Mere fully serverless (no `apps/api`, `.emrpkg` only).      |

## Audience

- Code reviewers landing PRs against the data layer or `.emrpkg` flow.
- Anyone porting Mere to a new storage backend (Convex, SQLite, etc.).
- Anyone implementing a third-party reader/writer for `.emrpkg`.

End-users looking for "how do I export my data" should go to the FAQ in
`apps/docs/docs/FAQ.md` instead.
