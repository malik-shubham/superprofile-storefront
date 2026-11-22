import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto w-full max-w-md px-4 pt-24 text-center">
      <p className="text-4xl">🔍</p>
      <h1 className="mt-4 text-xl font-semibold">We couldn&apos;t find this store</h1>
      <p className="mt-2 text-zinc-600">The link may have a typo, or the store hasn&apos;t been published yet.</p>
      <Link href="/" className="mt-6 inline-grid place-items-center h-12 px-6 rounded-xl bg-violet-600 text-white font-semibold">
        Create your own store
      </Link>
    </main>
  );
}
