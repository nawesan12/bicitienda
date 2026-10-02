"use client";

import { useState, useTransition } from "react";
import { lexicon } from "@/lib/data/content";
import { requestStockAlert } from "@/lib/server/actions/stock-alerts";

/**
 * "Avisame cuando vuelva": mini-form de email en la ficha sin stock.
 * Cuando el admin repone y dispara el aviso, llega un único email.
 */
export function StockAlertForm({ slug }: { slug: string }) {
  const [email, setEmail] = useState("");
  const [done, setDone] = useState(false);
  const [pending, startTransition] = useTransition();

  function submit() {
    if (!email.includes("@")) return;
    startTransition(async () => {
      const res = await requestStockAlert(slug, email);
      if (res.ok) setDone(true);
    });
  }

  if (done) {
    return (
      <div className="mt-3 rounded-[14px] border-[1.5px] border-brand/40 bg-brand-pastel/50 px-4 py-3 font-sans text-[13px] font-semibold text-brand-deeper">
        ¡Listo! Te escribimos apenas vuelva a haber stock.
      </div>
    );
  }

  return (
    <form
      className="mt-3 flex flex-wrap gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="tu@email.com"
        className="box-border min-w-[180px] flex-1 rounded-full border-[1.5px] border-ink/15 bg-white px-[18px] py-3 font-sans text-[13.5px] text-ink outline-none placeholder:text-ink/35 focus:border-brand"
      />
      <button
        type="submit"
        disabled={pending || !email.includes("@")}
        className="rounded-full bg-brand px-5 py-3 font-sans text-[13px] font-bold text-night hover:bg-brand-hover disabled:opacity-50"
      >
        {pending ? "Anotando…" : lexicon.product.stockAlert}
      </button>
    </form>
  );
}
