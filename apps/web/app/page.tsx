import Link from 'next/link';
import { projects } from '@/lib/controller';
import { CreateProject } from '@/components/create-project';
export const dynamic = 'force-dynamic';
export default function Workspace() {
  const items = projects().list();
  return (
    <>
      <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-teal-800">
        01 / Workspace
      </p>
      <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
        Your work, kept local.
      </h1>
      <p className="mt-4 max-w-xl text-base leading-7 text-stone-600">
        Create a project and return to it whenever you need. Project records are
        saved in SQLite on this computer.
      </p>
      <div className="mt-12 grid gap-8 lg:grid-cols-[1.5fr_1fr]">
        <section aria-labelledby="projects-title">
          <div className="mb-5 flex items-center justify-between">
            <h2 id="projects-title" className="text-xl font-semibold">
              Projects
            </h2>
            <span className="text-sm text-stone-600">{items.length} saved</span>
          </div>
          {items.length === 0 ? (
            <div className="rounded-xl border border-dashed border-stone-300 p-8">
              <h3 className="font-medium">Start with a project</h3>
              <p className="mt-2 text-sm leading-6 text-stone-600">
                Your saved projects will appear here. Create your first
                workspace using the form.
              </p>
            </div>
          ) : (
            <ul className="space-y-3">
              {items.map((project) => (
                <li key={project.id}>
                  <Link
                    href={`/projects/${project.id}`}
                    className="flex items-center justify-between gap-4 rounded-xl border border-stone-300 bg-white p-5 transition-colors hover:border-teal-700 focus-visible:outline-2 focus-visible:outline-teal-700"
                  >
                    <div className="min-w-0">
                      <h3 className="break-words font-semibold">
                        {project.name}
                      </h3>
                      <p className="mt-2 text-xs text-stone-600">
                        Created {project.createdAt.slice(0, 10)} · Saved locally
                      </p>
                    </div>
                    <span aria-hidden="true">↗</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
        <section
          aria-labelledby="create-title"
          className="self-start rounded-xl border border-stone-300 bg-white p-6"
        >
          <h2 id="create-title" className="mb-6 text-xl font-semibold">
            New project
          </h2>
          <CreateProject />
        </section>
      </div>
    </>
  );
}
