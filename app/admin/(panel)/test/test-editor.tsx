"use client";

import { useState, useTransition } from "react";
import { useDebouncedSave } from "@/components/admin/autosave";
import { useConfirm } from "@/components/admin/confirm";
import { useToast } from "@/components/admin/toast";
import { btnGhost, inputCls, Lead as Intro } from "@/components/admin/ui";
import { cx as cn } from "@/components/admin/cx";
import { TEST_PROFILE_INFO } from "@/lib/advisor";
import { patchContent, resetTest } from "@/lib/server/actions/content";
import type { TestPick } from "@/lib/types";
import { productPhoto } from "../productos/product-utils";

interface Option {
  id: string;
  name: string;
  images: string[];
}

/**
 * Test "¿Cuál es para mí?": las 11 tarjetas de perfil, cada una con el
 * modelo que recomienda y el porqué.
 */
export function TestEditor({
  picks,
  products,
}: {
  picks: Record<string, TestPick>;
  products: Option[];
}) {
  const toast = useToast();
  const confirm = useConfirm();
  const [, startTransition] = useTransition();
  // Tras restaurar, las tarjetas se rearman desde el seed.
  const [revision, setRevision] = useState(0);

  async function askReset() {
    const ok = await confirm({
      icon: "↺",
      title: "Restaurar el test",
      message: "Las 11 recomendaciones vuelven a los modelos y textos originales.",
      label: "Sí, restaurar",
      destructive: true,
    });
    if (!ok) return;
    startTransition(async () => {
      await resetTest();
      setRevision((r) => r + 1);
      toast("Test restaurado");
    });
  }

  return (
    <div className="animate-fade-in">
      <div className="mb-[18px] flex flex-wrap items-center justify-between gap-3">
        <Intro className="max-w-[62ch]">
          El test hace 3 preguntas (uso, distancia y presupuesto) y cada combinación
          cae en uno de estos perfiles. Elegí qué modelo recomendar en cada caso y con
          qué argumento.
        </Intro>
        <button type="button" onClick={askReset} className={btnGhost}>
          ↺ Restaurar originales
        </button>
      </div>
      <div
        key={revision}
        className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(min(360px,100%),1fr))]"
      >
        {TEST_PROFILE_INFO.map(([key, label, desc]) => (
          <ProfileCard
            key={key}
            profile={key}
            label={label}
            desc={desc}
            pick={picks[key] ?? { id: "", why: "" }}
            products={products}
          />
        ))}
      </div>
    </div>
  );
}

function ProfileCard({
  profile,
  label,
  desc,
  pick,
  products,
}: {
  profile: string;
  label: string;
  desc: string;
  pick: TestPick;
  products: Option[];
}) {
  const toast = useToast();
  const [id, setId] = useState(pick.id);
  const [why, setWhy] = useState(pick.why);
  const { schedule, flush } = useDebouncedSave<TestPick>((v) =>
    patchContent({ test: { [profile]: v } }),
  );
  const product = products.find((p) => p.id === id);

  return (
    <div className="grid grid-cols-[86px_minmax(0,1fr)] items-start gap-[14px] rounded-2xl border-[1.5px] border-ink/10 bg-white p-[18px] transition-colors hover:border-brand">
      <div className="relative aspect-square rounded-xl bg-cream-4">
        {product && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={productPhoto(product.images, 200)}
            alt={product.name}
            className="absolute inset-[6px] h-[calc(100%-12px)] w-[calc(100%-12px)] object-contain mix-blend-multiply"
          />
        )}
      </div>
      <div className="flex flex-col gap-2">
        <div>
          <div className="font-sans text-[10px] font-bold tracking-[.16em] text-brand-deep">{label}</div>
          <div className="mt-[2px] font-sans text-[12.5px] font-semibold text-ink/55">{desc}</div>
        </div>
        <select
          value={id}
          aria-label={`Modelo para ${label}`}
          onChange={async (e) => {
            setId(e.target.value);
            const res = await patchContent({ test: { [profile]: { id: e.target.value, why } } });
            toast(res.ok ? "Recomendación actualizada" : res.error);
          }}
          className={cn(inputCls(), "px-3 py-[10px] font-sans text-[13px] font-bold")}
        >
          {!product && <option value={id}>—</option>}
          {products.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
        <textarea
          rows={2}
          value={why}
          placeholder="Por qué se lo recomendamos"
          aria-label="Por qué"
          onChange={(e) => {
            setWhy(e.target.value);
            schedule({ id, why: e.target.value });
          }}
          onBlur={() => void flush()}
          className={cn(inputCls(), "resize-y px-3 py-[10px] text-[13px] leading-[1.5]")}
        />
      </div>
    </div>
  );
}
