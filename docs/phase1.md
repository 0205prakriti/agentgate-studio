AGENTGATE Studio — Phase 1 Implementation Plan

Phase 1 Deliverables

The project is complete only when these artifacts exist:

Working responsive AGENTGATE Studio web application.

Integrated Pi runtime with local and API-key cloud model selection.

Persistent project sessions and inspectable shared context.

Functional reference RAG application.

Enforced input, retrieval, and output security controls.

Visual security findings with source attribution.

Promptfoo evaluation suite and functioning GitHub Actions CI.

Passing automated tests and documented failure scenarios.

Architecture diagram, setup guide, and known limitations.

Reproducible live demonstration.

11. Required Final Demo

Open AGENTGATE Studio and select the RAG project.

Connect or select an available local/cloud model.

Ask a normal question and show the answer with retrieved context.

Switch models and show that relevant project context is retained.

Introduce a controlled malicious document.

Show the security rule blocking or quarantining the content, including the source and reason.

Run the security evaluation suite and inspect the results.

Demonstrate a failing CI check for an intentional regression.

Correct the problem, rerun verification, and show passing results.

All results must be produced by actual application code. The demo may use prepared test fixtures but must not present mock security findings as real detections.

12. Explicitly Out of Scope

Do not implement the following in Phase 1:

A new agent reasoning engine.

Autonomous multi-agent swarms.

Kubernetes or distributed cloud execution.

A general-purpose model gateway.

Automatic production deployment.

Arbitrary third-party RAG framework integrations.

Mobile-native applications.

Custom security models.

A plugin marketplace.

A complete IDE or code editor.

These belong to later phases only after the MVP is stable.

Final Acceptance Rule

Do not declare Phase 1 complete because the UI looks finished.

Completion requires a working end-to-end product demonstrating model control, shared context, security enforcement, and automated CI verification.

Every core feature must be usable, testable, and documented. Reliability and maintainability take priority over feature count.


1. Product Objective

Build a full-stack web application that lets users:

Connect local LLMs or cloud models using API keys.

Select and switch models within a project.

Run an existing agent harness with persistent project context.

Inspect and control the context shared between models.

Apply security guardrails to a reference RAG application.

Run automated functional and security evaluations.

View test results, security findings, and CI status in one interface.

Product principle: Integrate proven engines. Build the experience and orchestration connecting them. Do not recreate established frameworks.

2. Approved Technology Stack

Component

Technology

Responsibility

Frontend

Next.js, TypeScript, Tailwind, shadcn/ui

Responsive control dashboard

Agent runtime

Pi SDK

Agent sessions, tools, model control

Local inference

Ollama

Local LLM execution

Cloud models

Pi provider integrations

API-key-based model access

Persistence

SQLite

Projects, context, security events, evaluations

RAG reference

SQLite FTS5 + selected LLM

Document retrieval and grounded responses

Security

Prompt Guard 2 + deterministic policies

Input, retrieval, and output checks

Evaluations

Promptfoo

Functional and security regression tests

CI

GitHub Actions

Automated validation

Development

Docker Compose where needed

Reproducible local services

Use existing SDKs and APIs. Pin working dependency versions.

Do not introduce another agent framework, model gateway, vector database, or workflow engine without demonstrating a missing capability.

3. Architecture

Application flow:

Web UI → Local Controller → Pi Agent Runtime → Selected Model

Supporting services:

Context Manager: stores project instructions, verified decisions, and references to prior results.

Security Engine: checks inputs, retrieved documents, outputs, and permitted tool operations.

Evaluation Runner: executes Promptfoo and saves structured findings.

CI Integration: runs the same checks through GitHub Actions.

The Node.js controller owns orchestration and application state. A small Python scanner service may host Prompt Guard 2.

Maintain one canonical owner for each type of data. Never duplicate session histories or security policies across services.

Use explicit interfaces for model providers, scanners, and evaluation runners. Keep business logic independent of Next.js UI components.

4. Phase 1 Development Sequence

Milestone A — Working Foundation

Initialize the monorepo with strict TypeScript, linting, formatting, and automated tests.

Build the responsive application shell.

Integrate Pi SDK through a local controller.

Connect Ollama and verify one locally available model.

Support adding, testing, and selecting cloud-provider API keys.

Stream actual model responses and execution events into the UI.

Persist project sessions between application restarts.

Exit criteria: A user can start a project, select a configured model, run a task, restart the application, and reopen the session.

Milestone B — Context and Project Management

Add a project workspace with file and document references.

Maintain one structured project context record containing goals, approved decisions, and verified outcomes.

Support explicit context handoffs when switching models.

Display which context will be shared before execution.

Keep secrets and unnecessary files out of shared context.

Build one simple RAG application using a small set of sample documents.

Exit criteria: Two configured models can work on the same project using a shared, inspectable context. The RAG app answers questions using retrieved document content.

Milestone C — Security Guardrails

Implement one security pipeline:

Input → Check → Retrieve → Scan retrieved content → Generate → Inspect output → Deliver or block

Required controls:

Prompt-injection detection using an existing scanner.

Deterministic restrictions for sensitive content and disallowed operations.

Document quarantine when ingestion violates configured policy.

Secret/credential detection before exposing outputs.

Security event logging with rule, source, outcome, and timestamp.

Explicit failure handling when a scanner is unavailable.

Use a controlled sample containing benign questions and known malicious document instructions.

Do not develop a new prompt-injection classifier.

Exit criteria: Normal questions succeed. A controlled malicious document or prohibited action is blocked by an actual enforced rule, and the user can inspect the reason.

Milestone D — Evaluations and CI/CD

Integrate Promptfoo with the reference RAG application.

Create a version-controlled suite of functional and security regression cases.

Run evaluations from the dashboard.

Persist results, failures, and the tested configuration.

Run the same deterministic checks in GitHub Actions.

Make failing required tests produce a failing CI check.

Show recent evaluation status and link to the corresponding GitHub run.

Allow developers to fix a rule or application change and rerun verification.

CI must work without paid model APIs. Use deterministic fixtures for required CI checks; live-model evaluations are separate integration tests and must be identified as such.

Exit criteria: A deliberately introduced security regression fails verification. Fixing it and rerunning produces passing results with evidence.

Milestone E — Final Integration

Complete browser end-to-end tests.

Verify restart recovery, disconnected models, invalid credentials, and scanner failures.

Verify the responsive layout on desktop and mobile.

Remove unused abstractions, debugging shortcuts, and dead code.

Produce a reproducible setup guide and architecture diagram.

Rehearse the complete demo using actual connected services.

5. UI Requirements

Build five simple views:

Workspace: Projects, active agent sessions, task execution, results.