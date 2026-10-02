"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { AutoField, parseMoney } from "@/components/admin/autosave";
import { useToast } from "@/components/admin/toast";
import { Badge, btnDark, btnGreen, statePill, tabPill } from "@/components/admin/ui";
import { cx as cn } from "@/components/admin/cx";
import { lexicon } from "@/lib/data/content";
import { formatNumber } from "@/lib/format";
import {
  createProduct,
  setProductFeatured,
  setProductHidden,
  setStockOverride,
  updateProductPrice,
} from "@/lib/server/actions/products";
import type { AdminCategory, AdminProduct } from "@/lib/server/admin-queries";
import { CategoriesManager } from "./categories-manager";
import { ProductModal } from "./product-modal";
import { isOut, productPhoto, stockToggle } from "./product-utils";

/**
 * Productos, con sus dos vistas: Catálogo (filtros, búsqueda, edición
 * rápida en la fila y editor completo) y Categorías.
 */
export function ProductsManager({
  products,
  categories,
  brandNames,
  initialOpen,
  initialView,
}: {
  products: AdminProduct[];
  categories: AdminCategory[];
  brandNames: string[];
  initialOpen: string | null;
  initialView: "list" | "cats";
}) {
  const router = useRouter();
  const toast = useToast();
  const [view, setView] = useState(initialView);
  const [catTab, setCatTab] = useState("");
  const [q, setQ] = useState("");
  const [openId, setOpenId] = useState<string | null>(initialOpen);
  const [pending, startTransition] = useTransition();

  const list = useMemo(() => {
    let r = products;
    if (catTab) r = r.filter((p) => p.category === catTab);
    if (q.trim()) {
      const needle = q.trim().toLowerCase();
      r = r.filter((p) => `${p.name} ${p.brandName}`.toLowerCase().includes(needle));
    }
    return r;
  }, [products, catTab, q]);

  const open = openId ? products.find((p) => p.id === openId) : undefined;

  function openEditor(id: string | null) {
    setOpenId(id);
    // El ?editar= de los accesos rápidos no debe reabrir el modal al cerrar.
    if (!id && initialOpen) router.replace("/admin/productos");
  }

  function addProduct() {
    startTransition(async () => {
      const res = await createProduct(catTab || null);
      if (!res.ok) return toast(res.error);
      setQ("");
      setOpenId(res.id);
      toast(lexicon.admin.productCreated);
    });
  }

  return (
    <div className="animate-fade-in">
      <div className="mb-[18px] flex flex-wrap gap-2">
        {(
          [
            ["list", "Catálogo"],
            ["cats", "Categorías"],
          ] as const
        ).map(([k, label]) => (
          <button key={k} type="button" onClick={() => setView(k)} className={tabPill(view === k)}>
            {label}
          </button>
        ))}
      </div>

      {view === "cats" ? (
        <CategoriesManager categories={categories} products={products} />
      ) : (
        <div>
          <div className="mb-[14px] flex flex-wrap items-center gap-2">
            {[{ slug: "", label: "Todos" }, ...categories].map((c) => (
              <button
                key={c.slug || "all"}
                type="button"
                onClick={() => setCatTab(c.slug)}
                className={cn(
                  tabPill(catTab === c.slug),
                  "px-[17px] py-[9px]",
                  catTab !== c.slug && "text-ink/60 hover:text-ink",
                )}
              >
                {c.label}
              </button>
            ))}
            <span className="flex-1" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar producto…"
              aria-label="Buscar producto"
              className="box-border min-w-[190px] rounded-full border-[1.5px] border-ink/15 bg-white px-[18px] py-[10px] font-sans text-[13px] outline-none focus:border-brand max-[859px]:min-h-11 max-[859px]:flex-1"
            />
            <button type="button" disabled={pending} onClick={addProduct} className={btnDark}>
              + {lexicon.admin.newProduct}
            </button>
          </div>
          <div className="mb-[14px] font-sans text-[12.5px] text-ink/50">
            {list.length} productos · tocá uno para abrir el editor completo
          </div>

          <div className="flex flex-col gap-[10px]">
            {list.map((p) => (
              <ProductRow key={p.id} product={p} onOpen={() => openEditor(p.id)} />
            ))}
          </div>
        </div>
      )}

      {open && (
        <ProductModal
          product={open}
          categories={categories}
          brandNames={brandNames}
          onOpen={(id) => setOpenId(id)}
          onClose={() => openEditor(null)}
        />
      )}
    </div>
  );
}

