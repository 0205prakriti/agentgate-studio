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

Milestones A1–A3, B, C, D, and E's local checks are complete, and CI has run on GitHub ([repository](https://github.com/Rizsaurav/agentgate-studio)). Known limitations are listed in the [README](../README.md#known-limitations). Remaining before declaring Phase 1 finished: a human rehearsal of the full demo, and a live-model (non-scripted) evaluation suite if wanted. Neither is required by the milestone exit criteria.

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

## E verification evidence

- Chrome E2E (`npm run test:e2e`, real Ollama, real scanner): create a project and run a real model session; shared context and retrieved sources across two models; quarantine of the poisoned document and a blocked injection with inspectable reasons; running the required and the deliberately weak suites from the dashboard; invalid cloud key rejected without echo; disconnected Ollama shows how to start it.
- Restart recovery: a server killed with SIGKILL and started again on the same data directory shows the same project, session, and conversation. A task running at the time of a crash is marked failed ("Interrupted by an application restart") and queued work resumes (unit tests).
- Scanner outage in the browser: referencing documents is refused with "security scanner is unavailable" and nothing is ingested; a task is blocked with rule `scanner-unavailable`.
- Layout: the home, project, models, security, and evaluations pages have no horizontal overflow at 390 px.
- Debt review: no TODO/FIXME, `console.log`, or explicit `any`; unused exports were removed; evals and e2e code are now type-checked; Promptfoo variables are schema-validated; `npm audit` reports 0 vulnerabilities.

## D hosted CI evidence (GitHub Actions)

