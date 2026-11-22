"use client";

// Counts one page view when a public store page opens. Never blocks the page.
import { useEffect } from "react";

export default function TrackView({ slug }: { slug: string }) {
  useEffect(() => {
    const key = `viewed:${slug}`;
    try {
      if (sessionStorage.getItem(key)) return; // one view per visit
      sessionStorage.setItem(key, "1");
    } catch {}
    fetch("/api/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug, event: "view" }),
      keepalive: true,
    }).catch(() => {});
  }, [slug]);
  return null;
}
