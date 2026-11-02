'use client';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { cancelRun, saveOutcome, sendPrompt } from '@/app/actions';
import { Button } from '@/components/ui/button';

type Turn = { role: 'user' | 'assistant'; text: string };
type StreamEvent = { seq: number; type: string; text: string };

type Source = { documentId: string; title: string; seq: number };

export function SessionChat({
  projectId,
  sources,
  sessionId,
  turns,
  activeRunId,
  activePrompt,
}: {
  projectId: string;
  sources: Source[][];
  sessionId: string;
  turns: Turn[];
  activeRunId: string | null;
  activePrompt: string | null;
}) {
  const router = useRouter();
  const [runId, setRunId] = useState(activeRunId);
  const [prompt, setPrompt] = useState('');
  const [live, setLive] = useState('');
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const pendingPrompt = useRef(activePrompt);

  useEffect(() => {
    if (!runId) return;
    setLive('');
    setStatus('Waiting for the model…');
    const source = new EventSource(`/api/runs/${runId}/events`);
    source.onmessage = (message: MessageEvent<string>) => {
      const event = JSON.parse(message.data) as StreamEvent;
      if (event.type === 'text_delta') {
        setStatus('Streaming…');
        setLive((current) => current + event.text);
      } else if (event.type === 'failed' || event.type === 'cancelled') {
        setError(event.type === 'failed' ? event.text : 'Run cancelled.');
      }
      if (['completed', 'failed', 'cancelled'].includes(event.type)) {
        source.close();
        setRunId(null);
        setStatus(null);
        pendingPrompt.current = null;
        router.refresh();
      }
    };
    // EventSource reconnects with Last-Event-ID on its own; the run keeps going server-side.
    return () => source.close();
  }, [runId, router]);

  async function submit(formEvent: React.FormEvent) {
    formEvent.preventDefault();
    setPending(true);
    setError(null);
    const result = await sendPrompt(sessionId, prompt);
    setPending(false);
    if (result.error !== null) return setError(result.error);
    pendingPrompt.current = prompt;
    setPrompt('');
    setRunId(result.runId);
  }

  return (
    <div className="space-y-6">
      <ol className="space-y-4" aria-label="Conversation">
        {turns.map((turn, index) => (
          <li
            key={index}
            className={`whitespace-pre-wrap break-words rounded-xl border p-4 text-sm leading-6 ${turn.role === 'user' ? 'border-stone-300 bg-white' : 'border-teal-900/20 bg-teal-50'}`}
          >
            <span className="mb-1 block text-xs font-semibold uppercase tracking-widest text-stone-600">
              {turn.role === 'user' ? 'You' : 'Model'}
            </span>
            {turn.text}
            {turn.role === 'assistant' && (
              <AnswerDetails
                projectId={projectId}
                text={turn.text}
                sources={sources[Math.floor(index / 2)] ?? []}
              />
            )}
          </li>
        ))}
        {runId && pendingPrompt.current && (
          <li className="whitespace-pre-wrap break-words rounded-xl border border-stone-300 bg-white p-4 text-sm leading-6">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-widest text-stone-600">
              You
            </span>
            {pendingPrompt.current}
          </li>
        )}
        {runId && (
          <li
            aria-live="polite"
            className="whitespace-pre-wrap break-words rounded-xl border border-teal-900/20 bg-teal-50 p-4 text-sm leading-6"
          >
            <span className="mb-1 block text-xs font-semibold uppercase tracking-widest text-stone-600">
              Model · {status}
            </span>
            {live}
          </li>
        )}
      </ol>
      {error && (
        <p role="alert" className="text-sm text-red-800">
          {error}
        </p>
      )}
      <form onSubmit={submit} className="space-y-3">
        <label htmlFor="prompt" className="block text-sm font-medium">
          Task
        </label>
        <textarea
          id="prompt"
          required
          maxLength={8000}
          rows={3}
          value={prompt}
          onChange={(event) => setPrompt(event.target.value)}
          disabled={runId !== null}
          className="w-full rounded-md border border-stone-300 bg-white px-3 py-3 outline-teal-700"
        />
        <div className="flex gap-3">
          <Button type="submit" disabled={pending || runId !== null}>
            {pending ? 'Sending…' : 'Run task'}
          </Button>
          {runId && (
            <Button
              type="button"
              variant="outline"
              onClick={() => void cancelRun(runId)}
            >
              Cancel
            </Button>
          )}
        </div>
      </form>
    </div>
  );
}

function AnswerDetails({
  projectId,
  text,
  sources,
}: {
  projectId: string;
  text: string;
  sources: Source[];
}) {
  const titles = [...new Set(sources.map((source) => source.title))];
  return (
    <div className="mt-3 space-y-2 border-t border-teal-900/20 pt-3 text-xs text-stone-700">
      {titles.length > 0 && (
        <p>
          Retrieved context:{' '}
          <span className="font-medium">{titles.join(', ')}</span>
        </p>
      )}
      <form action={saveOutcome}>
        <input type="hidden" name="projectId" value={projectId} />
        <input type="hidden" name="text" value={text.slice(0, 500)} />
        <button type="submit" className="text-teal-800 underline">
          Save as verified outcome
        </button>
      </form>
    </div>
  );
}
