"use client";

import { useTransition } from "react";
import { AutoField } from "@/components/admin/autosave";
import { useConfirm } from "@/components/admin/confirm";
import { useToast } from "@/components/admin/toast";
import {
  btnDark,
  btnGhost,
  inputCls,
  Label,
  Lead as Intro,
  roundBtn,
  statePill,
} from "@/components/admin/ui";
import { cx as cn } from "@/components/admin/cx";
import { lexicon } from "@/lib/data/content";
import {
  createCategory,
  deleteCategory,
  moveCategory,
  patchCategory,
  resetCategories,
} from "@/lib/server/actions/categories";
import type { AdminCategory, AdminProduct } from "@/lib/server/admin-queries";
import { NO_PHOTO, productPhoto } from "./product-utils";

const field = cn(inputCls(), "px-3 py-[10px]");

/**
 * Categorías: arman los filtros, las tarjetas del home y el pie. Nombre,
 * etiqueta, subtítulo, foto (eligiendo un modelo), si aparece en el home,
 * orden ↑↓ y baja (bloqueada mientras tenga modelos).
 */
export function CategoriesManager({
  categories,
  products,
}: {
  categories: AdminCategory[];
  products: AdminProduct[];
}) {
  const toast = useToast();
  const confirm = useConfirm();
  const [pending, startTransition] = useTransition();

  const countLabel = (n: number) => `${n} ${n === 1 ? lexicon.unit : lexicon.unitPlural}`;

  async function askReset() {
    const ok = await confirm({
      icon: "↺",
      title: "Restaurar categorías",
      message: `Vuelven las categorías originales. Los ${lexicon.unitPlural} de categorías nuevas pasan a su categoría original o a la primera.`,
      label: "Sí, restaurar",
      destructive: true,
    });
    if (!ok) return;
    startTransition(async () => {
      await resetCategories();
      toast("Categorías restauradas");
    });
  }

  async function askDelete(c: AdminCategory) {
    if (c.count > 0) {
      toast(`Primero mové sus ${countLabel(c.count)} a otra categoría`);
      return;
    }
    const ok = await confirm({
      icon: "✕",
      title: "Eliminar categoría",
      message: `“${c.label}” sale de los filtros, el home y el pie.`,
      label: "Sí, eliminar",
      destructive: true,
    });
    if (!ok) return;
    startTransition(async () => {
      const res = await deleteCategory(c.slug);
      toast(res.ok ? "Categoría eliminada" : res.error);
    });
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <Intro>
          Las categorías arman los filtros del catálogo, las tarjetas del home y los
          links del pie. El orden de acá es el orden en la web.
        </Intro>
        <button
          type="button"
          disabled={pending}
          className={btnDark}
          onClick={() =>
            startTransition(async () => {
              const res = await createCategory();
              toast(res.ok ? "Categoría creada" : res.error);
            })
          }
        >
          + Nueva categoría
        </button>
      </div>

      <div className="grid gap-[14px] [grid-template-columns:repeat(auto-fit,minmax(min(360px,100%),1fr))]">
        {categories.map((c, i) => {
          const prods = products.filter((p) => p.category === c.slug);
          const pick = prods.find((p) => p.id === c.imgProductId) ?? prods[0];
          const imgSrc = pick ? productPhoto(pick.images, 300) : NO_PHOTO;
          return (
            <div
              key={c.slug}
              className="flex flex-col gap-3 rounded-[18px] border border-ink/10 bg-white p-5"
            >
              <div className="grid grid-cols-[110px_minmax(0,1fr)] items-start gap-[14px]">
                <div className="relative aspect-[4/3] rounded-xl bg-cream-4">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={imgSrc}
                    alt={c.label}
                    className="absolute inset-[6px] h-[calc(100%-12px)] w-[calc(100%-12px)] object-contain mix-blend-multiply"
                  />
                </div>
                <div className="flex flex-col gap-[6px]">
                  <Label>NOMBRE (FILTROS Y HOME)</Label>
                  <AutoField
                    initial={c.label}
                    onSave={(v) => (v.trim() ? patchCategory(c.slug, { label: v }) : Promise.resolve())}
                    className={cn(field, "text-sm font-bold")}
                  />
                  <Label className="mt-1">ETIQUETA EN TARJETAS</Label>
                  <AutoField
                    initial={c.single}
                    transform={(v) => v.toUpperCase()}
                    onSave={(v) => patchCategory(c.slug, { single: v })}
                    className={cn(field, "text-[12.5px] uppercase tracking-[.12em]")}
                  />
                </div>
              </div>
              <Label>SUBTÍTULO EN EL HOME (VACÍO = CANTIDAD DE MODELOS)</Label>
              <AutoField
                initial={c.sub}
                onSave={(v) => patchCategory(c.slug, { sub: v })}
                placeholder={countLabel(c.count)}
                className={field}
              />
              <Label>FOTO DE LA TARJETA DEL HOME</Label>
              <select
                value={c.imgProductId && prods.some((p) => p.id === c.imgProductId) ? c.imgProductId : ""}
                onChange={(e) =>
                  startTransition(async () => {
                    await patchCategory(c.slug, { imgProductId: e.target.value || null });
                  })
                }
                className={cn(field, "font-sans text-[13px] font-semibold")}
              >
                <option value="">Automática</option>
                {prods.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  disabled={pending}
                  onClick={() =>
                    startTransition(async () => {
                      await patchCategory(c.slug, { home: !c.home });
                      toast(c.home ? `${c.label} sale del home` : `${c.label} vuelve al home`);
                    })
                  }
                  className={statePill(
                    c.home
                      ? "border-brand bg-brand-pastel text-brand-deeper"
                      : "border-ink/18 bg-white text-ink/50",
                  )}
                >
                  {c.home ? "✓ EN EL HOME" : "OCULTA DEL HOME"}
                </button>
                <span className="font-sans text-xs font-semibold text-ink/50">
                  {countLabel(c.count)}
                </span>
                <span className="flex-1" />
                <button
                  type="button"
                  title="Subir"
                  aria-label="Subir"
                  disabled={pending || i === 0}
                  onClick={() => startTransition(async () => void (await moveCategory(c.slug, -1)))}
                  className={roundBtn()}
                >
                  ↑
                </button>
                <button
                  type="button"
                  title="Bajar"
                  aria-label="Bajar"
                  disabled={pending || i === categories.length - 1}
                  onClick={() => startTransition(async () => void (await moveCategory(c.slug, 1)))}
                  className={roundBtn()}
                >
                  ↓
                </button>
                <button
                  type="button"
                  title="Eliminar"
                  aria-label="Eliminar"
                  onClick={() => askDelete(c)}
                  className={roundBtn(true)}
                >
                  ✕
                </button>
              </div>
            </div>
          );
        })}
      </div>
      <div className="mt-4">
        <button type="button" onClick={askReset} className={btnGhost}>
          ↺ Restaurar categorías originales
        </button>
      </div>
    </div>
  );
}
