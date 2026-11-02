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
import { cloud, projects, runs, sessions } from '@/lib/controller';

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
  // Option values are `provider/modelId`; model ids may themselves contain slashes or colons.
  const choice = String(form.get('model') ?? '');
  const separator = choice.indexOf('/');
  const parsed = createSessionSchema.safeParse({
    projectId: form.get('projectId'),
    model: {
      provider: choice.slice(0, separator),
      modelId: choice.slice(separator + 1),
    },
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

export type ConnectState = { error: string | null; saved: boolean };
export async function connectProvider(
  _previous: ConnectState,
  form: FormData,
): Promise<ConnectState> {
  if (!(await isLocalRequest()))
    return {
      error: 'Requests must come from this local workspace.',
      saved: false,
    };
  try {
    await cloud().connect(form.get('provider'), form.get('apiKey'));
  } catch (error) {
    // Messages from connect() are validation text or fixed provider-failure text, never raw provider output.
    return {
      error:
        error instanceof Error
          ? firstLine(error.message)
          : 'The key could not be saved.',
      saved: false,
    };
  }
  revalidatePath('/models');
  return { error: null, saved: true };
}

export async function disconnectProvider(form: FormData): Promise<void> {
  if (!(await isLocalRequest())) return;
  await cloud().disconnect(form.get('provider'));
  revalidatePath('/models');
}

function firstLine(message: string): string {
  try {
    const issues: unknown = JSON.parse(message);
    if (Array.isArray(issues) && issues[0]?.message)
      return String(issues[0].message);
  } catch {
    // Not a validation error list: it is already plain text.
  }
  return message.slice(0, 200);
}
