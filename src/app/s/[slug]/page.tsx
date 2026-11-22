// Public store page: /s/:slug
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import StoreView from "@/components/StoreView";
import TrackView from "@/components/TrackView";
import { getStore } from "@/lib/db";

export async function generateMetadata({ params }: PageProps<"/s/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const saved = await getStore(slug);
  if (!saved) return { title: "Store not found" };
  const { store } = saved;
  const title = store.tagline ? `${store.display_name} · ${store.tagline}` : store.display_name;
  const description = store.bio.slice(0, 180);
  // Link previews (WhatsApp, Instagram DMs) read these tags.
  return {
    title,
    description,
    openGraph: { title, description, type: "profile" },
    twitter: { card: "summary", title, description },
  };
}

export default async function StorePage({ params }: PageProps<"/s/[slug]">) {
  const { slug } = await params;
  const saved = await getStore(slug);
  if (!saved) notFound();
  return (
    <main className="flex-1 flex flex-col">
      <TrackView slug={slug} />
      <div className="flex-1">
        <StoreView store={saved.store} slug={slug} />
      </div>
    </main>
  );
}
