import Link from 'next/link';
import { notFound } from 'next/navigation';
import { projectIdSchema } from '@agentgate/controller';
import { cloud, ollama, projects, sessions } from '@/lib/controller';
import { StartSession } from '@/components/start-session';
import { Button } from '@/components/ui/button';
export const dynamic = 'force-dynamic';
export default async function ProjectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!projectIdSchema.safeParse(id).success) notFound();
  const project = projects().find(id);
  if (!project) notFound();
  const sessionList = sessions().listSessions(project.id);
  const installed = await ollama()
    .listInstalled()
    .then((models) => ({ models, error: null }))
    .catch((error: unknown) => ({
      models: null,
      error: error instanceof Error ? error.message : 'Ollama is unavailable.',
    }));
  const cloudStatus = await cloud().status();
  const groups = [
    ...(installed.models?.length
      ? [
          {
            label: 'Ollama (local)',
            provider: 'ollama',
            models: installed.models,
          },
        ]
      : []),
    ...cloudStatus
      .filter((entry) => entry.configured)
      .map((entry) => ({
        label: `${entry.provider} (cloud)`,
        provider: entry.provider,
        models: entry.models,
      })),
  ];
  return (
    <>
      <Link href="/" className="text-sm text-teal-800 hover:underline">
        ← All projects
      </Link>
      <p className="mb-4 mt-10 text-xs font-semibold uppercase tracking-widest text-teal-800">
        Project / Saved locally
      </p>
      <h1 className="break-words text-4xl font-semibold tracking-tight">
        {project.name}
      </h1>
      <section
        aria-labelledby="details-title"
        className="mt-10 rounded-xl border border-stone-300 bg-white p-6 sm:p-8"
      >
        <h2 id="details-title" className="text-xl font-semibold">
          Your project is ready to reopen.
        </h2>
        <p className="mt-3 max-w-xl text-sm leading-6 text-stone-600">
          This record is persisted in SQLite. Refresh the page or restart the
          application and return to the same project.
        </p>
        <dl className="mt-6 grid gap-6 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-stone-600">Project ID</dt>
            <dd className="mt-2 break-all font-mono text-xs">{project.id}</dd>
          </div>
          <div>
            <dt className="text-stone-600">Created (UTC)</dt>
            <dd className="mt-2">
              {project.createdAt.replace('T', ' ').replace('Z', '')}
            </dd>
          </div>
        </dl>
      </section>
      <section
        aria-labelledby="sessions-title"
        className="mt-6 rounded-xl border border-stone-300 bg-white p-6 sm:p-8"
      >
        <h2 id="sessions-title" className="text-xl font-semibold">
          Agent sessions
        </h2>
        {sessionList.length > 0 && (
          <ul className="mt-4 space-y-2">
            {sessionList.map((session) => (
              <li key={session.id}>
                <Link
                  href={`/projects/${project.id}/sessions/${session.id}`}
                  className="text-sm text-teal-800 hover:underline"
                >
                  {session.model.modelId} ·{' '}
                  {session.createdAt.slice(0, 16).replace('T', ' ')} UTC
                </Link>
              </li>
            ))}
          </ul>
        )}
        <div className="mt-6 space-y-4">
          {installed.error && (
            <p className="text-sm text-stone-700">
              {installed.error} Start it with <code>ollama serve</code> to use
              local models.
            </p>
          )}
          {groups.length > 0 ? (
            <StartSession projectId={project.id} groups={groups} />
          ) : (
            <p role="alert" className="text-sm text-red-800">
              No models are available. Pull an Ollama model or{' '}
              <Link href="/models" className="underline">
                connect a cloud provider
              </Link>
              .
            </p>
          )}
        </div>
      </section>
      <Button asChild variant="outline" className="mt-8">
        <Link href="/">Back to workspace</Link>
      </Button>
    </>
  );
}
