import Link from 'next/link';
import { totalmem } from 'node:os';
import { checkServices, recommendModels } from '@agentgate/controller';
import { cloud, endpoints, ollama } from '@/lib/controller';
import { LocalModels } from '@/components/local-models';
import { disconnectProvider } from '@/app/actions';
import { ConnectProvider } from '@/components/connect-provider';
import { Button } from '@/components/ui/button';
export const dynamic = 'force-dynamic';
export default async function ModelsPage() {
  const providers = await cloud().status();
  const checks = await checkServices(endpoints());
  const ollamaReady = checks[0]?.ok ?? false;
  const installed = ollamaReady
    ? await ollama()
        .listDetailed()
        .catch(() => [])
    : [];
  return (
    <>
      <Link href="/" className="text-sm text-teal-800 hover:underline">
        ← All projects
      </Link>
      <h1 className="mb-3 mt-10 text-4xl font-semibold tracking-tight">
        Models
      </h1>
      <section aria-labelledby="checks-title" className="mb-10">
        <h2 id="checks-title" className="mb-3 text-xl font-semibold">
          System check
        </h2>
        <ul className="space-y-2 text-sm">
          {checks.map((check) => (
            <li key={check.name}>
              <span aria-hidden="true">{check.ok ? '✅' : '⚠️'}</span>{' '}
              <span className="font-medium">{check.name}</span>
              <span className="text-stone-600"> — {check.detail}</span>
              {!check.ok && (
                <span className="block pl-6 text-xs text-stone-700">
                  {check.fix}
                </span>
              )}
            </li>
          ))}
        </ul>
      </section>
      <section
        aria-labelledby="local-title"
        className="mb-10 rounded-xl border border-stone-300 bg-white p-6"
      >
        <h2 id="local-title" className="mb-1 text-xl font-semibold">
          Local models (Ollama)
        </h2>
        <p className="mb-5 text-sm text-stone-600">
          Runs on this computer. Nothing you type leaves it.
        </p>
        <LocalModels
          recommended={recommendModels(totalmem())}
          installed={installed}
          ollamaReady={ollamaReady}
          ramGb={Math.round(totalmem() / 1024 ** 3)}
        />
      </section>
      <h2 className="mb-3 text-xl font-semibold">Cloud models</h2>
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
