# AGENTGATE Studio

A local web app for running Pi agent sessions on Ollama or cloud models, with shared project context, reference RAG, and enforced security checks. Phase 1 is in progress; see the [implementation plan](docs/IMPLEMENTATION_PLAN.md) for status and limits, the [architecture](docs/ARCHITECTURE.md), and the [Phase 1 specification](docs/phase1.md).

## Setup

Requirements: Node.js 24 (`nvm use`), npm, [Ollama](https://ollama.com) for local models, and Python 3.11 for the scanner.

```sh
npm ci
ollama serve &                 # then: ollama pull qwen2.5:0.5b
npm run scanner:setup          # one-time: LLM Guard in scanner/.venv (large download)
npm run scanner &              # prompt-injection scanner on 127.0.0.1:8765
AGENTGATE_DOCS_ROOT="$PWD/fixtures" npm run dev
```

Open http://127.0.0.1:3000.

| Variable                | Purpose                                            |
| ----------------------- | -------------------------------------------------- |
| `AGENTGATE_DATA_DIR`    | SQLite location (default `~/.agentgate`)           |
| `AGENTGATE_DOCS_ROOT`   | Only folder reference documents may be read from   |
| `AGENTGATE_OLLAMA_URL`  | Ollama endpoint (default `http://127.0.0.1:11434`) |
| `AGENTGATE_SCANNER_URL` | Scanner endpoint (default `http://127.0.0.1:8765`) |

Cloud keys (Anthropic, OpenAI) are entered on the Models page, tested with one small request, and stored in the operating system's credential store, never in SQLite or on disk. Try the sample documents by referencing `rag`, and the controlled malicious document by referencing `attack`.

## Security notes

Single-user and loopback-only: do not expose it on a public interface. Mutations require a matching loopback Origin and Host. Agents have no tools. If the scanner is unreachable, document ingestion and every run fail closed and the reason is shown. Checks reduce risk but do not guarantee protection from all attacks. SQLite is not encrypted, so keep secrets out of project names, context, and documents (known credential formats are rejected).

## Verify

```sh
npm run check        # typecheck, lint, format, unit/integration tests, production build
npm run test:e2e     # Chrome end-to-end; see docs/IMPLEMENTATION_PLAN.md for the live-service variables
```

`npm run eval` runs the Promptfoo suite (needs the scanner); `npm run eval:weak` runs the deliberately weak demonstration, which must fail. Both are also on the Evaluations page.

Live-service tests are skipped unless `AGENTGATE_OLLAMA_URL` + `AGENTGATE_OLLAMA_MODEL`, `AGENTGATE_SCANNER_URL`, or `AGENTGATE_LIVE_CLOUD=1` are set.

## Known limitations

- Single user, loopback only, no authentication. SQLite is not encrypted.
- Local models: Ollama only. Cloud: Anthropic and OpenAI through Pi. A successful cloud connection and cloud run were not exercised (no paid key was available); invalid-key rejection was verified live.
- Agents have no tools: no filesystem or shell access is granted.
- Reference documents: `.md`/`.txt` files up to 200 KB from one folder (`AGENTGATE_DOCS_ROOT`), non-recursive.
- Answers appear after generation finishes, because model text is held until it has been inspected.
- Prompt-injection detection is LLM Guard's classifier (threshold 0.9). It can miss attacks and flag benign text, for example it flags credential-seeking questions such as "What is the admin key?". Deterministic rules cover only well-known credential formats, a few destructive operations, and data-carrying links.
- The tiny local models used in verification (0.4–0.5B parameters) often answer poorly even with correct context; automated tests assert retrieval, context, and enforcement, not answer quality.
- The required evaluation suite uses a scripted model fixture. It proves the application stops unsafe content whatever a model says, not that any real model behaves safely. No live-model evaluation suite exists.
- Browser E2E needs Ollama and the scanner, so it is run locally, not in CI.
- The scanner and Ollama are separate local processes the user starts; the app reports when they are unreachable.
