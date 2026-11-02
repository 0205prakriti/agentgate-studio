import Link from 'next/link';
export default function NotFound() {
  return (
    <section>
      <h1 className="text-2xl font-semibold">Project not found</h1>
      <p className="my-4 text-stone-600">
        This project does not exist in the current local workspace.
      </p>
      <Link href="/" className="text-teal-800 underline">
        Return to workspace
      </Link>
    </section>
  );
}