function ProductRow({ product: p, onOpen }: { product: AdminProduct; onOpen: () => void }) {
  const toast = useToast();
  const [pending, startTransition] = useTransition();
  const out = isOut(p);

  function run(fn: () => Promise<unknown>, msg: string) {
    startTransition(async () => {
      await fn();
      toast(msg);
    });
  }

  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-[14px] rounded-2xl border-[1.5px] bg-white px-4 py-3 transition-[border-color,box-shadow] hover:border-brand hover:shadow-[0_10px_26px_rgba(21,23,15,.08)]",
        p.edited ? "border-brand/45" : "border-ink/10",
      )}
    >
      <button
        type="button"
        onClick={onOpen}
        className="flex min-w-[240px] flex-1 items-center gap-[14px] text-left text-ink transition-colors hover:text-brand-deep"
      >
        <div
          className="box-border flex h-[52px] w-[62px] flex-none items-center justify-center rounded-[10px] p-[5px]"
          style={{ background: "repeating-linear-gradient(-45deg,#f7f6f1 0 10px,#efeee7 10px 20px)" }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={productPhoto(p.images, 160)}
            alt={p.name}
            loading="lazy"
            className="max-h-full max-w-full object-contain mix-blend-multiply"
          />
        </div>
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-display text-[15px] font-extrabold tracking-normal">{p.name}</span>
            {p.edited && <Badge>EDITADO</Badge>}
            {p.custom && <Badge dark>CARGADO</Badge>}
          </div>
          <div className="font-sans text-[11.5px] text-ink/50">
            {p.brandName} · {p.categoryLabel}
          </div>
        </div>
      </button>
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-[6px] rounded-[10px] border-[1.5px] border-ink/12 bg-cream-3 px-3 py-[7px] max-[859px]:min-h-11">
          <span className="font-sans text-[13px] font-bold text-ink/45">$</span>
          <AutoField<number | null>
            key={p.id}
            initial={p.price != null ? formatNumber(p.price) : ""}
            transform={parseMoney}
            onSave={(v) => updateProductPrice(p.id, v)}
            onSaved={(v) =>
              toast(v == null ? `${p.name}: precio a consultar` : `Precio de ${p.name} actualizado`)
            }
            placeholder="a consultar"
            inputMode="numeric"
            aria-label={`Precio de ${p.name}`}
            className="w-[110px] border-none bg-transparent font-sans text-[13.5px] font-bold outline-none placeholder:font-normal placeholder:text-ink/50"
          />
        </div>
        <button
          type="button"
          disabled={pending}
          onClick={() => {
            const t = stockToggle(p);
            if (t.next === null) return toast(t.message);
            run(() => setStockOverride(p.id, t.next), t.message);
          }}
          className={statePill(
            out
              ? "border-danger/50 bg-danger-bg text-danger hover:text-ink"
              : "border-brand/50 bg-brand-pastel text-brand-deeper hover:text-ink",
          )}
        >
          {out ? "SIN STOCK" : "EN STOCK"}
        </button>
        <button
          type="button"
          disabled={pending}
          title="Destacado en el home"
          onClick={() =>
            run(
              () => setProductFeatured(p.id, !p.featured),
              p.featured ? `${p.name} sale de Destacados` : `${p.name} ahora está en Destacados`,
            )
          }
          className={statePill(
            cn(
              "px-3",
              p.featured ? "border-brand bg-night text-brand" : "border-ink/18 bg-white text-ink/45",
            ),
          )}
        >
          {p.featured ? "★ DESTACADO" : "☆"}
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() =>
            run(
              () => setProductHidden(p.id, !p.hidden),
              p.hidden ? `${p.name}: publicado en la web` : `${p.name}: oculto de la web`,
            )
          }
          className={statePill(
            p.hidden
              ? "border-ink/35 bg-ink text-cream"
              : "border-ink/18 bg-white text-ink/55 hover:text-ink",
          )}
        >
          {p.hidden ? "OCULTO" : "VISIBLE"}
        </button>
        <button type="button" onClick={onOpen} className={btnGreen}>
          Editar
        </button>
      </div>
    </div>
  );
}
