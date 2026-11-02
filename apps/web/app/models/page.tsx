import Link from 'next/link';
import { cloud } from '@/lib/controller';
import { disconnectProvider } from '@/app/actions';
import { ConnectProvider } from '@/components/connect-provider';
import { Button } from '@/components/ui/button';
export const dynamic = 'force-dynamic';
export default async function ModelsPage() {
  const providers = await cloud().status();
  return (
    <>
      <Link href="/" className="text-sm text-teal-800 hover:underline">
        ← All projects
      </Link>
      <h1 className="mb-3 mt-10 text-4xl font-semibold tracking-tight">
        Cloud models
      </h1>
      <p className="mb-10 max-w-xl text-sm leading-6 text-stone-600">
        API keys are tested with one small request, then saved in this
        computer&apos;s secure credential store. They are never shown again.
      </p>
      <ul className="space-y-6">
        {providers.map((provider) => (
          <li
            key={provider.provider}
            className="rounded-xl border border-stone-300 bg-white p-6"
          >
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-xl font-semibold capitalize">
                {provider.provider}
              </h2>
              <span className="text-sm text-stone-600">
                {provider.configured
                  ? `Connected (${provider.source})`
                  : 'Not connected'}
              </span>
            </div>
            <div className="mt-4">
              <ConnectProvider provider={provider.provider} />
            </div>
            {provider.configured && provider.source === 'stored credential' && (
              <form action={disconnectProvider} className="mt-4">
                <input
                  type="hidden"
                  name="provider"
                  value={provider.provider}
                />
                <Button type="submit" variant="outline">
                  Remove saved key
                </Button>
              </form>
            )}
          </li>
        ))}
      </ul>
    </>
  );
}
