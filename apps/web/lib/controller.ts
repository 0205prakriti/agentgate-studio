import 'server-only';
import { homedir } from 'node:os';
import { join, resolve } from 'node:path';
import {
  CloudCatalog,
  KeychainBackend,
  ModelRouter,
  OllamaCatalog,
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
    const runs = new RunService(
      sessionRepository,
      new ModelRouter(ollama, cloud),
    );
    runs.start();
    globalController.controller = {
      projects: new ProjectService(projectRepository),
      sessions: new SessionService(sessionRepository, projectRepository),
      runs,
      ollama,
      cloud,
    };
  }
  return globalController.controller;
}
export const projects = () => controller().projects;
export const sessions = () => controller().sessions;
export const runs = () => controller().runs;
export const ollama = () => controller().ollama;
export const cloud = () => controller().cloud;
