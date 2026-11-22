"use client";

// The whole creator flow in one place, as a simple state machine:
//   input → (follow-up question) → generating → editor → published
// Failures never wipe what the creator typed or edited.
import { useCallback, useEffect, useRef, useState } from "react";
import { AUDIENCE_LABELS, AUDIENCES, bandFor, FORMAT_LABELS, FORMATS, type Audience, type Format } from "@/lib/pricing";
import {
  LANGUAGE_LABELS,
  LANGUAGES,
  LIMITS,
  THEMES,
  type Language,
  type Product,
  type Store,
  type Theme,
  type Warning,
} from "@/lib/schema";
import StoreView, { EditableText } from "./StoreView";
import { formatINR, THEME } from "./theme";

type Input = { description: string; handle: string; audience: Audience; language: Language };
type Published = { slug: string; editToken: string };
type Step = "input" | "followup" | "generating" | "editor" | "published";

const EMPTY_INPUT: Input = { description: "", handle: "", audience: "small", language: "english" };
const DRAFT_KEY = "storefront-draft-v1";

const EXAMPLES: { label: string; input: Input }[] = [
  {
    label: "🏋️ Home fitness (Hinglish)",
    input: {
      description:
        "Main ghar pe bina equipment ke workouts sikhati hoon, mostly working women ke liye. Reels pe 20 min routines aur diet tips daalti hoon.",
      handle: "fitwithriya",
      audience: "mid",
      language: "hinglish",
    },
  },
  {
    label: "💰 Personal finance",
    input: {
      description:
        "I'm a CA who explains budgeting, tax saving and SIP basics for first-jobbers in simple language on Instagram.",
      handle: "",
      audience: "small",
      language: "english",
    },
  },
  {
    label: "🎨 Designer, no audience yet",
    input: {
      description: "UI/UX designer with 6 years at startups. I want to help freshers build a portfolio and crack design interviews.",
      handle: "",
      audience: "starting",
      language: "english",
    },
  },
];

const LOADING_LINES = [
  "Reading what you do…",
  "Finding products your followers would buy…",
  "Pricing for Indian buyers…",
  "Writing your bio…",
  "Putting your page together…",
];

async function post<T>(url: string, body: unknown): Promise<T & { ok: boolean; error?: string }> {
  try {
    const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const data = await res.json().catch(() => ({ ok: false, error: "The server sent an unexpected reply. Please try again." }));
    return data;
  } catch {
    return { ok: false, error: "You seem to be offline. Check your internet and try again." } as T & { ok: boolean; error?: string };
  }
}

function loadDraft() {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}
function saveDraft(d: unknown) {
  try {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(d));
  } catch {}
}
function clearDraft() {
  try {
    localStorage.removeItem(DRAFT_KEY);
  } catch {}
}

