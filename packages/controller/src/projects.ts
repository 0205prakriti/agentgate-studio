import { z } from 'zod';

export const projectNameSchema = z
  .string()
  .trim()
  .min(1, 'Enter a project name.')
  .max(80, 'Use at most 80 characters.')
  .regex(/^[^\p{Cc}\p{Cf}]+$/u, 'Use a name without control characters.');
export const createProjectSchema = z
  .object({ name: projectNameSchema })
  .strict();
export const projectIdSchema = z.uuid();
export const projectSchema = z
  .object({
    id: projectIdSchema,
    name: projectNameSchema,
    createdAt: z.iso.datetime(),
  })
  .strict();
export type Project = z.infer<typeof projectSchema>;

export interface ProjectRepository {
  create(name: string): Project;
  list(): Project[];
  find(id: string): Project | null;
}

export class ProjectService {
  constructor(private readonly repository: ProjectRepository) {}

  create(input: unknown): Project {
    const { name } = createProjectSchema.parse(input);
    return projectSchema.parse(this.repository.create(name));
  }

  list(): Project[] {
    return z.array(projectSchema).parse(this.repository.list());
  }

  find(id: unknown): Project | null {
    return projectSchema
      .nullable()
      .parse(this.repository.find(projectIdSchema.parse(id)));
  }
}
