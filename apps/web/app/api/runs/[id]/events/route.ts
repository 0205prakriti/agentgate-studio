import { headers } from 'next/headers';
import {
  TERMINAL_STATUSES,
  isLocalHost,
  runIdSchema,
} from '@agentgate/controller';
import { sessions } from '@/lib/controller';

export const dynamic = 'force-dynamic';
const POLL_MS = 200;

/**
 * Server-sent events read from SQLite, so a dropped connection resumes from
 * Last-Event-ID and the run itself never depends on this request staying open.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!isLocalHost((await headers()).get('host')))
    return new Response('Forbidden', { status: 403 });
  const parsedId = runIdSchema.safeParse((await params).id);
  if (!parsedId.success) return new Response('Not found', { status: 404 });
  const runId = parsedId.data;
  if (!sessions().findRun(runId))
    return new Response('Not found', { status: 404 });
  const resume = Number(request.headers.get('last-event-id') ?? 0);
  let cursor = Number.isSafeInteger(resume) && resume > 0 ? resume : 0;
  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        while (!request.signal.aborted) {
          // Read status before events so a terminal run is fully drained.
          const run = sessions().findRun(runId);
          for (const event of sessions().eventsAfter(runId, cursor)) {
            cursor = event.seq;
            controller.enqueue(
              encoder.encode(
                `id: ${event.seq}\ndata: ${JSON.stringify(event)}\n\n`,
              ),
            );
          }
          if (!run || TERMINAL_STATUSES.includes(run.status)) break;
          await new Promise((resolve) => setTimeout(resolve, POLL_MS));
        }
        controller.close();
      } catch (error) {
        controller.error(error);
      }
    },
  });
  return new Response(stream, {
    headers: {
      'content-type': 'text/event-stream',
      'cache-control': 'no-store',
      connection: 'keep-alive',
    },
  });
}
