import type { CloudCatalog } from './cloud';
import type { AgentModels, OllamaCatalog, OpenedModel } from './ollama';
import type { ModelRef } from './sessions';

/** Routes a model reference to the catalog that owns its provider. */
export class ModelRouter implements AgentModels {
  constructor(
    private readonly ollama: OllamaCatalog,
    private readonly cloud: CloudCatalog,
  ) {}

  open(ref: ModelRef): Promise<OpenedModel> {
    return ref.provider === 'ollama'
      ? this.ollama.open(ref)
      : this.cloud.open(ref);
  }
}
