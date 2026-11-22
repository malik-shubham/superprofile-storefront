// Product detail page: /s/:slug/p/:productId
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { formatINR, initials, THEME } from "@/components/theme";
import { getStore } from "@/lib/db";
import { FORMAT_LABELS } from "@/lib/pricing";

async function load(slug: string, id: string) {
  const saved = await getStore(slug);
  const product = saved?.store.products.find((p) => p.id === id);
  return saved && product ? { store: saved.store, product } : null;
}

export async function generateMetadata({ params }: PageProps<"/s/[slug]/p/[id]">): Promise<Metadata> {
  const { slug, id } = await params;
  const data = await load(slug, id);
  if (!data) return { title: "Product not found" };
  const title = `${data.product.title} · ${formatINR(data.product.price_inr)} · ${data.store.display_name}`;
  const description = data.product.short_line || data.product.description.slice(0, 180);
  return { title, description, openGraph: { title, description } };
}

export default async function ProductPage({ params }: PageProps<"/s/[slug]/p/[id]">) {
  const { slug, id } = await params;
  const data = await load(slug, id);
  if (!data) notFound();
  const { store, product: p } = data;
  const t = THEME[store.theme];

  return (
    <main className={`${t.page} flex-1`}>
      <div className="mx-auto w-full max-w-md px-4 pt-4 pb-32">
        <Link href={`/s/${slug}`} className={`inline-flex items-center gap-2 h-11 text-sm ${t.muted}`}>
          <span className={`size-7 rounded-full grid place-items-center text-[11px] font-bold ${t.avatar}`}>
            {initials(store.display_name)}
          </span>
          ← {store.display_name}
        </Link>

        <p className={`mt-4 text-xs font-medium uppercase tracking-wide ${t.muted}`}>{FORMAT_LABELS[p.format]}</p>
        <h1 className="mt-1 text-2xl font-bold leading-tight">{p.title}</h1>
        {p.short_line && <p className={`mt-2 text-base ${t.muted}`}>{p.short_line}</p>}

        <p className="mt-4 text-3xl font-bold">
          {formatINR(p.price_inr)}
          {p.format === "community" && <span className={`text-base font-normal ${t.muted}`}> / month</span>}
        </p>

        {p.description && <p className="mt-6 text-[15px] leading-relaxed whitespace-pre-line">{p.description}</p>}

        {p.whats_included.length > 0 && (
          <section className={`mt-6 rounded-2xl p-4 ${t.card}`}>
            <h2 className="font-semibold">What&apos;s included</h2>
            <ul className="mt-3 space-y-2">
              {p.whats_included.map((item, i) => (
                <li key={i} className="flex gap-2 text-[15px]">
                  <span aria-hidden>✓</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {p.price_rationale && (
          <section className={`mt-4 rounded-2xl p-4 ${t.accentSoft}`}>
            <h2 className="text-sm font-semibold">Why {formatINR(p.price_inr)}?</h2>
            <p className="mt-1 text-sm leading-relaxed">{p.price_rationale}</p>
          </section>
        )}
      </div>

      <div className={`fixed bottom-0 inset-x-0 border-t ${t.border} ${t.page} pb-[env(safe-area-inset-bottom)]`}>
        <div className="mx-auto max-w-md px-4 py-3">
          <button disabled className={`h-12 w-full rounded-xl font-semibold opacity-60 cursor-not-allowed ${t.accent}`}>
            Buy for {formatINR(p.price_inr)}
          </button>
          <p className={`mt-1 text-center text-xs ${t.muted}`}>Checkout isn&apos;t part of this demo. Payments are out of scope.</p>
        </div>
      </div>
    </main>
  );
}
