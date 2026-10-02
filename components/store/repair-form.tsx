"use client";

import { useState } from "react";
import { WaLink } from "@/components/store/wa-link";
import { lexicon } from "@/lib/data/content";
import { wa } from "@/lib/whatsapp";

const label =
  "font-sans text-[10.5px] font-bold tracking-[.18em] text-cream/50";
const field =
  "box-border mt-2 w-full rounded-xl border border-white/[.16] bg-white/[.07] px-4 py-[13px] text-[14px] text-cream outline-none placeholder:text-[#757575]";

/**
 * Formulario "Pedí tu diagnóstico": tipo de vehículo (pills), marca y
 * modelo, y el problema. El botón abre WhatsApp con el mensaje armado
 * (`repMsg` del prototipo) y registra la consulta de reparación.
 */
export function RepairForm({ whatsapp }: { whatsapp: string }) {
  const { types } = lexicon.repairs;
  const [tipo, setTipo] = useState(types[0]);
  const [modelo, setModelo] = useState("");
  const [problema, setProblema] = useState("");
  const ctx = wa.repairForm({ tipo, modelo, problema });

  return (
    <div className="bg-grid-dark sticky top-24 flex flex-col rounded-[24px] bg-night p-[clamp(24px,3vw,34px)] text-cream [--grid-size:36px]">
      <div className="font-sans text-[11px] font-bold tracking-[.26em] text-brand">
        {lexicon.repairs.formKicker}
      </div>
      <h3 className="font-display mb-0 mt-[10px] text-[26px] tracking-[-.01em]">
        {lexicon.repairs.formTitle}
      </h3>
      <div className={`${label} mt-[22px]`}>{lexicon.repairs.typeLabel}</div>
      <div className="mt-2 flex flex-wrap gap-2">
        {types.map((t) => (
          <button
            key={t}
            type="button"
            aria-pressed={tipo === t}
            onClick={() => setTipo(t)}
            className={`hit relative rounded-full border-[1.5px] px-4 py-[10px] font-sans text-[13px] font-bold hover:border-brand ${
              tipo === t
                ? "border-brand bg-brand text-night"
                : "border-white/20 bg-transparent text-cream/80"
            }`}
          >
            {t}
          </button>
        ))}
      </div>
      <label className={`${label} mt-[18px]`} htmlFor="rep-modelo">
        {lexicon.repairs.modelLabel}
      </label>
      <input
        id="rep-modelo"
        value={modelo}
        onChange={(e) => setModelo(e.target.value)}
        placeholder={lexicon.repairs.modelPlaceholder}
        className={field}
      />
      <label className={`${label} mt-[18px]`} htmlFor="rep-problema">
        {lexicon.repairs.problemLabel}
      </label>
      <textarea
        id="rep-problema"
        rows={4}
        value={problema}
        onChange={(e) => setProblema(e.target.value)}
        placeholder={lexicon.repairs.problemPlaceholder}
        className={`${field} resize-y leading-[1.55]`}
      />
      <WaLink
        whatsapp={whatsapp}
        {...ctx}
        className="mt-5 block rounded-full bg-brand p-4 text-center font-sans text-[15px] font-bold text-night hover:bg-brand-hover"
      >
        {lexicon.repairs.send}
      </WaLink>
      <div className="mt-[10px] text-center font-sans text-[11.5px] text-cream/50">
        {lexicon.repairs.sendNote}
      </div>
    </div>
  );
}
