import {
  createModels,
  createProvider,
  type Api,
  type Model,
} from '@earendil-works/pi-ai';
import { openAICompletionsApi } from '@earendil-works/pi-ai/api/openai-completions.lazy';
import type { StreamFn } from '@earendil-works/pi-agent-core';
import { z } from 'zod';
import type { ModelRef } from './sessions';

export const DEFAULT_OLLAMA_URL = 'http://127.0.0.1:11434';
const LIST_TIMEOUT_MS = 3000;
const tagsSchema = z.object({
  models: z.array(
    z
      .object({ name: z.string().min(1), size: z.number().nonnegative() })
      .loose(),
  ),
});

export interface OpenedModel {
  model: Model<Api>;
  streamFn: StreamFn;
  getApiKey: (provider: string) => string | undefined;
  /** Turns a raw provider failure into text that is safe to store and show. */
  describeError: (raw: string) => string;
}
export interface AgentModels {
  open(ref: ModelRef): Promise<OpenedModel>;
}

/** Local inference through Ollama; models are verified against what is actually installed. */
export class OllamaCatalog implements AgentModels {
  private readonly baseUrl: string;

  constructor(baseUrl: string = DEFAULT_OLLAMA_URL) {
    const url = new URL(baseUrl);
    if (url.protocol !== 'http:' && url.protocol !== 'https:')
      throw new Error('The Ollama URL must use http or https.');
    this.baseUrl = url.origin;
  }

  /** Installed models with their size on disk. */
  async listDetailed(): Promise<{ name: string; sizeBytes: number }[]> {
    let response: Response;
    try {
      response = await fetch(`${this.baseUrl}/api/tags`, {
        signal: AbortSignal.timeout(LIST_TIMEOUT_MS),
      });
    } catch {
      throw new Error(`Ollama is not reachable at ${this.baseUrl}.`);
    }
    if (!response.ok)
      throw new Error(`Ollama returned HTTP ${response.status}.`);
    const parsed = tagsSchema.safeParse(await response.json());
    if (!parsed.success)
      throw new Error('Ollama returned an unexpected model list.');
    return parsed.data.models
      .map((model) => ({ name: model.name, sizeBytes: model.size }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  async listInstalled(): Promise<string[]> {
    return (await this.listDetailed()).map((model) => model.name);
  }

  async open(ref: ModelRef): Promise<OpenedModel> {
    if (ref.provider !== 'ollama')
      throw new Error(`Provider ${ref.provider} is not served by Ollama.`);
    const installed = await this.listInstalled();
    if (!installed.includes(ref.modelId))
      throw new Error(`Model ${ref.modelId} is not installed in Ollama.`);
    const models: Model<'openai-completions'>[] = installed.map((id) => ({
      id,
      name: id,
      api: 'openai-completions',
      provider: 'ollama',
      baseUrl: `${this.baseUrl}/v1`,
      reasoning: false,
      input: ['text'],
      cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
      contextWindow: 32768,
      maxTokens: 2048,
      // Ollama's OpenAI-compatible endpoint has no `developer` role or reasoning effort.
      compat: { supportsDeveloperRole: false, supportsReasoningEffort: false },
    }));
    const registry = createModels();
    registry.setProvider(
      createProvider({
        id: 'ollama',
        name: 'Ollama',
        baseUrl: `${this.baseUrl}/v1`,
        auth: {
          apiKey: { name: 'Ollama', resolve: async () => ({ auth: {} }) },
        },
        models,
        api: openAICompletionsApi(),
      }),
    );
    const model = registry.getModel('ollama', ref.modelId);
    if (!model) throw new Error(`Model ${ref.modelId} could not be loaded.`);
    return {
      model,
      streamFn: (target, context, options) =>
        registry.streamSimple(target, context, options),
      // Ollama is keyless; Pi requires a non-empty value for the request.
      getApiKey: () => 'ollama',
      describeError: (raw) => raw.slice(0, 300),
    };
  }
}
