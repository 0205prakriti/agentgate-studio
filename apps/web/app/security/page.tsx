import Link from 'next/link';
import { projects, security } from '@/lib/controller';
export const dynamic = 'force-dynamic';

const STAGES = {
  input: 'Task check',
  ingestion: 'Document ingestion',
  retrieval: 'Retrieved content',
  output: 'Answer check',
} as const;

export default function SecurityPage() {
  const events = security().recent(100);
  const names = new Map(
    projects()
      .list()
      .map((p) => [p.id, p.name]),
  );
  return (
    <>
      <Link href="/" className="text-sm text-teal-800 hover:underline">
        ← All projects
      </Link>
      <h1 className="mb-3 mt-10 text-4xl font-semibold tracking-tight">
        Security findings
      </h1>
      <p className="mb-10 max-w-2xl text-sm leading-6 text-stone-600">
        Every item here was produced by an enforced rule or the LLM Guard
        prompt-injection scanner while the app was running. These checks reduce
        risk; they do not guarantee protection from every attack.
      </p>
      {events.length === 0 ? (
        <p className="rounded-xl border border-dashed border-stone-300 p-8 text-sm text-stone-700">
          Nothing has been blocked or quarantined yet.
        </p>
      ) : (
        <ul className="space-y-4">
          {events.map((event) => (
            <li
              key={event.id}
              className="rounded-xl border border-stone-300 bg-white p-5"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-semibold">
                  <span className="rounded bg-red-100 px-2 py-0.5 text-xs uppercase tracking-wide text-red-900">
                    {event.outcome}
                  </span>{' '}
                  <span className="font-mono text-sm">{event.rule}</span>
                </p>
                <time
                  dateTime={event.createdAt}
                  className="text-xs text-stone-600"
                >
                  {event.createdAt.slice(0, 19).replace('T', ' ')} UTC
                </time>
              </div>
              <p className="mt-2 text-sm leading-6">{event.detail}</p>
              <dl className="mt-3 grid gap-x-6 gap-y-1 text-xs text-stone-700 sm:grid-cols-2">
                <div>
                  <dt className="inline text-stone-600">Stage: </dt>
                  <dd className="inline">{STAGES[event.stage]}</dd>
                </div>
                <div>
                  <dt className="inline text-stone-600">Source: </dt>
                  <dd className="inline break-words">{event.source}</dd>
                </div>
                <div>
                  <dt className="inline text-stone-600">Project: </dt>
                  <dd className="inline">
                    <Link
                      href={`/projects/${event.projectId}`}
                      className="underline"
                    >
                      {names.get(event.projectId) ?? 'Unknown project'}
                    </Link>
                  </dd>
                </div>
                {event.score !== null && (
                  <div>
                    <dt className="inline text-stone-600">Scanner score: </dt>
                    <dd className="inline">{event.score.toFixed(2)}</dd>
                  </div>
                )}
              </dl>
              {event.evidence && (
                <blockquote className="mt-3 break-words rounded-md bg-stone-100 p-3 text-xs">
                  {event.evidence}
                </blockquote>
              )}
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
