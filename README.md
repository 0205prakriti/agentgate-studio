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
