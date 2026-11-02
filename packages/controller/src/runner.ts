import { Agent, type AgentMessage } from '@earendil-works/pi-agent-core';
import type { AgentModels } from './ollama';
import {
  sendPromptSchema,
  storedMessageSchema,
  type Run,
  type SessionRepository,
} from './sessions';

export const DEFAULT_RUN_TIMEOUT_MS = 120_000;
const SYSTEM_PROMPT =
  'You are a helpful assistant inside AGENTGATE Studio. Answer concisely.';
const MAX_ERROR_LENGTH = 300;

type StopReason = 'cancelled' | 'timeout';
type Active = { runId: string; stop: (reason: StopReason) => void };

/**
 * Executes queued runs one at a time, independent of any HTTP request.
 * Pi agents run without tools: no filesystem or shell capability is granted.
 */
export class RunService {
  private active: Active | null = null;
  private draining: Promise<void> | null = null;

  constructor(
    private readonly repository: SessionRepository,
    private readonly models: AgentModels,
    private readonly timeoutMs: number = DEFAULT_RUN_TIMEOUT_MS,
  ) {}

  /** Recover from a previous process, then continue any queued work. */
  start(): void {
    this.repository.failInterrupted();
    this.kick();
  }

  enqueue(input: unknown): Run {
    const { sessionId, prompt } = sendPromptSchema.parse(input);
    if (!this.repository.findSession(sessionId))
      throw new Error('Unknown session.');
    const run = this.repository.createRun(sessionId, prompt);
    this.kick();
    return run;
  }

  cancel(runId: string): void {
    if (this.active?.runId === runId) {
      this.active.stop('cancelled');
      return;
    }
    const run = this.repository.findRun(runId);
    if (run?.status === 'queued') {
      this.repository.appendEvent(
        runId,
        'cancelled',
        'Cancelled before it started.',
      );
      this.repository.finishRun(runId, 'cancelled', null);
    }
  }

  /** Resolves when the queue is empty. Used by tests and graceful shutdown. */
  async idle(): Promise<void> {
    while (this.draining) await this.draining;
  }

  private kick(): void {
    if (this.draining) return;
    this.draining = this.drain().finally(() => {
      this.draining = null;
    });
  }

  private async drain(): Promise<void> {
    for (let run = this.repository.claimNextQueued(); run;) {
      await this.execute(run);
      run = this.repository.claimNextQueued();
    }
  }

  private async execute(run: Run): Promise<void> {
    const fail = (message: string) => {
      this.repository.appendEvent(run.id, 'failed', message);
      this.repository.finishRun(run.id, 'failed', message);
    };
    const cancelled = () => {
      this.repository.appendEvent(run.id, 'cancelled', 'Cancelled.');
      this.repository.finishRun(run.id, 'cancelled', null);
    };
    try {
      const session = this.repository.findSession(run.sessionId);
      if (!session) return fail('The session no longer exists.');
      const history = this.repository.messages(session.id);
      const opened = await this.models.open(session.model);
      const agent = new Agent({
        initialState: {
          model: opened.model,
          systemPrompt: SYSTEM_PROMPT,
          tools: [],
          messages: history as AgentMessage[],
        },
        streamFn: opened.streamFn,
        getApiKey: opened.getApiKey,
      });
      this.repository.appendEvent(run.id, 'started', session.model.modelId);
      const unsubscribe = agent.subscribe((event) => {
        if (
          event.type === 'message_update' &&
          event.assistantMessageEvent.type === 'text_delta'
        ) {
          this.repository.appendEvent(
            run.id,
            'text_delta',
            event.assistantMessageEvent.delta,
          );
        }
      });
      // A hard stop: even a provider that ignores abort cannot hold the queue.
      let stopped: StopReason | null = null;
      let timer: NodeJS.Timeout | undefined;
      const stop = new Promise<void>((resolve) => {
        const request = (reason: StopReason) => {
          stopped ??= reason;
          agent.abort();
          resolve();
        };
        this.active = { runId: run.id, stop: request };
        timer = setTimeout(() => request('timeout'), this.timeoutMs);
      });
      try {
        await Promise.race([agent.prompt(run.prompt), stop]);
      } finally {
        clearTimeout(timer);
        unsubscribe();
        this.active = null;
      }
      if (stopped === 'timeout') return fail('The run timed out.');
      if (stopped === 'cancelled') return cancelled();
      const turn = agent.state.messages
        .filter((message) => message.role !== 'system')
        .slice(history.length);
      const last = turn.at(-1);
      if (last?.role !== 'assistant')
        return fail('The model returned no answer.');
      if (last.stopReason === 'aborted') return cancelled();
      if (last.stopReason === 'error')
        return fail(
          opened.describeError(
            last.errorMessage ?? 'The model request failed.',
          ),
        );
      this.repository.appendEvent(run.id, 'completed', '');
      this.repository.completeRun(
        run,
        turn.map((message) => storedMessageSchema.parse(message)),
      );
    } catch (error) {
      // Log only the error class: messages may contain private prompt content.
      console.error(
        `Run ${run.id} failed:`,
        error instanceof Error ? error.name : 'unknown',
      );
      fail(
        error instanceof Error
          ? error.message.slice(0, MAX_ERROR_LENGTH)
          : 'The run failed.',
      );
    }
  }
}
