'use client';
import { useActionState } from 'react';
import { startSession } from '@/app/actions';
import { Button } from '@/components/ui/button';

export function StartSession({
  projectId,
  models,
}: {
  projectId: string;
  models: string[];
}) {
  const [state, action, pending] = useActionState(startSession, {
    error: null,
  });
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="projectId" value={projectId} />
      <label htmlFor="modelId" className="block text-sm font-medium">
        Local model (Ollama)
      </label>
      <select
        id="modelId"
        name="modelId"
        required
        className="w-full rounded-md border border-stone-300 bg-white px-3 py-3 outline-teal-700"
      >
        {models.map((model) => (
          <option key={model} value={model}>
            {model}
          </option>
        ))}
      </select>
      {state.error && (
        <p role="alert" className="text-sm text-red-800">
          {state.error}
        </p>
      )}
      <Button type="submit" disabled={pending}>
        {pending ? 'Starting…' : 'Start session'}
      </Button>
    </form>
  );
}
