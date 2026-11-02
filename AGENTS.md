Mandatory Software Engineering Rules

Architecture

Follow SOLID where it improves dependency boundaries.

Apply KISS, DRY, and YAGNI consistently.

Separate UI, application services, domain rules, and infrastructure adapters.

Prefer composition over inheritance.

Validate external inputs and outputs with schemas.

Use typed contracts between services.

Keep background operations separate from HTTP request lifecycles.

Do not create microservices merely to satisfy an architecture diagram.

Security

Store provider credentials through a protected local secret mechanism; prefer the OS credential store.

Never return saved API keys to the frontend.

Never log credentials, full private transcripts, or confidential retrieved content.

Restrict agent tools to approved project directories and capabilities.

Require explicit approval before enabling destructive operations.

Protected actions must fail closed when authorization cannot be determined.

Never describe scanner results as guaranteed protection from all attacks.

Treat retrieved documents as untrusted data, not instructions.

Code Quality

No any types without documented justification.

No duplicated business logic.

No hardcoded API keys, provider credentials, or environment-specific paths.

No swallowed exceptions.

No arbitrary retry loops without limits.

No unbounded background jobs.

No unfinished TODOs in required MVP paths.

No speculative abstractions built for possible future features.


Rules:

Fix correctness, security, and data-integrity issues immediately.

Do not defer failing tests or broken integration contracts.

Temporary workarounds must be isolated and documented.

Remove obsolete implementations when replacing them.

Avoid keeping two competing solutions for one responsibility.

Review outstanding debt before declaring a milestone complete.