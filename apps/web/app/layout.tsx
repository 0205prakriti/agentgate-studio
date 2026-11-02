import type { Metadata } from 'next';
import Link from 'next/link';
import './globals.css';
export const metadata: Metadata = {
  title: 'AGENTGATE Studio',
  description: 'Local project workspaces for AGENTGATE Studio.',
};
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <header className="border-b border-stone-300 bg-white px-5 sm:px-10">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 py-5">
            <Link href="/" className="text-lg font-bold tracking-tight">
              AGENTGATE{' '}
              <span className="font-normal text-stone-500">/ Studio</span>
            </Link>
            <span className="rounded-full border border-stone-300 px-3 py-1 text-xs font-medium">
              Local workspace
            </span>
          </div>
        </header>
        <main className="mx-auto max-w-6xl px-5 py-10 sm:px-10 sm:py-16">
          {children}
        </main>
        <footer className="mx-auto max-w-6xl px-5 py-8 text-xs text-stone-600 sm:px-10">
          Phase 1 · Foundation in progress · Model execution and security
          scanning are not connected.
        </footer>
      </body>
    </html>
  );
}
