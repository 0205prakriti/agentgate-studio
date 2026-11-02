import { headers } from 'next/headers';
import { isLocalHost } from '@agentgate/controller';
import { puller } from '@/lib/controller';

export const dynamic = 'force-dynamic';

/** Current model download progress, polled by the Models page. */
export async function GET() {
  if (!isLocalHost((await headers()).get('host')))
    return new Response('Forbidden', { status: 403 });
  return Response.json(puller().state(), {
    headers: { 'cache-control': 'no-store' },
  });
}
