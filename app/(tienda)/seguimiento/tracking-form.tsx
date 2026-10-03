"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  darkField,
  darkKicker,
  darkLabel,
  darkPanel,
} from "@/components/store/form-styles";
import { lexicon } from "@/lib/data/content";

const t = lexicon.commerce.tracking;

/**
 * Búsqueda de pedido (número + email) en la tarjeta oscura del formulario
 * de Reparaciones. La usan /seguimiento y "Mis pedidos" (`toAccount`).
 */
export function TrackingForm({ toAccount }: { toAccount?: boolean }) {
  const router = useRouter();
  const [number, setNumber] = useState("");
  const [email, setEmail] = useState("");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!number.trim() || !email.trim()) return;
    const q = `?e=${encodeURIComponent(email.trim())}`;
    router.push(
      toAccount
        ? `/cuenta${q}&n=${encodeURIComponent(number.trim())}`
        : `/seguimiento/${encodeURIComponent(number.trim())}${q}`,
    );
  }

  return (
    <form onSubmit={submit} className={`${darkPanel} flex flex-col`}>
      <div className={darkKicker}>{t.formKicker}</div>
      <h2 className="font-display mb-0 mt-[10px] text-[26px] tracking-[-.01em]">
        {t.formTitle}
      </h2>
      <label className="mt-[22px] block" htmlFor="trk-numero">
        <span className={darkLabel}>{t.number}</span>
      </label>
      <input
        id="trk-numero"
        className={darkField}
        placeholder={t.numberPh}
        value={number}
        onChange={(e) => setNumber(e.target.value)}
        inputMode="numeric"
        autoComplete="off"
        required
      />
      <label className="mt-[18px] block" htmlFor="trk-email">
        <span className={darkLabel}>{t.email}</span>
      </label>
      <input
        id="trk-email"
        className={darkField}
        type="email"
        placeholder={t.emailPh}
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        autoComplete="email"
        required
      />
      <button
        type="submit"
        className="mt-5 rounded-full bg-brand p-4 text-center font-sans text-[15px] font-bold text-night hover:bg-brand-hover"
      >
        {toAccount ? t.submitAccount : t.submit}
      </button>
      <div className="mt-[10px] text-center font-sans text-[11.5px] text-cream/50">
        {t.formNote}
      </div>
    </form>
  );
}
