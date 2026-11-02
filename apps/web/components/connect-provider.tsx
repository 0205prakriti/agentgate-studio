'use client';
import { useActionState } from 'react';
import { connectProvider } from '@/app/actions';
import { Button } from '@/components/ui/button';

export function ConnectProvider({ provider }: { provider: string }) {
  const [state, action, pending] = useActionState(connectProvider, {
    error: null,
    saved: false,
  });
  const id = `key-${provider}`;
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="provider" value={provider} />
      <label htmlFor={id} className="block text-sm font-medium">
        API key
      </label>
      <input
        id={id}
        name="apiKey"
        type="password"
        required
        autoComplete="off"
        spellCheck={false}
        maxLength={512}
        className="w-full rounded-md border border-stone-300 bg-white px-3 py-3 outline-teal-700"
      />
      {state.error && (
        <p role="alert" className="text-sm text-red-800">
          {state.error}
        </p>
      )}
      {state.saved && (
        <p role="status" className="text-sm text-teal-800">
          Key verified and saved.
        </p>
      )}
      <Button type="submit" disabled={pending}>
        {pending ? 'Testing…' : 'Test and save key'}
      </Button>
    </form>
  );
}