export default function Builder({ initial }: { initial?: { store: Store; published: Published } }) {
  const [step, setStep] = useState<Step>(initial ? "editor" : "input");
  const [input, setInput] = useState<Input>(EMPTY_INPUT);
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [store, setStore] = useState<Store | null>(initial?.store ?? null);
  const [undo, setUndo] = useState<{ store: Store; label: string } | null>(null);
  const [warnings, setWarnings] = useState<Warning[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [openProduct, setOpenProduct] = useState<number | null>(null);
  const [published, setPublished] = useState<Published | null>(initial?.published ?? null);
  const [dirtySincePublish, setDirtySincePublish] = useState(false);
  const [restored, setRestored] = useState(!!initial);
  const [loadingLine, setLoadingLine] = useState(0);
  const [showRegenAll, setShowRegenAll] = useState(false);
  const requestId = useRef(0);

  // Restore a saved draft (so a refresh or a failed call never loses work).
  // Must run after mount: localStorage doesn't exist during server rendering.
  useEffect(() => {
    if (initial) return;
    const d = loadDraft();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time sync from browser storage
    if (d?.input) setInput({ ...EMPTY_INPUT, ...d.input });
    if (d?.store) {
      setStore(d.store);
      setPublished(d.published ?? null);
      setStep("editor");
    }
    setRestored(true);
  }, [initial]);

  useEffect(() => {
    if (!restored || initial) return;
    saveDraft({ input, store, published });
  }, [input, store, published, restored, initial]);

  useEffect(() => {
    if (step !== "generating") return;
    const id = setInterval(() => setLoadingLine((n) => Math.min(n + 1, LOADING_LINES.length - 1)), 2500);
    return () => clearInterval(id);
  }, [step]);

  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(id);
  }, [toast]);

  const flash = (msg: string) => setToast(msg);

  // ---------- generate whole store ----------
  const generate = useCallback(
    async (inp: Input, opts?: { keepTheme?: Theme }) => {
      setError(null);
      const desc = inp.description.trim();
      if (desc.length === 0 && !inp.handle.trim()) {
        setError("Tell us a little about yourself first: what you teach or post about.");
        setStep("input");
        return;
      }
      const prevStep = step;
      setLoadingLine(0);
      setStep("generating");
      const id = ++requestId.current;
      const res = await post<{ status?: string; question?: string; store?: Omit<Store, "theme">; warnings?: Warning[] }>(
        "/api/generate",
        inp,
      );
      if (id !== requestId.current) return; // a newer request replaced this one
      if (!res.ok) {
        setError(res.error ?? "Something went wrong. Please try again.");
        setStep(prevStep === "editor" ? "editor" : "input");
        if (prevStep === "editor") flash(res.error ?? "Couldn't regenerate. Your current page is unchanged.");
        return;
      }
      if (res.status === "need_more_info") {
        setQuestion(res.question ?? "Tell us a little more about what you do.");
        setAnswer("");
        setStep("followup");
        return;
      }
      if (store) setUndo({ store, label: "whole page" });
      setStore({ ...(res.store as Omit<Store, "theme">), theme: opts?.keepTheme ?? store?.theme ?? "minimal" });
      setWarnings(res.warnings ?? []);
      setDirtySincePublish(true);
      setStep("editor");
      window.scrollTo({ top: 0 });
    },
    [step, store],
  );

  const submitFollowup = () => {
    const extra = answer.trim();
    if (!extra) return;
    const combined = `${input.description.trim()}\n${extra}`.trim().slice(0, LIMITS.description);
    const next = { ...input, description: combined };
    setInput(next);
    generate(next);
  };

  // ---------- edits ----------
  const update = (fn: (s: Store) => Store) => {
    setStore((s) => (s ? fn(s) : s));
    setDirtySincePublish(true);
  };

  const rewrite = async (part: "bio" | "product", index?: number, instruction?: string) => {
    if (!store) return;
    const key = part === "bio" ? "bio" : `product-${index}`;
    setBusy(key);
    const before = store;
    const res = await post<{ tagline?: string; bio?: string; product?: Product; warnings?: Warning[] }>("/api/regenerate", {
      store,
      part,
      index,
      instruction,
    });
    setBusy(null);
    if (!res.ok) {
      flash(`${res.error ?? "Couldn't rewrite that."} Your previous version is kept.`);
      return;
    }
    setUndo({ store: before, label: part === "bio" ? "bio" : "product" });
    setWarnings((w) => [...w.filter((x) => x.field !== key), ...(res.warnings ?? [])]);
    if (part === "bio") {
      update((s) => ({ ...s, tagline: res.tagline ?? s.tagline, bio: res.bio ?? s.bio }));
    } else if (res.product) {
      update((s) => {
        const products = [...s.products];
        products[index!] = res.product!;
        return { ...s, products };
      });
    }
    flash("Rewritten ✨");
  };

  const addProduct = async () => {
    if (!store || store.products.length >= 4) return;
    const index = store.products.length;
    setBusy("add");
    const res = await post<{ product?: Product; warnings?: Warning[] }>("/api/regenerate", { store, part: "product", index });
    setBusy(null);
    if (!res.ok || !res.product) {
      flash(res.error ?? "Couldn't add a product right now. Please try again.");
      return;
    }
    update((s) => ({ ...s, products: [...s.products, res.product!] }));
    setWarnings((w) => [...w, ...(res.warnings ?? [])]);
    flash("Added a new product idea ✨");
  };

  // ---------- publish ----------
  const publish = async () => {
    if (!store) return;
    const problems: string[] = [];
    if (!store.display_name.trim()) problems.push("Add your name at the top.");
    if (!store.bio.trim()) problems.push("Your bio is empty.");
    store.products.forEach((p, i) => {
      if (!p.title.trim()) problems.push(`Product ${i + 1} needs a title.`);
    });
    if (problems.length) {
      flash(problems[0]);
      return;
    }
    setBusy("publish");
    const res = await post<{ slug?: string; editToken?: string }>("/api/publish", {
      store,
      slug: published?.slug,
      editToken: published?.editToken,
    });
    setBusy(null);
    if (!res.ok || !res.slug || !res.editToken) {
      flash(res.error ?? "Couldn't publish. Your draft is safe. Please try again.");
      return;
    }
    const p = { slug: res.slug, editToken: res.editToken };
    setPublished(p);
    setDirtySincePublish(false);
    setStep("published");
    window.scrollTo({ top: 0 });
  };

  const startOver = () => {
    if (!confirm("Start a new store? Your current draft will be cleared from this phone.")) return;
    clearDraft();
    setStore(null);
    setPublished(null);
    setInput(EMPTY_INPUT);
    setWarnings([]);
    setUndo(null);
    setError(null);
    setStep("input");
  };

  if (!restored) return <div className="min-h-dvh" />;

  // ---------- screens ----------
  return (
    <div className="min-h-dvh flex flex-col bg-zinc-50 text-zinc-900">
      {step === "input" && (
        <InputScreen input={input} setInput={setInput} error={error} onSubmit={() => generate(input)} />
      )}

      {step === "followup" && (
        <Shell>
          <div className="pt-10">
            <p className="text-sm font-medium text-violet-700">One quick question</p>
            <h1 className="mt-2 text-xl font-semibold leading-snug">{question}</h1>
            <textarea
              autoFocus
              value={answer}
              maxLength={300}
              onChange={(e) => setAnswer(e.target.value)}
              rows={3}
              placeholder="e.g. I teach beginner yoga to working women"
              className="mt-5 w-full rounded-xl border border-zinc-300 bg-white p-3 text-base outline-none focus:border-violet-500"
            />
            <PrimaryButton onClick={submitFollowup} disabled={!answer.trim()}>
              Continue
            </PrimaryButton>
            <button onClick={() => setStep("input")} className="mt-3 h-11 w-full text-sm text-zinc-600">
              ← Edit my description instead
            </button>
          </div>
        </Shell>
      )}

      {step === "generating" && (
        <Shell>
          <div className="pt-24 flex flex-col items-center text-center" role="status" aria-live="polite">
            <div className="size-12 rounded-full border-4 border-violet-200 border-t-violet-600 animate-spin" />
            <p className="mt-6 text-lg font-medium">{LOADING_LINES[loadingLine]}</p>
            <p className="mt-2 text-sm text-zinc-500">This usually takes 10–20 seconds.</p>
            <ul className="mt-8 w-full max-w-xs text-left text-sm space-y-2">
              {LOADING_LINES.map((l, i) => (
                <li key={l} className={i <= loadingLine ? "text-zinc-800" : "text-zinc-400"}>
                  {i < loadingLine ? "✓" : i === loadingLine ? "•" : "○"} {l.replace("…", "")}
                </li>
              ))}
            </ul>
          </div>
        </Shell>
      )}

      {step === "editor" && store && (
        <>
          <div className="sticky top-0 z-20 bg-white/95 backdrop-blur border-b border-zinc-200">
            <div className="mx-auto max-w-md px-4 py-2 flex items-center gap-2">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold truncate">Your store draft</p>
                <p className="text-xs text-zinc-500 truncate">Tap any text to edit it</p>
              </div>
              <button
                onClick={() => setShowRegenAll(true)}
                disabled={!!busy}
                className="h-10 px-3 rounded-full bg-zinc-100 text-sm font-medium disabled:opacity-50"
              >
                ↻ Redo all
              </button>
              <button onClick={startOver} className="h-10 px-3 rounded-full text-sm text-zinc-500">
                New
              </button>
            </div>
            <ThemePicker
              value={store.theme}
              onChange={(theme) => update((s) => ({ ...s, theme }))}
            />
          </div>

          <div className="flex-1">
            <StoreView
              store={store}
              edit={{
                setField: (f, v) => update((s) => ({ ...s, [f]: v })),
                openProduct: setOpenProduct,
                rewriteBio: () => rewrite("bio"),
                busy,
                warnings,
              }}
            />
            <div className={`${THEME[store.theme].page} pb-36`}>
              <div className="mx-auto max-w-md px-4">
                {store.products.length < 4 && (
                  <button
                    onClick={addProduct}
                    disabled={!!busy}
                    className={`w-full h-12 rounded-2xl border-2 border-dashed ${THEME[store.theme].border} text-sm font-medium disabled:opacity-50`}
                  >
                    {busy === "add" ? "Thinking of another idea…" : "+ Add another product idea"}
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="fixed bottom-0 inset-x-0 z-20 bg-white border-t border-zinc-200 pb-[env(safe-area-inset-bottom)]">
            <div className="mx-auto max-w-md px-4 py-3 flex items-center gap-2">
              {undo && (
                <button
                  onClick={() => {
                    setStore(undo.store);
                    setUndo(null);
                    flash(`Brought back your previous ${undo.label}`);
                  }}
                  className="h-12 px-4 rounded-xl bg-zinc-100 text-sm font-medium"
                >
                  ↶ Undo
                </button>
              )}
              <button
                onClick={publish}
                disabled={!!busy}
                className="flex-1 h-12 rounded-xl bg-violet-600 text-white font-semibold disabled:opacity-60"
              >
                {busy === "publish" ? "Publishing…" : published ? (dirtySincePublish ? "Update my page" : "Page is live ✓") : "Publish my store"}
              </button>
            </div>
            {published && !dirtySincePublish && (
              <button onClick={() => setStep("published")} className="block mx-auto pb-2 text-xs text-violet-700 underline">
                See share options
              </button>
            )}
          </div>

          {openProduct !== null && store.products[openProduct] && (
            <ProductSheet
              product={store.products[openProduct]}
              audience={store.audience}
              index={openProduct}
              canDelete={store.products.length > 1}
              busy={busy === `product-${openProduct}`}
              warning={warnings.find((w) => w.field === `product-${openProduct}`)?.message}
              onChange={(p) =>
                update((s) => {
                  const products = [...s.products];
                  products[openProduct] = p;
                  return { ...s, products };
                })
              }
              onRewrite={async (instruction) => {
                await rewrite("product", openProduct, instruction);
              }}
              onDelete={() => {
                const i = openProduct;
                setUndo({ store, label: "product" });
                setOpenProduct(null);
                update((s) => ({ ...s, products: s.products.filter((_, j) => j !== i) }));
                setWarnings((w) => w.filter((x) => !x.field.startsWith("product-")));
              }}
              onClose={() => setOpenProduct(null)}
            />
          )}

          {showRegenAll && (
            <RegenAllSheet
              input={input}
              store={store}
              onClose={() => setShowRegenAll(false)}
              onConfirm={(lang) => {
                setShowRegenAll(false);
                const inp = {
                  ...input,
                  description: input.description || `${store.display_name}: ${store.tagline}. ${store.bio}`.slice(0, LIMITS.description),
                  handle: input.handle || store.handle,
                  audience: store.audience,
                  language: lang,
                };
                setInput(inp);
                generate(inp, { keepTheme: store.theme });
              }}
            />
          )}
        </>
      )}

      {step === "published" && store && published && (
        <PublishedScreen store={store} published={published} onEdit={() => setStep("editor")} onNew={startOver} />
      )}

      {toast && (
        <div className="fixed left-1/2 -translate-x-1/2 bottom-24 z-50 max-w-[90vw] rounded-full bg-zinc-900 text-white text-sm px-4 py-2.5 shadow-lg">
          {toast}
        </div>
      )}
    </div>
  );
}

// ======================= sub-screens =======================

function Shell({ children }: { children: React.ReactNode }) {
  return <main className="mx-auto w-full max-w-md px-4 pb-16">{children}</main>;
}

function PrimaryButton({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className="mt-4 h-13 w-full rounded-xl bg-violet-600 text-white text-base font-semibold disabled:opacity-50 active:bg-violet-700"
    >
      {children}
    </button>
  );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`h-10 px-3.5 rounded-full text-sm border transition ${
        active ? "bg-violet-600 border-violet-600 text-white" : "bg-white border-zinc-300 text-zinc-700"
      }`}
    >
      {children}
    </button>
  );
}

