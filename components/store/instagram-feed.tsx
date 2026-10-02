"use client";

import { useEffect, useState } from "react";
import type { InstagramMedia } from "@/lib/server/instagram";

/** Ruta del feed (app/api/instagram/route.ts, estática con ISR de 1 h). */
const FEED_URL = "/api/instagram";

/**
 * Grilla de Instagram de la home. Arranca con los placeholders del handoff
 * (igSlots) y, si el JSON cacheado trae posts, los reemplaza. Va en el
 * cliente para que el feed (1 h) no fije la frecuencia de regeneración de
 * la home entera.
 */
export function InstagramFeed({
  slots,
  altFallback,
}: {
  slots: readonly string[];
  altFallback: string;
}) {
  const [items, setItems] = useState<InstagramMedia[] | null>(null);

  useEffect(() => {
    const ctrl = new AbortController();
    fetch(FEED_URL, { signal: ctrl.signal })
      .then((r) => (r.ok ? r.json() : null))
      .then((json: { items: InstagramMedia[] | null } | null) => {
        if (json?.items?.length) setItems(json.items);
      })
      .catch(() => {
        /* sin feed: quedan los placeholders */
      });
    return () => ctrl.abort();
  }, []);

  return (
    <div className="mt-[22px] grid grid-cols-[repeat(auto-fill,minmax(min(160px,100%),1fr))] gap-3">
      {items
        ? items.map((m) => (
            <a
              key={m.id}
              href={m.permalink}
              target="_blank"
              rel="noopener"
              className="relative block aspect-square overflow-hidden rounded-[14px] border border-ink/[.08]"
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- CDN de Instagram */}
              <img
                src={m.imageUrl}
                alt={m.caption.slice(0, 120) || altFallback}
                loading="lazy"
                className="absolute inset-0 h-full w-full object-cover"
              />
            </a>
          ))
        : slots.map((g) => (
            <div
              key={g}
              className="stripes-slot flex aspect-square items-center justify-center rounded-[14px] border border-ink/[.08]"
            >
              <span className="text-center font-mono text-[10.5px] font-medium tracking-[.08em] text-ink/40">
                {g}
              </span>
            </div>
          ))}
    </div>
  );
}
