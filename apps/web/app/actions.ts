'use server';
import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { revalidatePath } from 'next/cache';
import {
  createProjectSchema,
  createSessionSchema,
  isLocalMutation,
  runIdSchema,
  sendPromptSchema,
} from '@agentgate/controller';
import { projects, runs, sessions } from '@/lib/controller';

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

async function isLocalRequest(): Promise<boolean> {
  const requestHeaders = await headers();
  return isLocalMutation(
    requestHeaders.get('origin'),
    requestHeaders.get('host'),
  );
}

export type StartSessionState = { error: string | null };
export async function startSession(
  _previous: StartSessionState,
  form: FormData,
): Promise<StartSessionState> {
  if (!(await isLocalRequest()))
    return { error: 'Requests must come from this local workspace.' };
  const parsed = createSessionSchema.safeParse({
    projectId: form.get('projectId'),
    model: { provider: 'ollama', modelId: form.get('modelId') },
  });
  if (!parsed.success) return { error: 'Choose an installed model.' };
  let id: string;
  try {
    id = sessions().createSession(parsed.data).id;
  } catch {
    return { error: 'The session could not be created.' };
  }
  redirect(`/projects/${parsed.data.projectId}/sessions/${id}`);
}

export type SendPromptResult =
  { runId: string; error: null } | { runId: null; error: string };
export async function sendPrompt(
  sessionId: string,
  prompt: string,
): Promise<SendPromptResult> {
  if (!(await isLocalRequest()))
    return {
      runId: null,
      error: 'Requests must come from this local workspace.',
    };
  const parsed = sendPromptSchema.safeParse({ sessionId, prompt });
  if (!parsed.success)
    return {
      runId: null,
      error: parsed.error.issues[0]?.message ?? 'Enter a valid task.',
    };
  try {
    return { runId: runs().enqueue(parsed.data).id, error: null };
  } catch (error) {
    return {
      runId: null,
      error:
        error instanceof Error && error.message.includes('active run')
          ? error.message
          : 'The task could not be started.',
    };
  }
}

export async function cancelRun(runId: string): Promise<void> {
  if (!(await isLocalRequest())) return;
  const parsed = runIdSchema.safeParse(runId);
  if (parsed.success) runs().cancel(parsed.data);
}
