import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import {
  createModels,
  fauxAssistantMessage,
  fauxProvider,
} from '@earendil-works/pi-ai';
import { afterEach, describe, expect, it } from 'vitest';
import {
  OllamaCatalog,
  ProjectService,
  RunService,
  SessionService,
  SqliteProjects,
  SqliteSessions,
  openDatabase,
  type AgentModels,
} from './index';

const directories: string[] = [];
const closers: (() => void)[] = [];
afterEach(() => {
  for (const close of closers.splice(0)) close();
  for (const directory of directories.splice(0))
    rmSync(directory, { recursive: true, force: true });
});

function open(filename: string) {
  const db = openDatabase(filename);
  closers.push(() => {
    if (db.open) db.close();
  });
  const projectRepository = new SqliteProjects(db);
  const repository = new SqliteSessions(db);
  return {
    db,
    repository,
    projects: new ProjectService(projectRepository),
    sessions: new SessionService(repository, projectRepository),
  };
}
function setup() {
  const directory = mkdtempSync(join(tmpdir(), 'agentgate-'));
  directories.push(directory);
  const filename = join(directory, 'agentgate.sqlite');
  return { filename, ...open(filename) };
}

/** Pi's own faux provider scripts deterministic model output through the real agent loop. */
function fauxModels() {
  const faux = fauxProvider();
  const registry = createModels();
  registry.setProvider(faux.provider);
  const models: AgentModels = {
    open: async () => ({
      model: faux.getModel(),
      streamFn: (target, context, options) =>
        registry.streamSimple(target, context, options),
      getApiKey: () => 'unused',
      describeError: (raw) => raw,
    }),
  };
  return { faux, models };
}
const model = { provider: 'ollama', modelId: 'faux' } as const;

