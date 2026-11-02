'use client';
import { Button } from '@/components/ui/button';
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <section role="alert">
      <h1 className="text-2xl font-semibold">Workspace could not be loaded</h1>
      <p className="my-4 text-stone-600">
        Check that local storage is accessible, then try again. Existing project
        data has not been reset.
      </p>
      <Button onClick={reset}>Try again</Button>
    </section>
  );
}
