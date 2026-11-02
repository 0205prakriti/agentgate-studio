import { randomUUID } from 'node:crypto';
import type Database from 'better-sqlite3';
import { z } from 'zod';
import { detectSecrets } from './policy';
import { projectIdSchema, type ProjectRepository } from './projects';

export const contextKindSchema = z.enum(['goal', 'decision', 'outcome']);
export type ContextKind = z.infer<typeof contextKindSchema>;
export const contextTextSchema = z
  .string()
  .trim()
  .min(1, 'Enter some text.')
  .max(500, 'Use at most 500 characters.');
export const addContextSchema = z
  .object({
    projectId: projectIdSchema,
    kind: contextKindSchema,
    text: contextTextSchema,
  })
  .strict();
export const contextItemSchema = z
  .object({
    id: z.uuid(),
    projectId: projectIdSchema,
    kind: contextKindSchema,
    text: contextTextSchema,
    createdAt: z.iso.datetime(),
  })
  .strict();
export type ContextItem = z.infer<typeof contextItemSchema>;

export const MAX_ITEMS_PER_KIND = 50;
const HEADINGS: Record<ContextKind, string> = {
  goal: 'Goals',
  decision: 'Approved decisions',
  outcome: 'Verified outcomes',
};

export interface ContextRepository {
  add(item: ContextItem): void;
  list(projectId: string): ContextItem[];
  remove(projectId: string, id: string): void;
}

export class SqliteContext implements ContextRepository {
  constructor(private readonly db: Database.Database) {}
  add(item: ContextItem): void {
    this.db
      .prepare(
        'INSERT INTO context_items (id, project_id, kind, text, created_at) VALUES (?, ?, ?, ?, ?)',
      )
      .run(item.id, item.projectId, item.kind, item.text, item.createdAt);
  }
  list(projectId: string): ContextItem[] {
    return z
      .array(contextItemSchema)
      .parse(
        this.db
          .prepare(
            'SELECT id, project_id AS projectId, kind, text, created_at AS createdAt FROM context_items WHERE project_id = ? ORDER BY created_at, id',
          )
          .all(projectId),
      );
  }
  remove(projectId: string, id: string): void {
    this.db
      .prepare('DELETE FROM context_items WHERE project_id = ? AND id = ?')
      .run(projectId, id);
  }
}

/** One structured record per project: goals, approved decisions, verified outcomes. */
export class ContextService {
  constructor(
    private readonly repository: ContextRepository,
    private readonly projects: ProjectRepository,
  ) {}

  add(input: unknown): ContextItem {
    const { projectId, kind, text } = addContextSchema.parse(input);
    if (!this.projects.find(projectId)) throw new Error('Unknown project.');
    if (detectSecrets(text).length > 0)
      throw new Error(
        'This text looks like a credential and cannot be shared with models.',
      );
    const items = this.repository.list(projectId);
    if (items.filter((item) => item.kind === kind).length >= MAX_ITEMS_PER_KIND)
      throw new Error(
        `A project can hold at most ${MAX_ITEMS_PER_KIND} ${HEADINGS[kind].toLowerCase()}.`,
      );
    const item = contextItemSchema.parse({
      id: randomUUID(),
      projectId,
      kind,
      text,
      createdAt: new Date().toISOString(),
    });
    this.repository.add(item);
    return item;
  }

  list(projectId: unknown): ContextItem[] {
    return this.repository.list(projectIdSchema.parse(projectId));
  }

  remove(projectId: unknown, id: unknown): void {
    this.repository.remove(
      projectIdSchema.parse(projectId),
      z.uuid().parse(id),
    );
  }

  /** The exact text every model in the project receives. Empty when nothing is recorded. */
  render(projectId: unknown): string {
    const items = this.list(projectId);
    const sections = contextKindSchema.options.flatMap((kind) => {
      const lines = items
        .filter((item) => item.kind === kind)
        .map((item) => `- ${item.text}`);
      return lines.length > 0
        ? [`${HEADINGS[kind]}:\n${lines.join('\n')}`]
        : [];
    });
    return sections.length > 0
      ? `Project context approved by the user:\n\n${sections.join('\n\n')}`
      : '';
  }
}
