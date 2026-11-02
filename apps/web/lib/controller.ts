import 'server-only';
import { homedir } from 'node:os';
import { join, resolve } from 'node:path';
import { ProjectService, SqliteProjects } from '@agentgate/controller';

const globalController = globalThis as typeof globalThis & {
  projectService?: ProjectService;
};
export function projects(): ProjectService {
  if (!globalController.projectService) {
    const dataDir = process.env.AGENTGATE_DATA_DIR;
    if (dataDir !== undefined && !dataDir.trim())
      throw new Error('AGENTGATE_DATA_DIR must not be empty.');
    const directory = dataDir
      ? resolve(dataDir)
      : join(homedir(), '.agentgate');
    globalController.projectService = new ProjectService(
      new SqliteProjects(join(directory, 'agentgate.sqlite')),
    );
  }
  return globalController.projectService;
}
