# Decisions — editor-and-enrichment

## Architectural Decisions
- NoteEditor: pure enhanced textarea (NOT Tiptap) — lightweight, fast
- ArticleEditor: Tiptap with ProseMirror — full block editor
- Content storage: Tiptap JSON string in `content` column + plain text mirror in `content_text`
- Image upload: R2 via /api/upload API route, served via /api/images/* proxy
- Image auth guard: returns 401 JSON (NOT redirect) for API routes
- beforeunload: browser native confirm (no custom modal, no auto-save)
- Tags: admin-curated only, stored in junction table (NOT JSON array)
- Self-answer: stored in selfAnswers table (canonical), NOT in responses table

## Wave Execution Order
1a: T1 → T5 (sequential, package.json shared)
1b: T6 + T14 (parallel, independent)
2: T2 → T3 (sequential, schema shared) + T4 + T19 (parallel)
3: T7 + T10 + T12 + T13 (parallel, after deps)
4: T8 + T18 + T20 + T21 + T22 + T27 (parallel, after deps)
5: T15 + T25 + T24 + T28 (parallel)
6: T16 → T23 (sequential, T23 after T16)
7: T30 + T31 + T32 + T33 (parallel)
FINAL: T34 + T35 + T36 + T37 (parallel)