- First pushed run failed at `npm ci`: [run 41429648918](https://github.com/Rizsaurav/agentgate-studio/actions/runs/41429648918). Promptfoo depends on `@opentelemetry/api ^1.9.0` (resolved to 1.10.0) while its SDK packages require `<1.10.0`, and a required `@types/json-schema` peer was missing from the macOS-generated lockfile. Fixed with an `overrides` pin and an explicit dev dependency. A second run failed starting the scanner because only `llm-guard` and `transformers` were pinned; the scanner runtime stack is now pinned. Neither problem was visible locally.
- Passing run on `main`: [run 41431132631](https://github.com/Rizsaurav/agentgate-studio/actions/runs/41431132631). Both required jobs succeeded: `verify` (`npm run check`) and `security-evals` (7 test files including the live LLM Guard scanner tests, required suite 12/12, weak configuration failed 7 security cases as required, results artifact uploaded). No paid API key is involved.
- Intentional regression: the secret check in `ProtectionPipeline.inspectOutput` was disabled on a temporary branch. CI failed on both jobs: [run 41431573320](https://github.com/Rizsaurav/agentgate-studio/actions/runs/41431573320). Reverting it returned CI to green: [run 41432032997](https://github.com/Rizsaurav/agentgate-studio/actions/runs/41432032997). The branch was then deleted; the runs remain.
- The Evaluations page lists these runs through `gh` and links the run whose commit matches a stored local evaluation.

## Easy local setup (first harness slice)

- `npm run setup` checks Node, installs Ollama (Homebrew, after asking) and builds the pinned scanner environment (uses `uv`, which fetches Python 3.11 itself, when present). `npm start` starts whatever is not already running, waits for readiness, and opens the Models page.
- The Models page has a system check (Ollama, scanner, reference folder, each with its fix), the installed local models with sizes, hardware-based recommendations (largest curated model that fits the machine's memory is marked "Best fit"), one-click install with real progress and cancel, and a custom Ollama model name validated against a strict pattern. One download at a time, 60-minute limit.
- Verified: unit tests (recommendation rules, name validation, progress aggregation, error and cancel paths), a live 90 MB download through real Ollama, a cold `npm start`, and a Chrome test that installs a model from the page, including the invalid-name error.

## Roadmap: the 8-stage pipeline and its known limits

Where the app stands against the stages in the product diagram, with what published guidance says about each limit. Sources are mostly practitioner and vendor material, apart from the NDSS and arXiv papers; verify before relying on specifics.

| Stage                   | Today                                                         | Main limit and planned direction                                                                                                                                                                                                                                                                                                                                                                                      |
| ----------------------- | ------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1 API call              | Done (Pi, Ollama, Anthropic, OpenAI)                          | Easy local setup is the current focus.                                                                                                                                                                                                                                                                                                                                                                                |
| 2 System prompt         | Fixed prompt plus shared project context                      | Not editable or versioned. Add a per-project prompt with a version id, which also becomes part of any cache key.                                                                                                                                                                                                                                                                                                      |
| 3 RAG                   | FTS5 keyword search, 800-character chunks, source attribution | Keyword-only misses paraphrases. Next: measure retrieval recall and precision on a labelled question set before changing anything, then try hybrid search and reranking only if the numbers justify them. Character-level chunking gave the best recall but the worst answer quality for a 1.5B model in one thesis, so test chunking with the local models in use.                                                   |
| 4 MCP tools             | None: agents have no tools by design                          | Tool descriptions can carry hidden instructions (tool poisoning) and the protocol does not solve prompt injection. Add tools only behind an approved allow-list, scanning descriptions with the existing scanner and requiring human confirmation for sensitive actions.                                                                                                                                              |
| 5 RBAC + OAuth          | None: single user, loopback only                              | Relevance is not authorization. When users exist, enforce per-document permissions before text reaches the model (filter at retrieval, over-fetch then filter, re-check against the source), and validate token issuer, audience, and expiry per request. Never pass a client's token through to another API.                                                                                                         |
| 6 Guardrails            | Done (LLM Guard plus deterministic rules, fail closed)        | Classifier false positives and misses (documented). A deterministic policy violation, such as an RBAC denial, should return its message directly without calling the model or the classifier, as discussed in the diagram's comment thread.                                                                                                                                                                           |
| 7 Cache + Router        | None                                                          | A semantic cache can serve one user's answer to another, be poisoned by crafted entries, and keep serving answers after access is revoked. If added: key on user, model, and prompt version as a literal prefix (never the embedding), purge on document or permission change, re-check policy at serve time, and log which context each hit used. A router for local versus cloud models is separate and lower risk. |
| 8 Observability + Evals | Security events, Promptfoo suite, GitHub Actions              | No request trace. Add a per-run timeline (prompt, retrieval, scan, model, output check) from data already stored in `run_events` and `security_events`. Keep generation and retrieval scored separately, and validate evals against real queries, not only synthetic ones.                                                                                                                                            |

Suggested order: (1) trace view and retrieval evaluation, since they make every later change measurable; (2) editable versioned system prompt; (3) hybrid retrieval and reranking if measurements justify them; (4) allow-listed tools with confirmation; (5) accounts, RBAC, and a safely keyed cache only if multi-user use is needed.

Sources: [RAG access control](https://www.cerbos.dev/ecosystem/rag), [ReBAC for RAG](https://nhimg.org/articles/rebac-is-the-missing-permission-layer-for-enterprise-rag-pipelines/), [semantic cache poisoning (NDSS)](https://www.ndss-symposium.org/ndss-paper/when-cache-poisoning-meets-llm-systems-semantic-cache-poisoning-and-its-countermeasures/), [cache key-collision attacks (arXiv)](https://arxiv.org/abs/2601.23088v1), [semantic cache leakage](https://tianpan.co/blog/2026-04-23-semantic-cache-cross-user-leak), [MCP authorization and confused deputy](https://www.flowhunt.io/blog/mcp-authentication-authorization-oauth-confused-deputy/), [MCP security landscape](https://radar.apideck.com/blog/understanding-the-security-landscape-of-mcp), [MCP risks](https://workos.com/blog/mcp-security-risks-best-practices), [chunking trade-offs for small models](https://arxiv.org/pdf/2606.00881), [RAG error taxonomy](https://arxiv.org/pdf/2510.13975), [retriever precision vs recall](https://oneuptime.com/blog/post/2026-08-31-context-precision-vs-context-recall-rag/markdown).