describe('sessions and runs', () => {
  it('rejects sessions for unknown projects and invalid input', () => {
    const { sessions } = setup();
    expect(() =>
      sessions.createSession({ projectId: randomUUID(), model }),
    ).toThrow('Unknown project');
    expect(() => sessions.createSession({ projectId: 'x', model })).toThrow();
    expect(() =>
      sessions.createSession({
        projectId: randomUUID(),
        model: { provider: 'other', modelId: 'm' },
      }),
    ).toThrow();
  });

  it('streams events, persists the transcript, and reopens it after restart', async () => {
    const { filename, db, projects, sessions, repository } = setup();
    const { faux, models } = fauxModels();
    faux.setResponses([fauxAssistantMessage('Hello from the model.')]);
    const project = projects.create({ name: 'P' });
    const session = sessions.createSession({ projectId: project.id, model });
    const runner = new RunService(repository, models);
    const run = runner.enqueue({ sessionId: session.id, prompt: ' Hi ' });
    expect(run.prompt).toBe('Hi');
    await runner.idle();

    expect(sessions.findRun(run.id)?.status).toBe('completed');
    const events = sessions.eventsAfter(run.id, 0);
    expect(events[0]?.type).toBe('started');
    expect(events.at(-1)?.type).toBe('completed');
    expect(
      events
        .filter((event) => event.type === 'text_delta')
        .map((event) => event.text)
        .join(''),
    ).toBe('Hello from the model.');
    expect(sessions.eventsAfter(run.id, events.length)).toEqual([]);

    db.close();
    const reopened = open(filename);
    const transcript = reopened.sessions.transcript(session.id);
    expect(transcript.map((message) => message.role)).toEqual([
      'user',
      'assistant',
    ]);
    expect(reopened.sessions.listSessions(project.id)).toEqual([session]);
  });

  it('replays stored history into the next turn', async () => {
    const { projects, sessions, repository } = setup();
    const { faux, models } = fauxModels();
    let seenRoles: string[] = [];
    faux.setResponses([
      fauxAssistantMessage('First.'),
      (context) => {
        seenRoles = context.messages.map((message) => message.role);
        return fauxAssistantMessage('Second.');
      },
    ]);
    const session = sessions.createSession({
      projectId: projects.create({ name: 'P' }).id,
      model,
    });
    const runner = new RunService(repository, models);
    runner.enqueue({ sessionId: session.id, prompt: 'one' });
    await runner.idle();
    runner.enqueue({ sessionId: session.id, prompt: 'two' });
    await runner.idle();
    expect(seenRoles).toEqual(['system', 'user', 'assistant', 'user']);
    expect(sessions.transcript(session.id)).toHaveLength(4);
  });

  it('allows one active run per session and rejects empty prompts', () => {
    const { projects, sessions, repository } = setup();
    const { models } = fauxModels();
    const session = sessions.createSession({
      projectId: projects.create({ name: 'P' }).id,
      model,
    });
    const runner = new RunService(repository, models);
    expect(() =>
      runner.enqueue({ sessionId: session.id, prompt: '   ' }),
    ).toThrow();
    repository.createRun(session.id, 'queued');
    expect(() =>
      runner.enqueue({ sessionId: session.id, prompt: 'again' }),
    ).toThrow('active run');
    expect(() =>
      runner.enqueue({ sessionId: randomUUID(), prompt: 'x' }),
    ).toThrow('Unknown session');
  });

  it('records model failures without adding them to the transcript', async () => {
    const { projects, sessions, repository } = setup();
    const { faux, models } = fauxModels();
    faux.setResponses([
      fauxAssistantMessage('', {
        stopReason: 'error',
        errorMessage: 'upstream down',
      }),
    ]);
    const session = sessions.createSession({
      projectId: projects.create({ name: 'P' }).id,
      model,
    });
    const runner = new RunService(repository, models);
    const run = runner.enqueue({ sessionId: session.id, prompt: 'hi' });
    await runner.idle();
    expect(sessions.findRun(run.id)).toMatchObject({
      status: 'failed',
      error: 'upstream down',
    });
    expect(sessions.transcript(session.id)).toEqual([]);
    expect(sessions.eventsAfter(run.id, 0).at(-1)?.type).toBe('failed');
  });

  it('fails the run when the model cannot be opened', async () => {
    const { projects, sessions, repository } = setup();
    const models: AgentModels = {
      open: async () => {
        throw new Error('Ollama is not reachable.');
      },
    };
    const session = sessions.createSession({
      projectId: projects.create({ name: 'P' }).id,
      model,
    });
    const runner = new RunService(repository, models);
    const run = runner.enqueue({ sessionId: session.id, prompt: 'hi' });
    await runner.idle();
    expect(sessions.findRun(run.id)).toMatchObject({
      status: 'failed',
      error: 'Ollama is not reachable.',
    });
  });

  it('times out a stalled run and cancels queued or running work', async () => {
    const { projects, sessions, repository } = setup();
    const { faux, models } = fauxModels();
    const never = () => new Promise<never>(() => undefined);
    faux.setResponses([never, never]);
    const session = sessions.createSession({
      projectId: projects.create({ name: 'P' }).id,
      model,
    });
    const timed = new RunService(repository, models, 50);
    const run = timed.enqueue({ sessionId: session.id, prompt: 'hang' });
    await timed.idle();
    expect(sessions.findRun(run.id)).toMatchObject({
      status: 'failed',
      error: 'The run timed out.',
    });

    const runner = new RunService(repository, models, 5000);
    const second = runner.enqueue({ sessionId: session.id, prompt: 'hang' });
    await new Promise((resolve) => setTimeout(resolve, 50));
    runner.cancel(second.id);
    await runner.idle();
    expect(sessions.findRun(second.id)?.status).toBe('cancelled');

    const queued = repository.createRun(session.id, 'later');
    runner.cancel(queued.id);
    expect(sessions.findRun(queued.id)?.status).toBe('cancelled');
  });

  it('marks runs interrupted by a restart as failed and resumes queued runs', async () => {
    const { filename, db, projects, sessions, repository } = setup();
    const session = sessions.createSession({
      projectId: projects.create({ name: 'P' }).id,
      model,
    });
    const interrupted = repository.createRun(session.id, 'left running');
    repository.claimNextQueued();
    db.close();

    const reopened = open(filename);
    const { faux, models } = fauxModels();
    faux.setResponses([fauxAssistantMessage('Recovered.')]);
    const runner = new RunService(reopened.repository, models);
    runner.start();
    await runner.idle();
    expect(reopened.sessions.findRun(interrupted.id)).toMatchObject({
      status: 'failed',
      error: 'Interrupted by an application restart.',
    });
    const next = reopened.repository.createRun(session.id, 'after restart');
    runner.start();
    await runner.idle();
    expect(reopened.sessions.findRun(next.id)?.status).toBe('completed');
  });

  it('rejects corrupt stored transcripts instead of replaying them', () => {
    const { db, projects, sessions } = setup();
    const session = sessions.createSession({
      projectId: projects.create({ name: 'P' }).id,
      model,
    });
    db.prepare('INSERT INTO messages VALUES (?, 1, ?)').run(
      session.id,
      '{"role":"system"}',
    );
    expect(() => sessions.transcript(session.id)).toThrow();
  });
});

const ollamaUrl = process.env.AGENTGATE_OLLAMA_URL;
const liveModel = process.env.AGENTGATE_OLLAMA_MODEL;
describe.runIf(ollamaUrl && liveModel)('live Ollama (integration)', () => {
  it('lists installed models and runs a real task through Pi', async () => {
    const catalog = new OllamaCatalog(ollamaUrl);
    expect(await catalog.listInstalled()).toContain(liveModel);
    const { projects, sessions, repository } = setup();
    const session = sessions.createSession({
      projectId: projects.create({ name: 'Live' }).id,
      model: { provider: 'ollama', modelId: liveModel as string },
    });
    const runner = new RunService(repository, catalog);
    const run = runner.enqueue({
      sessionId: session.id,
      prompt: 'Reply with one short sentence.',
    });
    await runner.idle();
    expect(sessions.findRun(run.id)?.status).toBe('completed');
    expect(
      sessions.eventsAfter(run.id, 0).filter((e) => e.type === 'text_delta')
        .length,
    ).toBeGreaterThan(0);
    await expect(
      catalog.open({ provider: 'ollama', modelId: 'not-installed:1b' }),
    ).rejects.toThrow('not installed');
  }, 120_000);
});
