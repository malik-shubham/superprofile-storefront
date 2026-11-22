// Private edit link: /edit/:slug?token=…  (no login; the token is the key)
import type { Metadata } from "next";
import Link from "next/link";
import Builder from "@/components/Builder";
import { getStore } from "@/lib/db";
import { publicOrigin } from "@/lib/site";

export const metadata: Metadata = { title: "Edit your store", robots: { index: false } };

export default async function EditPage({ params, searchParams }: PageProps<"/edit/[slug]">) {
  const { slug } = await params;
  const token = (await searchParams).token;
  const saved = await getStore(slug);

  if (!saved || typeof token !== "string" || saved.editToken !== token) {
    return (
      <main className="mx-auto max-w-md px-4 pt-24 text-center">
        <p className="text-4xl">🔒</p>
        <h1 className="mt-4 text-xl font-semibold">This edit link doesn&apos;t work</h1>
        <p className="mt-2 text-zinc-600">It may be incomplete. Copy the full edit link you saved after publishing.</p>
        <Link href="/" className="mt-6 inline-grid place-items-center h-12 px-6 rounded-xl bg-violet-600 text-white font-semibold">
          Create a new store
        </Link>
      </main>
    );
  }

  return (
    <Builder initial={{ store: saved.store, published: { slug, editToken: token } }} publicOrigin={publicOrigin()} />
  );
}
