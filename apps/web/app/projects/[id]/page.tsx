import Link from 'next/link';
import { notFound } from 'next/navigation';
import { projectIdSchema } from '@agentgate/controller';
import { projects } from '@/lib/controller';
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
      <div className="mt-6 rounded-xl border border-teal-900/20 bg-teal-50 p-6">
        <h2 className="font-semibold">Next: connect a model</h2>
        <p className="mt-2 text-sm leading-6 text-stone-700">
          Model selection, agent sessions, and task execution are the next
          foundation slice. This project does not run an agent yet.
        </p>
      </div>
      <Button asChild variant="outline" className="mt-8">
        <Link href="/">Back to workspace</Link>
      </Button>
    </>
  );
}
