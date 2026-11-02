import Link from 'next/link';
import { notFound } from 'next/navigation';
import { projectIdSchema, sessionIdSchema } from '@agentgate/controller';
import { projects, sessions } from '@/lib/controller';
import { SessionChat } from '@/components/session-chat';
export const dynamic = 'force-dynamic';
export default async function SessionPage({
  params,
}: {
  params: Promise<{ id: string; sessionId: string }>;
}) {
  const { id, sessionId } = await params;
  if (
    !projectIdSchema.safeParse(id).success ||
    !sessionIdSchema.safeParse(sessionId).success
  )
    notFound();
  const project = projects().find(id);
  const session = sessions().findSession(sessionId);
  if (!project || !session || session.projectId !== project.id) notFound();
  const runs = sessions().listRuns(session.id);
  const active = runs.find(
    (run) => run.status === 'queued' || run.status === 'running',
  );
  const completed = runs.filter((run) => run.status === 'completed');
  const lastFailure =
    runs.at(-1)?.status === 'failed' ? runs.at(-1) : undefined;
  return (
    <>
      <Link
        href={`/projects/${project.id}`}
        className="text-sm text-teal-800 hover:underline"
      >
        ← {project.name}
      </Link>
      <p className="mb-4 mt-10 text-xs font-semibold uppercase tracking-widest text-teal-800">
        Session / {session.model.provider} · {session.model.modelId}
      </p>
      <h1 className="mb-8 text-3xl font-semibold tracking-tight">
        Agent session
      </h1>
      {lastFailure?.error && (
        <p role="alert" className="mb-6 text-sm text-red-800">
          Last run failed: {lastFailure.error}
        </p>
      )}
      <SessionChat
        projectId={project.id}
        sources={completed.map((run) => sessions().sources(run.id))}
        sessionId={session.id}
        turns={sessions().view(session.id)}
        activeRunId={active?.id ?? null}
        activePrompt={active?.prompt ?? null}
      />
    </>
  );
}
