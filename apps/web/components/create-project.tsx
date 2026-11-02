'use client';
import { useActionState } from 'react';
import { createProject } from '@/app/actions';
import { Button } from '@/components/ui/button';
export function CreateProject() {
  const [state, action, pending] = useActionState(createProject, {
    error: null,
  });
  return (
    <form action={action} className="space-y-4">
      <label htmlFor="name" className="block text-sm font-medium">
        Project name
      </label>
      <input
        id="name"
        name="name"
        required
        maxLength={80}
        placeholder="e.g. Reference RAG"
        autoComplete="off"
        aria-describedby={state.error ? 'create-error' : 'name-help'}
        aria-invalid={Boolean(state.error)}
        className="w-full rounded-md border border-stone-300 bg-white px-3 py-3 outline-teal-700"
      />
      <p id="name-help" className="text-sm text-stone-600">
        A local workspace for your project. You can reopen it later.
      </p>
      {state.error && (
        <p id="create-error" role="alert" className="text-sm text-red-800">
          {state.error}
        </p>
      )}
      <Button type="submit" disabled={pending}>
        {pending ? 'Saving…' : 'Create project'}
        <span aria-hidden="true" className="ml-4">
          ↗
        </span>
      </Button>
    </form>
  );
}
