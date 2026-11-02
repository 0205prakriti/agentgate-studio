import 'server-only';
import { homedir } from 'node:os';
import { join, resolve } from 'node:path';
import {
  CloudCatalog,
  EvalService,
  SqliteEvals,
  ContextService,
  DocumentService,
  SqliteContext,
  SqliteDocuments,
  KeychainBackend,
  ModelRouter,
  LlmGuardScanner,
  OllamaCatalog,
  ProtectionPipeline,
  SqliteSecurityEvents,
  ProjectService,
  RunService,
  SecretCredentialStore,
  CLOUD_PROVIDERS,
  SessionService,
  SqliteProjects,
  SqliteSessions,
  openDatabase,
} from '@agentgate/controller';

type Controller = {
  projects: ProjectService;
  sessions: SessionService;
  runs: RunService;
  ollama: OllamaCatalog;
  cloud: CloudCatalog;
  context: ContextService;
  documents: DocumentService;
  security: SqliteSecurityEvents;
  evals: EvalService;
  repoRoot: string;
};
const globalController = globalThis as typeof globalThis & {
  controller?: Controller;
};

/** One controller per process, retained through development reloads. */
function controller(): Controller {
  if (!globalController.controller) {
    const dataDir = process.env.AGENTGATE_DATA_DIR;
    if (dataDir !== undefined && !dataDir.trim())
      throw new Error('AGENTGATE_DATA_DIR must not be empty.');
    const directory = dataDir
      ? resolve(dataDir)
      : join(homedir(), '.agentgate');
    const db = openDatabase(join(directory, 'agentgate.sqlite'));
    const projectRepository = new SqliteProjects(db);
    const sessionRepository = new SqliteSessions(db);
    const ollama = new OllamaCatalog(process.env.AGENTGATE_OLLAMA_URL);
    const cloud = new CloudCatalog(
      new SecretCredentialStore(new KeychainBackend(), CLOUD_PROVIDERS),
    );
    // Reference documents are read only from this folder.
    const docsRoot = process.env.AGENTGATE_DOCS_ROOT;
    const projectService = new ProjectService(projectRepository);
    const context = new ContextService(
      new SqliteContext(db),
      projectRepository,
    );
    const documentRepository = new SqliteDocuments(db);
    const security = new SqliteSecurityEvents(db);
    // The scanner runs as a separate local service; if it is down, protected stages fail closed.
    const guard = new ProtectionPipeline(
      new LlmGuardScanner(process.env.AGENTGATE_SCANNER_URL),
      security,
      (projectId, documentId) =>
        documentRepository.quarantine(projectId, documentId),
    );
    const documents = new DocumentService(
      documentRepository,
      projectRepository,
      docsRoot ? resolve(docsRoot) : null,
      (document, chunks) => guard.screenDocument(document, chunks),
    );
    // The evaluation suite is version-controlled in the repository, not in the data directory.
    const repoRoot = resolve(
      process.env.AGENTGATE_REPO_ROOT ?? join(process.cwd(), '..', '..'),
    );
    const evals = new EvalService(new SqliteEvals(db), repoRoot);
    evals.start();
    const runs = new RunService(
      sessionRepository,
      new ModelRouter(ollama, cloud),
      {
        guard,
        knowledge: {
          context: (projectId) => context.render(projectId),
          retrieve: (projectId, query) => documents.retrieve(projectId, query),
        },
      },
    );
    runs.start();
    globalController.controller = {
      projects: projectService,
      sessions: new SessionService(sessionRepository, projectRepository),
      runs,
      ollama,
      cloud,
      context,
      documents,
      security,
      evals,
      repoRoot,
    };
  }
  return globalController.controller;
}
export const projects = () => controller().projects;
export const sessions = () => controller().sessions;
export const runs = () => controller().runs;
export const ollama = () => controller().ollama;
export const cloud = () => controller().cloud;
export const context = () => controller().context;
export const documents = () => controller().documents;
export const security = () => controller().security;
export const evals = () => controller().evals;
export const repoRoot = () => controller().repoRoot;
