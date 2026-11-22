"use client";

// Renders a store. Used two ways:
//  - public page (no `edit` prop): read-only, product cards link to detail view
//  - editor (with `edit` prop): the same page, but every text is tappable to
//    edit and each section has a "rewrite with AI" button.
import Link from "next/link";
import { useLayoutEffect, useRef } from "react";
import { FORMAT_LABELS } from "@/lib/pricing";
import type { Store, Warning } from "@/lib/schema";
import { formatINR, initials, THEME } from "./theme";

export type EditHandlers = {
  setField: (field: "display_name" | "tagline" | "bio", value: string) => void;
  openProduct: (index: number) => void;
  rewriteBio: () => void;
  busy: string | null; // "bio" | "product-0" | "all" ...
  warnings: Warning[];
};

export function EditableText({
  value,
  onChange,
  className = "",
  placeholder,
  maxLength,
  label,
}: {
  value: string;
  onChange: (v: string) => void;
  className?: string;
  placeholder?: string;
  maxLength?: number;
  label: string;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = el.scrollHeight + "px";
  }, [value]);
  return (
    <textarea
      ref={ref}
      aria-label={label}
      rows={1}
      value={value}
      maxLength={maxLength}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      className={`block w-full resize-none overflow-hidden bg-transparent rounded-lg -mx-1 px-1 outline-none border border-dashed border-current/25 focus:border-current/60 focus:bg-black/5 ${className}`}
    />
  );
}

function Spinner() {
  return <span className="inline-block size-4 rounded-full border-2 border-current border-r-transparent animate-spin" />;
}

export default function StoreView({ store, slug, edit }: { store: Store; slug?: string; edit?: EditHandlers }) {
  const t = THEME[store.theme];
  const warn = (field: string) => edit?.warnings.find((w) => w.field === field);

  return (
    <div className={`${t.page} min-h-full`}>
      <div className="mx-auto w-full max-w-md px-4 pt-8 pb-10">
        {/* Header */}
        <header className="flex flex-col items-center text-center">
          <div className={`size-20 rounded-full grid place-items-center text-2xl font-bold ${t.avatar}`} aria-hidden>
            {initials(store.display_name)}
          </div>

          {edit ? (
            <EditableText
              label="Your name"
              value={store.display_name}
              onChange={(v) => edit.setField("display_name", v)}
              maxLength={60}
              className="mt-4 text-2xl font-bold text-center"
            />
          ) : (
            <h1 className="mt-4 text-2xl font-bold">{store.display_name}</h1>
          )}
          {store.handle && <p className={`text-sm ${t.muted}`}>@{store.handle}</p>}

          <section className={`relative mt-3 w-full ${edit?.busy === "bio" ? "opacity-50" : ""}`}>
            {edit ? (
              <>
                <EditableText
                  label="Tagline"
                  value={store.tagline}
                  onChange={(v) => edit.setField("tagline", v)}
                  maxLength={120}
                  placeholder="One line about what you do"
                  className="text-base font-medium text-center"
                />
                <EditableText
                  label="Bio"
                  value={store.bio}
                  onChange={(v) => edit.setField("bio", v)}
                  maxLength={600}
                  className={`mt-2 text-[15px] leading-relaxed text-center ${t.muted}`}
                />
                {warn("bio") && (
                  <p className="mt-2 rounded-lg bg-amber-100 text-amber-900 text-sm px-3 py-2 text-left">⚠️ {warn("bio")!.message}</p>
                )}
                <button
                  onClick={edit.rewriteBio}
                  disabled={!!edit.busy}
                  className={`mt-3 inline-flex items-center gap-2 h-10 px-4 rounded-full text-sm font-medium ${t.accentSoft} disabled:opacity-60`}
                >
                  {edit.busy === "bio" ? <Spinner /> : "✨"} Rewrite bio with AI
                </button>
              </>
            ) : (
              <>
                {store.tagline && <p className="text-base font-medium">{store.tagline}</p>}
                <p className={`mt-2 text-[15px] leading-relaxed whitespace-pre-line ${t.muted}`}>{store.bio}</p>
              </>
            )}
          </section>
        </header>

        {/* Products */}
        <section className="mt-8 flex flex-col gap-3" aria-label="Products">
          {store.products.map((p, i) => {
            const busy = edit?.busy === `product-${i}`;
            const inner = (
              <>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className={`text-xs font-medium uppercase tracking-wide ${t.muted}`}>{FORMAT_LABELS[p.format]}</p>
                    <h2 className="mt-1 text-base font-semibold leading-snug">{p.title}</h2>
                  </div>
                  <span className={`shrink-0 rounded-full px-3 py-1 text-sm font-semibold ${t.accent}`}>
                    {formatINR(p.price_inr)}
                    {p.format === "community" && <span className="font-normal opacity-80">/mo</span>}
                  </span>
                </div>
                {p.short_line && <p className={`mt-2 text-sm leading-relaxed ${t.muted}`}>{p.short_line}</p>}
                {edit && warn(`product-${i}`) && (
                  <p className="mt-2 rounded-lg bg-amber-100 text-amber-900 text-sm px-3 py-2">⚠️ {warn(`product-${i}`)!.message}</p>
                )}
                <p className="mt-3 text-sm font-medium flex items-center gap-2">
                  {busy ? (
                    <>
                      <Spinner /> Rewriting…
                    </>
                  ) : edit ? (
                    "✏️ Tap to edit or rewrite"
                  ) : (
                    "View details →"
                  )}
                </p>
              </>
            );
            const cls = `block w-full text-left rounded-2xl p-4 transition active:scale-[0.99] ${t.card} ${busy ? "opacity-50" : ""}`;
            if (edit) {
              return (
                <button key={p.id} className={cls} onClick={() => edit.openProduct(i)} disabled={!!edit.busy}>
                  {inner}
                </button>
              );
            }
            return (
              <ProductLink key={p.id} href={`/s/${slug}/p/${p.id}`} slug={slug!} productId={p.id} className={cls}>
                {inner}
              </ProductLink>
            );
          })}
        </section>

        {!edit && (
          <footer className={`mt-12 text-center text-xs ${t.muted}`}>
            <Link href="/" className="underline underline-offset-2">
              Made with AI Storefront Generator. Create yours in 2 minutes
            </Link>
          </footer>
        )}
      </div>
    </div>
  );
}

function ProductLink({
  href,
  slug,
  productId,
  className,
  children,
}: {
  href: string;
  slug: string;
  productId: string;
  className: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={className}
      onClick={() => {
        try {
          const body = JSON.stringify({ slug, event: "click", productId });
          if (!navigator.sendBeacon?.("/api/track", new Blob([body], { type: "application/json" }))) {
            fetch("/api/track", { method: "POST", body, keepalive: true });
          }
        } catch {}
      }}
    >
      {children}
    </Link>
  );
}