function InputScreen({
  input,
  setInput,
  error,
  onSubmit,
}: {
  input: Input;
  setInput: (i: Input) => void;
  error: string | null;
  onSubmit: () => void;
}) {
  const len = input.description.length;
  const handleBad = input.handle && !/^@?[a-zA-Z0-9._]{1,30}$/.test(input.handle.trim());
  return (
    <Shell>
      <div className="pt-10">
        <p className="text-sm font-medium text-violet-700">AI Storefront Generator</p>
        <h1 className="mt-2 text-[28px] font-bold leading-tight">Your store, ready to share in 2 minutes</h1>
        <p className="mt-2 text-zinc-600">
          Tell us what you do. We&apos;ll suggest what to sell, how to price it in ₹, and write your page. You can change
          everything.
        </p>
      </div>

      <form
        className="mt-6 space-y-6"
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit();
        }}
      >
        <div>
          <label htmlFor="desc" className="block font-medium">
            What do you teach or post about?
          </label>
          <textarea
            id="desc"
            value={input.description}
            maxLength={LIMITS.description}
            onChange={(e) => setInput({ ...input, description: e.target.value })}
            rows={4}
            placeholder="e.g. I'm a CA who explains tax saving and SIPs for first-jobbers. Hinglish is fine!"
            className="mt-2 w-full rounded-xl border border-zinc-300 bg-white p-3 text-base outline-none focus:border-violet-500"
          />
          <div className="mt-1 flex justify-between text-xs text-zinc-500">
            <span>Any language: English, Hindi or Hinglish</span>
            <span className={len > LIMITS.description - 50 ? "text-amber-700" : ""}>
              {len}/{LIMITS.description}
            </span>
          </div>
          <div className="mt-3">
            <p className="text-xs text-zinc-500 mb-2">Or tap an example to try:</p>
            <div className="flex flex-wrap gap-2">
              {EXAMPLES.map((ex) => (
                <button
                  type="button"
                  key={ex.label}
                  onClick={() => setInput(ex.input)}
                  className="h-9 px-3 rounded-full bg-violet-50 text-violet-800 text-sm"
                >
                  {ex.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div>
          <label htmlFor="handle" className="block font-medium">
            Instagram handle <span className="font-normal text-zinc-500">(optional)</span>
          </label>
          <div className="mt-2 flex items-center rounded-xl border border-zinc-300 bg-white focus-within:border-violet-500">
            <span className="pl-3 text-zinc-400">@</span>
            <input
              id="handle"
              value={input.handle.replace(/^@/, "")}
              maxLength={LIMITS.handle + 1}
              onChange={(e) => setInput({ ...input, handle: e.target.value.replace(/\s/g, "") })}
              placeholder="yourname"
              autoCapitalize="none"
              autoCorrect="off"
              className="h-12 flex-1 bg-transparent px-1 text-base outline-none"
            />
          </div>
          {handleBad ? (
            <p className="mt-1 text-xs text-red-600">Handles use only letters, numbers, dots and underscores.</p>
          ) : (
            <p className="mt-1 text-xs text-zinc-500">Used for your name and link. We don&apos;t read your profile.</p>
          )}
        </div>

        <div>
          <p className="font-medium">How many followers do you have?</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {AUDIENCES.map((a) => (
              <Chip key={a} active={input.audience === a} onClick={() => setInput({ ...input, audience: a })}>
                {AUDIENCE_LABELS[a]}
              </Chip>
            ))}
          </div>
          <p className="mt-1 text-xs text-zinc-500">This sets realistic prices for your audience.</p>
        </div>

        <div>
          <p className="font-medium">Write my page in</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {LANGUAGES.map((l) => (
              <Chip key={l} active={input.language === l} onClick={() => setInput({ ...input, language: l })}>
                {LANGUAGE_LABELS[l]}
              </Chip>
            ))}
          </div>
        </div>

        {error && (
          <p role="alert" className="rounded-xl bg-red-50 text-red-800 text-sm px-4 py-3">
            {error}
          </p>
        )}

        <PrimaryButton type="submit" disabled={!!handleBad || (!input.description.trim() && !input.handle.trim())}>
          {error ? "Try again" : "Create my store ✨"}
        </PrimaryButton>
        <p className="text-center text-xs text-zinc-500">Free. No sign-up. Nothing goes live until you publish.</p>
      </form>
    </Shell>
  );
}

function ThemePicker({ value, onChange }: { value: Theme; onChange: (t: Theme) => void }) {
  return (
    <div className="mx-auto max-w-md px-4 pb-2 flex items-center gap-2 text-xs text-zinc-600">
      <span>Style:</span>
      {THEMES.map((t) => (
        <button
          key={t}
          onClick={() => onChange(t)}
          aria-pressed={value === t}
          className={`h-8 pl-1.5 pr-3 rounded-full border flex items-center gap-1.5 ${
            value === t ? "border-zinc-900 bg-zinc-900 text-white" : "border-zinc-300 bg-white"
          }`}
        >
          <span className={`size-5 rounded-full border-4 ${THEME[t].swatch}`} />
          {THEME[t].label}
        </button>
      ))}
    </div>
  );
}

function BottomSheet({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);
  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/40" onClick={onClose}>
      <div
        role="dialog"
        aria-label={title}
        className="w-full max-w-md max-h-[90dvh] overflow-y-auto rounded-t-3xl bg-white text-zinc-900 pb-[env(safe-area-inset-bottom)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-white flex items-center justify-between px-4 py-3 border-b border-zinc-100">
          <p className="font-semibold">{title}</p>
          <button onClick={onClose} className="h-10 px-3 rounded-full bg-zinc-100 text-sm font-medium">
            Done
          </button>
        </div>
        <div className="p-4">{children}</div>
      </div>
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-sm font-medium">{label}</span>
      <div className="mt-1">{children}</div>
      {hint && <span className="mt-1 block text-xs text-zinc-500">{hint}</span>}
    </label>
  );
}

const inputCls = "w-full rounded-xl border border-zinc-300 bg-white px-3 py-2.5 text-base outline-none focus:border-violet-500";

function ProductSheet({
  product,
  audience,
  index,
  canDelete,
  busy,
  warning,
  onChange,
  onRewrite,
  onDelete,
  onClose,
}: {
  product: Product;
  audience: Audience;
  index: number;
  canDelete: boolean;
  busy: boolean;
  warning?: string;
  onChange: (p: Product) => void;
  onRewrite: (instruction?: string) => Promise<void>;
  onDelete: () => void;
  onClose: () => void;
}) {
  const [instruction, setInstruction] = useState("");
  const [min, max] = bandFor(product.format, audience);
  const outOfBand = product.price_inr < min || product.price_inr > max;
  const set = <K extends keyof Product>(k: K, v: Product[K]) => onChange({ ...product, [k]: v });

  return (
    <BottomSheet title={`Product ${index + 1}`} onClose={onClose}>
      <div className={`space-y-4 ${busy ? "opacity-50 pointer-events-none" : ""}`}>
        {warning && <p className="rounded-lg bg-amber-100 text-amber-900 text-sm px-3 py-2">⚠️ {warning}</p>}

        <div className="rounded-2xl bg-violet-50 p-3">
          <p className="text-sm font-medium text-violet-900">✨ Rewrite this product with AI</p>
          <input
            value={instruction}
            maxLength={LIMITS.instruction}
            onChange={(e) => setInstruction(e.target.value)}
            placeholder="Optional: e.g. make it cheaper, or a live workshop"
            className={`${inputCls} mt-2 text-sm`}
          />
          <button
            onClick={() => onRewrite(instruction).then(() => setInstruction(""))}
            className="mt-2 h-11 w-full rounded-xl bg-violet-600 text-white text-sm font-semibold"
          >
            {busy ? "Rewriting…" : "Rewrite with AI"}
          </button>
        </div>

        <Field label="Title">
          <input value={product.title} maxLength={LIMITS.title} onChange={(e) => set("title", e.target.value)} className={inputCls} />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Format">
            <select value={product.format} onChange={(e) => set("format", e.target.value as Format)} className={inputCls}>
              {FORMATS.map((f) => (
                <option key={f} value={f}>
                  {FORMAT_LABELS[f]}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Price (₹)">
            <input
              type="number"
              inputMode="numeric"
              min={0}
              max={100000}
              value={Number.isFinite(product.price_inr) ? product.price_inr : ""}
              onChange={(e) => set("price_inr", Math.max(0, Math.min(100000, Math.round(Number(e.target.value) || 0))))}
              className={inputCls}
            />
          </Field>
        </div>
        <p className={`-mt-2 text-xs ${outOfBand ? "text-amber-700" : "text-zinc-500"}`}>
          {outOfBand ? "⚠️ " : ""}Typical for {FORMAT_LABELS[product.format].toLowerCase()} at your audience size: {formatINR(min)}–
          {formatINR(max)}
        </p>

        <Field label="One-line hook">
          <input
            value={product.short_line}
            maxLength={LIMITS.shortLine}
            onChange={(e) => set("short_line", e.target.value)}
            className={inputCls}
          />
        </Field>

        <Field label="Description">
          <textarea
            value={product.description}
            maxLength={LIMITS.description_long}
            onChange={(e) => set("description", e.target.value)}
            rows={5}
            className={inputCls}
          />
        </Field>

        <div>
          <p className="text-sm font-medium">What&apos;s included</p>
          <div className="mt-1 space-y-2">
            {product.whats_included.map((item, i) => (
              <div key={i} className="flex gap-2">
                <input
                  value={item}
                  maxLength={LIMITS.included}
                  onChange={(e) => {
                    const next = [...product.whats_included];
                    next[i] = e.target.value;
                    set("whats_included", next);
                  }}
                  className={inputCls}
                />
                <button
                  aria-label="Remove item"
                  onClick={() => set("whats_included", product.whats_included.filter((_, j) => j !== i))}
                  className="h-11 w-11 shrink-0 rounded-xl bg-zinc-100"
                >
                  ✕
                </button>
              </div>
            ))}
            {product.whats_included.length < 8 && (
              <button
                onClick={() => set("whats_included", [...product.whats_included, ""])}
                className="h-10 px-3 rounded-xl bg-zinc-100 text-sm"
              >
                + Add item
              </button>
            )}
          </div>
        </div>

        <Field label="Why this price? (shown to buyers)">
          <EditableText
            label="Why this price"
            value={product.price_rationale}
            maxLength={LIMITS.rationale}
            onChange={(v) => set("price_rationale", v)}
            className="!mx-0 rounded-xl border-solid !border-zinc-300 bg-white px-3 py-2.5 text-base"
          />
        </Field>

        {canDelete && (
          <button onClick={onDelete} className="h-11 w-full rounded-xl text-sm text-red-600 bg-red-50">
            Remove this product
          </button>
        )}
      </div>
    </BottomSheet>
  );
}

function RegenAllSheet({
  input,
  store,
  onClose,
  onConfirm,
}: {
  input: Input;
  store: Store;
  onClose: () => void;
  onConfirm: (lang: Language) => void;
}) {
  const [lang, setLang] = useState<Language>(store.language);
  return (
    <BottomSheet title="Redo the whole page" onClose={onClose}>
      <p className="text-sm text-zinc-600">
        The AI writes a fresh bio and new product ideas. Your style stays the same. You can undo this afterwards.
      </p>
      {!input.description && (
        <p className="mt-2 text-xs text-zinc-500">We&apos;ll use your current bio as the description.</p>
      )}
      <p className="mt-4 text-sm font-medium">Language</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {LANGUAGES.map((l) => (
          <Chip key={l} active={lang === l} onClick={() => setLang(l)}>
            {LANGUAGE_LABELS[l]}
          </Chip>
        ))}
      </div>
      <PrimaryButton onClick={() => onConfirm(lang)}>↻ Redo with AI</PrimaryButton>
    </BottomSheet>
  );
}

function PublishedScreen({
  store,
  published,
  onEdit,
  onNew,
}: {
  store: Store;
  published: Published;
  onEdit: () => void;
  onNew: () => void;
}) {
  // Only ever rendered in the browser (after the creator publishes), so window exists.
  const [origin] = useState(() => (typeof window !== "undefined" ? window.location.origin : ""));
  const [copied, setCopied] = useState<string | null>(null);
  const [stats, setStats] = useState<{ views: number; clicks: number } | null>(null);
  useEffect(() => {
    fetch(`/api/stats/${published.slug}?token=${published.editToken}`)
      .then((r) => r.json())
      .then((d) => d.ok && setStats({ views: d.views, clicks: d.clicks }))
      .catch(() => {});
  }, [published]);

  const url = `${origin}/s/${published.slug}`;
  const editUrl = `${origin}/edit/${published.slug}?token=${published.editToken}`;
  const shareText = `Check out my store: ${store.tagline || store.display_name}`;

  const copy = async (text: string, what: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(what);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      prompt("Copy this link:", text);
    }
  };

  return (
    <Shell>
      <div className="pt-10 text-center">
        <div className="mx-auto size-16 rounded-full bg-green-100 grid place-items-center text-3xl">🎉</div>
        <h1 className="mt-4 text-2xl font-bold">Your store is live!</h1>
        <p className="mt-1 text-zinc-600">Share it in your Instagram bio, stories and WhatsApp.</p>
      </div>

      <div className="mt-6 rounded-2xl bg-white border border-zinc-200 p-4">
        <p className="text-xs text-zinc-500">Your link</p>
        <p className="mt-1 font-medium break-all">{url}</p>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <button onClick={() => copy(url, "link")} className="h-12 rounded-xl bg-zinc-900 text-white text-sm font-semibold">
            {copied === "link" ? "Copied ✓" : "Copy link"}
          </button>
          <a
            href={`https://wa.me/?text=${encodeURIComponent(`${shareText} ${url}`)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="h-12 rounded-xl bg-[#25D366] text-white text-sm font-semibold grid place-items-center"
          >
            Share on WhatsApp
          </a>
        </div>
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-2 h-12 rounded-xl bg-violet-600 text-white text-sm font-semibold grid place-items-center"
        >
          Open my store ↗
        </a>
      </div>

      <div className="mt-4 rounded-2xl bg-white border border-zinc-200 p-4">
        <p className="font-medium">Your page so far</p>
        <div className="mt-2 grid grid-cols-2 gap-2 text-center">
          <div className="rounded-xl bg-zinc-50 py-3">
            <p className="text-2xl font-bold">{stats?.views ?? "–"}</p>
            <p className="text-xs text-zinc-500">page views</p>
          </div>
          <div className="rounded-xl bg-zinc-50 py-3">
            <p className="text-2xl font-bold">{stats?.clicks ?? "–"}</p>
            <p className="text-xs text-zinc-500">product taps</p>
          </div>
        </div>
      </div>

      <div className="mt-4 rounded-2xl bg-amber-50 border border-amber-200 p-4">
        <p className="font-medium text-amber-900">Save your private edit link</p>
        <p className="mt-1 text-sm text-amber-900/80">
          There&apos;s no login. This link lets you edit your store from any phone, so keep it safe and don&apos;t share it.
        </p>
        <button onClick={() => copy(editUrl, "edit")} className="mt-3 h-11 w-full rounded-xl bg-amber-200 text-amber-950 text-sm font-semibold">
          {copied === "edit" ? "Copied ✓" : "Copy my edit link"}
        </button>
      </div>

      <button onClick={onEdit} className="mt-4 h-12 w-full rounded-xl bg-zinc-100 font-medium">
        ✏️ Keep editing
      </button>
      <button onClick={onNew} className="mt-2 h-11 w-full text-sm text-zinc-500">
        Create another store
      </button>
    </Shell>
  );
}
