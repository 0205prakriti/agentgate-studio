# Phase 1 implementation plan

## Baseline and decisions

The initial workspace contained AGENTS.md, docs/phase1.md, and docs/ARCHITECTURE.md only: no implementation, dependency manifests, tests, or Git history. `docs/phase1.md` is the supplied implementation specification (the requested `docs/PHASE_1.md` does not exist). It ends at the first entry under “five simple views”; implement only explicitly specified capabilities, without inventing additional views.

The user's stack instruction selects **LLM Guard plus deterministic policies**, superseding the spec's Prompt Guard 2 selection. Use LLM Guard's existing prompt-injection scanner; no new classifier and no claim of complete protection. The small Python scanner boundary exists because the scanner is Python, not to split the application into microservices.

Use a single Node controller library, imported by the local Next.js server, with domain contracts and SQLite infrastructure separated from UI. Agent execution runs in a bounded in-process runner owned by the controller (one run at a time, 120 s deadline, durable queue in SQLite), never inside an HTTP request. Evaluations get a separate process only if they need isolation. SQLite owns application records. SQLite is the canonical owner of Pi message history (Pi's agent core keeps it in memory only); stored messages are replayed into a fresh agent for each run.

## Dependency reuse

| Responsibility                    | Reuse                                                                   | Integration decision                                                                                                          |
| --------------------------------- | ----------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| UI                                | Next.js, React, Tailwind, shadcn/ui                                     | Server-rendered workspace; accessible component composition.                                                                  |
| Agent harness and model selection | [Pi SDK](https://github.com/badlogic/pi-mono)                           | Reuse agent loop and provider contracts; disable default filesystem/shell tools until explicitly approved capabilities exist. |
| Local models                      | [Ollama](https://github.com/ollama/ollama)                              | Local endpoint and actual installed model verification; no inference engine implementation.                                   |
| Runtime scans                     | [LLM Guard](https://github.com/protectai/llm-guard)                     | Python adapter with validated responses, deadlines, and fail-closed behavior; deterministic rules remain application-owned.   |
| Evaluation                        | [Promptfoo](https://www.promptfoo.dev/docs/integrations/github-action/) | One suite shared by worker and CI; deterministic required tests, separately labeled live-model tests.                         |
| Persistence                       | SQLite via better-sqlite3                                               | Transactional migrations, later FTS5; no ORM or vector service needed.                                                        |
| Contracts                         | Zod                                                                     | Validate external requests and stored results.                                                                                |
| Verification                      | Vitest, GitHub Actions                                                  | Add browser coverage as interactive execution arrives.                                                                        |

Install dependencies only when used; pin exact versions and commit the lockfile. Future Pi, scanner, credential-store, and Promptfoo versions must be checked at integration time. Native credential storage must be selected and tested before any API-key form is exposed. Never use Pi's plaintext credential persistence for saved provider keys.

## Milestones and verification gates

### A — Working foundation

- **A1: project persistence:** UI → controller → SQLite → reopen project. Verify invalid inputs, stored output validation, database restart, missing IDs, private file mode, production build, and browser flow.
- **A2: local execution:** integrate Pi with one real Ollama model, bounded durable jobs, streamed execution events, and persistent sessions. Verify disconnects, timeouts, restarts, and canonical session ownership.
- **A3: cloud connection:** protected OS credential storage, test/select provider and model, sanitized failures. Verify no saved key reaches responses, UI, logs, or SQLite.
- Exit: run a real task, restart, and reopen its persisted session.

### B — Shared context and reference RAG

Structured goals, approved decisions, verified outcomes, workspace references, context preview, and explicit handoff between two configured models. Build document ingestion and SQLite FTS5 retrieval. Test source attribution, path confinement, secret exclusion, and persistence. Exit: two real models retain relevant project context; the RAG answer uses retrieved documents.

### C — Enforced guardrails

One pipeline: input checks → retrieval → document scan → generation → output inspection → deliver/block. Quarantine prohibited documents and record rule, source, outcome, timestamp, and safe evidence. Test scanner unavailable/malformed/timeout outcomes, deterministic restrictions, and secret-bearing outputs. Exit: benign input succeeds and controlled malicious content is actually blocked, with inspectable attribution. No uninspected streamed model text may bypass output checks.

### D — Evaluations and CI

Version-controlled Promptfoo suite executed by a bounded worker and GitHub Actions. Persist configuration identity and structured results; show dashboard results and corresponding GitHub run links. Keep deliberately weak configuration isolated and explicitly labeled; never enable it by default. Verify a real required assertion fails under that configuration and passes after the protection fix. Required CI must need no paid model key. Exit requires an actual GitHub run, not just a workflow file.

### E — Final integration

Browser end-to-end and mobile checks, restart recovery, invalid credentials, disconnected models, scanner failures, dead-code/debt review, architecture/setup/limitations, and rehearsal using real services. Exit requires all Phase 1 deliverables and the full reproducible demo.

## Status

A1–A3, B, and C are complete. D is implemented and verified locally; its exit criterion (an actual GitHub run) is pending because no repository is connected. E is planned work, not technical debt. A2 grants agents no tools (no filesystem or shell).

D limitations: the required suite uses a scripted model fixture, so it proves the application stops unsafe content whatever a model says, not that any real model behaves safely; live-model evaluations were not added. LLM Guard is conservative and also flags credential-seeking questions such as "What is the admin key?" as injection (observed, score 1.0), so expect false positives. Browser E2E needs Ollama and is run locally, not in CI.

C limitations: model text is held until the answer has been inspected, so answers appear after generation completes rather than token by token. Prompt-injection detection is LLM Guard's `PromptInjection` scanner (threshold 0.9, chunked); it can miss attacks and flag benign text. Deterministic rules cover a small set of credential formats, destructive operations, and data-carrying links. The scanner is a separate local service that must be started (`npm run scanner`).

B limitations: the reference folder (`AGENTGATE_DOCS_ROOT`) is the only place documents are read from, and only `.md`/`.txt` files up to 200 KB; the tiny local models used for verification (0.4–0.5B parameters) often answer poorly even with correct context, so answer quality is not asserted by automated tests. Deterministic secret rules cover well-known credential formats only.

A3 limitation: no valid paid cloud key was available, so a successful cloud connection and cloud run were not exercised; invalid-key rejection was verified live against Anthropic and OpenAI. Cloud providers are limited to Anthropic and OpenAI. Pi also honours provider environment variables such as `ANTHROPIC_API_KEY`; the Models page labels that source.

A2 limitations: one model provider (Ollama); a cancel issued while a model is still being opened is ignored; the Ollama OpenAI-compatible endpoint uses Ollama's default context length.

No Git remote was supplied. Local commits are possible; hosted GitHub Actions evidence requires a configured repository and pushed workflow.

## A1 verification evidence

- `npm run check`: strict typecheck, Biome lint, Prettier check, 23 tests across two files, and production Next.js build passed.
- Tests cover SQLite reopening, invalid input, SQL-looking names, unknown IDs, corrupt stored output, unsupported database versions, private file permissions, and fail-closed local-origin authorization.
- Chrome against the production server: created a project, returned to the list, reopened it, restarted the server, and reloaded the same persisted ID. Whitespace-only input showed a validation error without creating a record.
- Workspace visually inspected at desktop and 390px mobile viewport; full Phase 1 browser automation remains milestone E work.
- `npm audit`: zero known vulnerabilities at verification time. Biome replaces the initially evaluated ESLint stack to avoid its reported vulnerable minimatch dependency tree.
- Local verification used isolated data under ignored `.agentgate/verification`; no model calls or scanner detections were simulated.

## A2 verification evidence

- `npm run check`: typecheck, Biome, Prettier, Vitest, and production build.
- Controller tests (Pi's own faux provider for deterministic cases): streamed events, transcript replay into the next turn, restart reopen, model failure and unopenable model, hard timeout and cancel, interrupted-run recovery, corrupt transcript rejection, one active run per session.
- Live integration (needs `AGENTGATE_OLLAMA_URL` and `AGENTGATE_OLLAMA_MODEL`): a real task through Pi and Ollama `qwen2.5:0.5b`, plus rejection of a model that is not installed.
- Browser E2E (`npm run test:e2e`, `AGENTGATE_E2E_MODEL=<model>`): Chrome against the production server created a project, a session, streamed a real answer, and reloaded the persisted conversation. With Ollama unreachable the project page shows how to start it.

## A3 verification evidence

- Saved keys use a keychain-backed implementation of Pi's `CredentialStore`; nothing is written to SQLite or disk. A test round-trips a key through the real macOS keychain.
- Adding a key sends one tiny request and saves only if the provider accepts it. Provider errors are mapped to a fixed vocabulary, so echoed key fragments never reach SQLite, the UI, or logs. The UI receives only the connected/not-connected state and source label.
- Live (`AGENTGATE_LIVE_CLOUD=1`, no paid key needed): an invalid key is rejected by Anthropic and OpenAI with the sanitized message, and nothing is saved. The same flow passes in Chrome and the key is absent from the page.

## B verification evidence

- Tests: context rendering/persistence/credential rejection, FTS5 retrieval with source attribution, project scoping, restart persistence, FTS operator neutralization, path confinement (traversal, absolute, symlink file and directory), secret/oversized/empty file exclusion, and that context reaches the system prompt while excerpts reach the model call only and are not stored in history.
- Real models (`qwen2.5:0.5b`, `smollm2:360m`): both recalled a goal stored in the shared context; `smollm2` answered from retrieved sample documents (30-day returns, 45 dollar expedited shipping), and every answer lists its retrieved sources.
- Chrome E2E: one project, shared context and references added, two sessions on two models, each showing retrieved sources and the same context preview.

## C verification evidence

- Pipeline: input check (secrets, disallowed operations, LLM Guard) → retrieval → LLM Guard scan of retrieved passages → generation → output inspection → deliver or block. Documents are also scanned at ingestion and quarantined (kept but never retrieved).
- Every block or quarantine is stored with stage, rule, source, outcome, timestamp, score, and a secret-free excerpt, and shown on the Security page.
- Tests: deterministic rules; blocked tasks never reach the model; answers with secrets or exfiltration links are withheld and not persisted; scanner unreachable/timeout/HTTP error/malformed/wrong-shape/wrong-count all fail closed for input, retrieval, and ingestion (real local HTTP servers); ingestion and retrieval-time quarantine.
- Live (`AGENTGATE_SCANNER_URL`): with the real LLM Guard model, the three benign sample documents are ingested, `fixtures/attack/poisoned-faq.md` is quarantined, a normal question completes, and a real injection prompt is blocked.
- Chrome E2E against the real scanner and Ollama: quarantine of the poisoned document and a blocked injection prompt are visible with rule, source, and score on the Security page.

## D verification evidence

- `evals/` holds the version-controlled Promptfoo suite: 12 cases (3 functional, 9 security) that run the real ingestion, retrieval, LLM Guard scan, generation, and output-inspection path. `evals/weak.promptfooconfig.yaml` is the only place the protections are switched off, is labelled as deliberately weak, and is never a default.
- Local results: `npm run eval` passes 12/12 (exit 0). `npm run eval:weak` fails the 7 security cases it should, while all 3 functional cases still pass (exit 100).
- Real regression: disabling the secret check in `ProtectionPipeline.inspectOutput` made the required case "a compromised model that emits a credential is stopped before delivery" fail (11/12); restoring the code returned 12/12.
- The dashboard (`/evaluations`) runs the suite through a bounded worker (one at a time, 10-minute limit, minimal child environment, no secrets inherited), persists the configuration hash (all evaluated files plus pins), commit, and per-case results in SQLite, and lists GitHub Actions runs through `gh`, linking the run whose commit matches. Chrome E2E ran both profiles from the dashboard.
- `.github/workflows/verify.yml` (actionlint clean) defines two required jobs: `verify` (`npm run check`) and `security-evals` (CPU LLM Guard, live scanner tests, the required suite, and a step that fails the job if the weak configuration passes). No paid key is used. Results are uploaded as an artifact.
- `npm audit`: promptfoo's transitive `minimatch`, `glob`, and `basic-ftp` are overridden to patched versions; 0 known vulnerabilities.
