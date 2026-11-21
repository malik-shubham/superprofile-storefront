"use client";

// Layer 0 placeholder page. Proves the site is live and can make a real AI call.
import { useState } from "react";

export default function Home() {
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [text, setText] = useState("");

  async function testAI() {
    setStatus("loading");
    try {
      const res = await fetch("/api/hello");
      const data = await res.json();
      if (data.ok) {
        setText(data.text);
        setStatus("done");
      } else {
        setText(data.error ?? "Something went wrong.");
        setStatus("error");
      }
    } catch {
      setText("Could not reach the server. Check your connection and try again.");
      setStatus("error");
    }
  }

  return (
    <main className="min-h-dvh flex flex-col items-center justify-center gap-6 px-4 py-12 bg-white text-zinc-900">
      <h1 className="text-2xl font-semibold text-center">AI Storefront Generator</h1>
      <p className="text-zinc-600 text-center max-w-sm">
        Coming soon. Tap the button to check the AI connection.
      </p>
      <button
        onClick={testAI}
        disabled={status === "loading"}
        className="h-12 px-6 rounded-xl bg-violet-600 text-white font-medium disabled:opacity-60"
      >
        {status === "loading" ? "Asking the AI..." : "Test AI"}
      </button>
      {text && (
        <p
          className={`max-w-sm text-center rounded-xl p-4 ${
            status === "error" ? "bg-red-50 text-red-700" : "bg-violet-50 text-violet-900"
          }`}
        >
          {text}
        </p>
      )}
    </main>
  );
}
