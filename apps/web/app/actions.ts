'use server';
import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { createProjectSchema, isLocalMutation } from '@agentgate/controller';
import { projects } from '@/lib/controller';

export type CreateProjectState = { error: string | null };
export async function createProject(
  _previous: CreateProjectState,
  form: FormData,
): Promise<CreateProjectState> {
  const requestHeaders = await headers();
  if (
    !isLocalMutation(requestHeaders.get('origin'), requestHeaders.get('host'))
  ) {
    return {
      error: 'Project changes require a request from this local workspace.',
    };
  }
  const parsed = createProjectSchema.safeParse({ name: form.get('name') });
  if (!parsed.success)
    return {
      error: parsed.error.issues[0]?.message ?? 'Enter a valid project name.',
    };
  let id: string;
  try {
    id = projects().create(parsed.data).id;
  } catch {
    // Deliberately avoid logging database errors that could include private names/paths.
    return {
      error:
        'The project could not be saved. Check local storage access and try again.',
    };
  }
  revalidatePath('/');
  redirect(`/projects/${id}`);
}
