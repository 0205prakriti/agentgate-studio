import Link from 'next/link';
import { notFound } from 'next/navigation';
import { projectIdSchema } from '@agentgate/controller';
import {
  cloud,
  context,
  documents,
  ollama,
  projects,
  sessions,
} from '@/lib/controller';
import { removeContext, removeReference } from '@/app/actions';
import { AddContext, AddReference } from '@/components/knowledge-forms';
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
  const contextItems = context().list(project.id);
  const preview = context().render(project.id);
  const references = documents().list(project.id);
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
      <section
        aria-labelledby="context-title"
        className="mt-6 rounded-xl border border-stone-300 bg-white p-6 sm:p-8"
      >
        <h2 id="context-title" className="text-xl font-semibold">
          Shared context
        </h2>
        <p className="mt-2 text-sm leading-6 text-stone-600">
          Every model in this project receives exactly the text below with each
          task, so you can switch models without losing it. Credentials are
          rejected.
        </p>
        <pre
          aria-label="Context shared with models"
          className="mt-4 whitespace-pre-wrap break-words rounded-md bg-stone-100 p-4 text-sm"
        >
          {preview || 'Nothing is shared yet.'}
        </pre>
        {contextItems.length > 0 && (
          <ul className="mt-4 space-y-2 text-sm">
            {contextItems.map((item) => (
              <li
                key={item.id}
                className="flex items-start justify-between gap-3"
              >
                <span className="break-words">
                  <span className="font-medium capitalize">{item.kind}</span>:{' '}
                  {item.text}
                </span>
                <form action={removeContext}>
                  <input type="hidden" name="projectId" value={project.id} />
                  <input type="hidden" name="id" value={item.id} />
                  <button
                    type="submit"
                    aria-label={`Remove ${item.kind}: ${item.text}`}
                    className="text-teal-800 underline"
                  >
                    Remove
                  </button>
                </form>
              </li>
            ))}
          </ul>
        )}
        <div className="mt-6">
          <AddContext projectId={project.id} />
        </div>
      </section>
      <section
        aria-labelledby="references-title"
        className="mt-6 rounded-xl border border-stone-300 bg-white p-6 sm:p-8"
      >
        <h2 id="references-title" className="text-xl font-semibold">
          Reference documents
        </h2>
        <p className="mt-2 text-sm leading-6 text-stone-600">
          Answers use passages retrieved from these documents and name their
          sources. Files are read only from the configured reference folder.
        </p>
        {references.length > 0 && (
          <ul className="mt-4 space-y-2 text-sm">
            {references.map((document) => (
              <li
                key={document.id}
                className="flex items-start justify-between gap-3"
              >
                <span className="break-words">
                  <span className="font-medium">{document.title}</span>{' '}
                  <span className="font-mono text-xs text-stone-600">
                    {document.path} · {document.chunkCount} passages ·{' '}
                    {document.status}
                  </span>
                  {document.status === 'quarantined' && (
                    <>
                      {' '}
                      <Link href="/security" className="text-red-800 underline">
                        Quarantined: not used in answers (see why)
                      </Link>
                    </>
                  )}
                </span>
                <form action={removeReference}>
                  <input type="hidden" name="projectId" value={project.id} />
                  <input type="hidden" name="id" value={document.id} />
                  <button
                    type="submit"
                    aria-label={`Remove ${document.title}`}
                    className="text-teal-800 underline"
                  >
                    Remove
                  </button>
                </form>
              </li>
            ))}
          </ul>
        )}
        <div className="mt-6">
          {documents().configured ? (
            <AddReference projectId={project.id} />
          ) : (
            <p className="text-sm text-stone-700">
              Set <code>AGENTGATE_DOCS_ROOT</code> to a folder of .md or .txt
              files and restart to add references.
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
