"use client";

import { useState, useTransition } from "react";
import {
  AutoField,
  parseMoney,
  useDebouncedSave,
} from "@/components/admin/autosave";
import { useConfirm } from "@/components/admin/confirm";
import { ModalShell } from "@/components/admin/modal-shell";
import { useToast } from "@/components/admin/toast";
import {
  btnDanger,
  btnDark,
  btnGreen,
  btnOutline,
  btnX,
  Hint,
  inputCls,
  Label,
  ToggleRow,
} from "@/components/admin/ui";
import { sendPhoto, FileButton } from "@/components/admin/upload";
import { cx as cn } from "@/components/admin/cx";
import { lexicon } from "@/lib/data/content";
import { discountPercent, formatNumber } from "@/lib/format";
import {
  deleteProduct,
  duplicateProduct,
  patchProduct,
  revertProduct,
  revertProductPhoto,
  setProductHidden,
  setProductPhoto,
  setStockOverride,
  type ProductPatch,
} from "@/lib/server/actions/products";
import type { AdminCategory, AdminProduct } from "@/lib/server/admin-queries";
import {
  COMPARE_KEYS,
  parseSpecs,
  SPEC_KEYS,
  SPEC_PLACEHOLDERS,
} from "@/lib/specs";
import type { Spec } from "@/lib/types";
import { isOut, productPhoto, stockToggle } from "./product-utils";

const TABS = [
  { id: "general", label: "General" },
  { id: "foto", label: "Foto" },
  { id: "specs", label: "Especificaciones" },
  { id: "estado", label: "Estado" },
];

const STD: readonly string[] = SPEC_KEYS;
const KEYF: readonly string[] = COMPARE_KEYS;

/**
 * Editor completo de un producto, fiel al prototipo: General, Foto,
 * Especificaciones y Estado. Todo se guarda solo; "Listo ✓" cierra.
 */
export function ProductModal({
  product: p,
  categories,
  brandNames,
  onOpen,
  onClose,
}: {
  product: AdminProduct;
  categories: AdminCategory[];
  brandNames: string[];
  /** Abre otro producto en el editor (la copia recién duplicada). */
  onOpen: (id: string) => void;
  onClose: () => void;
}) {
  const toast = useToast();
  const confirm = useConfirm();
  const [tab, setTab] = useState("general");
  const [pending, startTransition] = useTransition();
  // Al revertir, los campos se rearman desde el producto original.
  const [revision, setRevision] = useState(0);
  const catLabel = categories.find((c) => c.slug === p.category)?.label ?? "";

  function close() {
    onClose();
    toast("Cambios guardados");
  }

  function duplicate() {
    startTransition(async () => {
      const res = await duplicateProduct(p.id);
      if (!res.ok) return toast(res.error);
      setTab("general");
      onOpen(res.id);
      toast(`Copia creada: ${res.name}`);
    });
  }

  return (
    <ModalShell
      onClose={close}
      tabs={TABS}
      activeTab={tab}
      onTab={setTab}
      footerAlign="end"
      header={
        <>
          <div className="box-border flex h-14 w-[70px] flex-none items-center justify-center rounded-xl bg-cream p-[6px]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={productPhoto(p.images, 160)}
              alt={p.name}
              className="max-h-full max-w-full object-contain mix-blend-multiply"
            />
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate font-display text-[19px] font-extrabold tracking-normal">
              {p.name}
            </div>
            <div className="font-sans text-xs text-cream/55">
              {p.brandName} · {catLabel}
            </div>
          </div>
        </>
      }
      footer={
        <>
          <button type="button" disabled={pending} onClick={duplicate} className={btnOutline}>
            Duplicar
          </button>
          <button type="button" onClick={close} className={cn(btnDark, "px-[30px] py-[13px] text-[13.5px]")}>
            Listo ✓
          </button>
        </>
      }
    >
      <div key={`${p.id}-${revision}`} className="animate-fade-in">
        {tab === "general" && (
          <GeneralTab product={p} categories={categories} brandNames={brandNames} />
        )}
        {tab === "foto" && <PhotoTab product={p} />}
        {tab === "specs" && <SpecsTab product={p} />}
        {tab === "estado" && (
          <StateTab
            product={p}
            onDeleted={onClose}
            onReverted={() => setRevision((r) => r + 1)}
            confirm={confirm}
          />
        )}
      </div>
    </ModalShell>
  );
}

/* ── General ──────────────────────────────────────────────── */

function GeneralTab({
  product: p,
  categories,
  brandNames,
}: {
  product: AdminProduct;
  categories: AdminCategory[];
  brandNames: string[];
}) {
  const toast = useToast();
  const save = (patch: ProductPatch) => patchProduct(p.id, patch);
  const [price, setPrice] = useState(p.price != null ? formatNumber(p.price) : "");
  const [list, setList] = useState(p.oldPrice != null ? formatNumber(p.oldPrice) : "");
  const [chips, setChips] = useState(p.chips);
  const [newChip, setNewChip] = useState("");
  const priceSave = useDebouncedSave<number | null>((v) => save({ price: v }));
  const listSave = useDebouncedSave<number | null>((v) => save({ oldPrice: v }));
  const chipsSave = useDebouncedSave<string[]>((v) => save({ chips: v.filter((c) => c.trim()) }));

  const pn = parseMoney(price);
  const ln = parseMoney(list);
  const off = pn && ln && ln > pn ? `−${discountPercent(pn, ln)}%` : null;
  const listId = `brands-${p.id}`;

  function addChip() {
    const v = newChip.trim();
    if (!v) return;
    const next = [...chips, v];
    setChips(next);
    setNewChip("");
    chipsSave.schedule(next);
    void chipsSave.flush();
    toast(`Pill “${v}” agregada`);
  }

  return (
    <div className="flex flex-col gap-3">
      <Label>NOMBRE</Label>
      <AutoField
        initial={p.name}
        onSave={(v) => (v.trim() ? save({ name: v }) : Promise.resolve())}
        className={cn(inputCls(true), "text-[15px] font-bold")}
      />
      <div className="grid gap-[10px] [grid-template-columns:repeat(auto-fit,minmax(min(200px,100%),1fr))]">
        <div>
          <Label>CATEGORÍA</Label>
          <select
            defaultValue={p.category}
            onChange={async (e) => {
              const res = await save({ category: e.target.value });
              if (!res.ok) toast(res.error);
            }}
            className={cn(inputCls(true), "mt-[6px] w-full font-semibold")}
          >
            {categories.map((c) => (
              <option key={c.slug} value={c.slug}>
                {c.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <Label>MARCA</Label>
          <AutoField
            initial={p.brandName}
            list={listId}
            onSave={(v) => (v.trim() ? save({ brandName: v.trim() }) : Promise.resolve())}
            className={cn(inputCls(true), "mt-[6px] w-full")}
          />
          <datalist id={listId}>
            {brandNames.map((b) => (
              <option key={b} value={b} />
            ))}
          </datalist>
        </div>
      </div>

      <Label>DESCRIPCIÓN (SE MUESTRA EN LA FICHA)</Label>
      <AutoField
        multiline
        rows={4}
        initial={p.description}
        onSave={(v) => save({ description: v })}
        placeholder="Contá para quién es, en qué se destaca y qué incluye."
        className={cn(inputCls(true), "resize-y leading-[1.6]")}
      />

      <Label>PRECIO (VACÍO = A CONSULTAR)</Label>
      <div className="flex items-center gap-2 rounded-[10px] border-[1.5px] border-ink/15 bg-white px-[14px] py-[11px] focus-within:border-brand">
        <span className="font-sans text-sm font-bold text-ink/45">$</span>
        <input
          value={price}
          inputMode="numeric"
          placeholder="a consultar"
          aria-label="Precio"
          onChange={(e) => {
            setPrice(e.target.value);
            priceSave.schedule(parseMoney(e.target.value));
          }}
          onBlur={() => void priceSave.flush()}
          className="min-w-0 flex-1 border-none bg-transparent font-sans text-[15px] font-bold outline-none placeholder:font-normal placeholder:text-ink/50"
        />
      </div>

      <Label>PRECIO ANTERIOR (OPCIONAL — SE MUESTRA TACHADO CON % OFF)</Label>
      <div className="flex items-center gap-2 rounded-[10px] border-[1.5px] border-ink/15 bg-white px-[14px] py-[11px] focus-within:border-brand">
        <span className="font-sans text-sm font-bold text-ink/45">$</span>
        <input
          value={list}
          inputMode="numeric"
          placeholder="sin promo"
          aria-label="Precio anterior"
          onChange={(e) => {
            setList(e.target.value);
            listSave.schedule(parseMoney(e.target.value));
          }}
          onBlur={() => void listSave.flush()}
          className="min-w-0 flex-1 border-none bg-transparent font-sans text-[15px] font-bold outline-none placeholder:font-normal placeholder:text-ink/50"
        />
        {off && (
          <span className="rounded-full bg-brand px-[9px] py-1 font-sans text-[11px] font-bold text-night">
            {off}
          </span>
        )}
      </div>

      <Label>ETIQUETA (BADGE EN LA TARJETA)</Label>
      <AutoField<string | null>
        initial={p.tag ?? ""}
        transform={(v) => v.trim() || null}
        onSave={(v) => save({ tag: v })}
        placeholder="ej: MÁS VENDIDA (vacío = sin badge)"
        className={inputCls(true)}
      />

      <Label>PILLS DEL PRODUCTO (SE VEN EN TARJETAS, HERO Y FICHA)</Label>
      <div className="flex flex-wrap items-center gap-2 rounded-xl border-[1.5px] border-ink/15 bg-white p-[10px]">
        {chips.map((c, i) => (
          <span
            key={i}
            className="inline-flex items-center gap-[6px] rounded-full border border-brand/40 bg-brand-pastel py-[5px] pl-3 pr-[5px] font-sans text-[13px] font-semibold text-night"
          >
            <input
              value={c}
              aria-label={`Pill ${i + 1}`}
              onChange={(e) => {
                const next = chips.map((x, j) => (j === i ? e.target.value : x));
                setChips(next);
                chipsSave.schedule(next);
              }}
              onBlur={() => void chipsSave.flush()}
              className="min-w-[3ch] border-none bg-transparent p-0 font-sans text-[13px] font-semibold text-night outline-none"
              style={{ width: `${Math.max(3, c.length + 1)}ch` }}
            />
            <button
              type="button"
              title="Quitar pill"
              aria-label="Quitar pill"
              onClick={() => {
                const next = chips.filter((_, j) => j !== i);
                setChips(next);
                chipsSave.schedule(next);
                void chipsSave.flush();
                toast("Pill eliminada");
              }}
              className="flex h-[22px] w-[22px] flex-none items-center justify-center rounded-full bg-night/10 font-sans text-[10px] font-bold text-night transition-colors hover:bg-danger hover:text-white"
            >
              ✕
            </button>
          </span>
        ))}
        <input
          value={newChip}
          placeholder="+ Nueva pill y Enter"
          aria-label="Nueva pill"
          onChange={(e) => setNewChip(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addChip();
            }
          }}
          className="min-w-[150px] flex-1 border-none bg-transparent px-[6px] py-[7px] font-sans text-[13px] outline-none"
        />
        <button type="button" onClick={addChip} className={cn(btnGreen, "px-[14px] py-[7px]")}>
          Agregar
        </button>
      </div>
      <div className="font-sans text-[11.5px] text-ink/50">
        Tocá el texto de una pill para editarlo. Recomendado: 3 pills cortas.
      </div>
    </div>
  );
}

/* ── Foto ─────────────────────────────────────────────────── */

function PhotoTab({ product: p }: { product: AdminProduct }) {
  const toast = useToast();
  const confirm = useConfirm();
  const [, startTransition] = useTransition();

  async function askRevert() {
    const ok = await confirm({
      icon: "↺",
      title: p.custom ? "Quitar la foto" : "Volver a la foto del catálogo",
      message: p.custom
        ? `“${p.name}” queda sin foto hasta que subas otra.`
        : `“${p.name}” vuelve a mostrar la foto original del catálogo.`,
      label: p.custom ? "Sí, quitar" : "Sí, volver",
      destructive: true,
    });
    if (!ok) return;
    startTransition(async () => {
      const res = await revertProductPhoto(p.id);
      toast(res.ok ? (p.custom ? "Foto quitada" : "Foto restaurada") : res.error);
    });
  }

  return (
    <div className="flex flex-col gap-[14px]">
      <div className="relative aspect-[4/3] rounded-2xl border border-ink/10 bg-white">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={productPhoto(p.images, 900)}
          alt={p.name}
          className="absolute inset-4 h-[calc(100%-32px)] w-[calc(100%-32px)] object-contain mix-blend-multiply"
        />
      </div>
      <div className="flex flex-wrap items-center gap-[10px]">
        <FileButton
          label={p.customImage || p.custom ? "Cambiar foto" : "Subir foto nueva"}
          className={btnDark}
          onFile={async (file) => {
            const res = await sendPhoto(file, "product", (fd) => setProductPhoto(p.id, fd));
            toast(res.ok ? `Foto de ${p.name} actualizada` : res.error);
          }}
        />
        {p.customImage && (
          <button type="button" onClick={askRevert} className={btnDanger}>
            {p.custom ? "Quitar foto" : "Volver a la foto del catálogo"}
          </button>
        )}
      </div>
      <Hint>{lexicon.admin.productPhotoHint}</Hint>
    </div>
  );
}

/* ── Especificaciones ─────────────────────────────────────── */

function splitSpecs(specs: Spec[]) {
  const std: Record<string, string> = {};
  for (const s of specs) if (STD.includes(s.label) && !(s.label in std)) std[s.label] = s.value;
  return { std, extras: specs.filter((s) => !STD.includes(s.label)) };
}

function SpecsTab({ product: p }: { product: AdminProduct }) {
  const toast = useToast();
  const initial = splitSpecs(p.specs);
  const [std, setStd] = useState(initial.std);
  const [extras, setExtras] = useState(initial.extras);
  const [bulk, setBulk] = useState<string | null>(null);
  const specsSave = useDebouncedSave<Spec[]>((specs) => patchProduct(p.id, { specs }));

  const build = (s: Record<string, string>, ex: Spec[]): Spec[] => [
    ...STD.filter((k) => s[k]?.trim()).map((k) => ({ label: k, value: s[k].trim() })),
    ...ex,
  ];

  function update(s: Record<string, string>, ex: Spec[], now = false) {
    setStd(s);
    setExtras(ex);
    specsSave.schedule(build(s, ex));
    if (now) void specsSave.flush();
  }

  const specsStr = build(std, extras)
    .filter((s) => s.label && s.value)
    .map((s) => `${s.label}: ${s.value}`)
    .join("\n");

  return (
    <div className="flex flex-col gap-[14px]">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="max-w-[52ch] font-sans text-[12.5px] leading-[1.6] text-ink/55">
          Completá lo que aplique — los campos vacíos no se muestran. Los marcados{" "}
          <span className="font-bold text-brand-deeper">● COMPARADOR</span> alimentan las
          barras del comparador.
        </div>
        <button
          type="button"
          onClick={() => setBulk(bulk !== null ? null : specsStr)}
          className={cn(btnOutline, "px-[14px] py-2 text-xs")}
        >
          {bulk !== null ? "Cerrar pegado" : "Pegar ficha completa"}
        </button>
      </div>

      {bulk !== null && (
        <div className="flex flex-col gap-[10px] rounded-[14px] bg-night p-4">
          <div className="font-sans text-[10.5px] font-bold tracking-[.18em] text-brand">
            PEGAR FICHA COMPLETA — UNA SPEC POR LÍNEA, &quot;ETIQUETA: VALOR&quot;
          </div>
          <textarea
            rows={10}
            value={bulk}
            onChange={(e) => setBulk(e.target.value)}
            aria-label="Ficha completa"
            className="box-border resize-y rounded-[10px] border border-white/16 bg-white/6 px-[14px] py-3 font-sans text-[13px] leading-[1.7] text-cream outline-none"
          />
          <button
            type="button"
            onClick={() => {
              const specs = parseSpecs(bulk);
              const next = splitSpecs(specs);
              update(next.std, next.extras, true);
              setBulk(null);
              toast(`${specs.length} specs cargadas en ${p.name}`);
            }}
            className="self-start rounded-full bg-brand px-[18px] py-[10px] font-sans text-[12.5px] font-bold text-night transition-colors hover:bg-brand-hover max-[859px]:min-h-11"
          >
            Reemplazar specs con este texto
          </button>
        </div>
      )}

      <div className="grid gap-[10px] [grid-template-columns:repeat(auto-fit,minmax(min(220px,100%),1fr))]">
        {SPEC_KEYS.map((k) => {
          const key = KEYF.includes(k);
          return (
            <div key={k}>
              <div className="flex justify-between gap-[6px] font-sans text-[10px] font-bold tracking-[.16em] text-ink/50">
                <span>{k.toUpperCase()}</span>
                {key && <span className="text-brand-deeper">● COMPARADOR</span>}
              </div>
              <input
                value={std[k] ?? ""}
                placeholder={SPEC_PLACEHOLDERS[k]}
                aria-label={k}
                onChange={(e) => update({ ...std, [k]: e.target.value }, extras)}
                onBlur={() => void specsSave.flush()}
                className={cn(
                  inputCls(true),
                  "mt-[5px] w-full px-3 py-[10px] text-[13px]",
                  key ? "border-brand/45" : "",
                )}
              />
            </div>
          );
        })}
      </div>

      <div className="mt-[6px] flex items-center justify-between gap-[10px] border-t border-ink/10 pt-[14px]">
        <div className="font-display text-[15px] font-extrabold tracking-normal">Specs adicionales</div>
        <button
          type="button"
          onClick={() => update(std, [...extras, { label: "", value: "" }])}
          className={cn(btnGreen, "px-[14px]")}
        >
          + Agregar spec
        </button>
      </div>
      {extras.map((x, i) => (
        <div key={i} className="flex items-center gap-2">
          <input
            value={x.label}
            placeholder="Etiqueta (ej: Tecnología)"
            aria-label="Etiqueta"
            onChange={(e) =>
              update(std, extras.map((y, j) => (j === i ? { ...y, label: e.target.value } : y)))
            }
            onBlur={() => void specsSave.flush()}
            className={cn(inputCls(true), "w-[38%] px-3 py-[10px] text-[13px] font-semibold")}
          />
          <input
            value={x.value}
            placeholder="Valor"
            aria-label="Valor"
            onChange={(e) =>
              update(std, extras.map((y, j) => (j === i ? { ...y, value: e.target.value } : y)))
            }
            onBlur={() => void specsSave.flush()}
            className={cn(inputCls(true), "flex-1 px-3 py-[10px] text-[13px]")}
          />
          <button
            type="button"
            title="Quitar"
            aria-label="Quitar"
            onClick={() => update(std, extras.filter((_, j) => j !== i), true)}
            className={cn(btnX, "text-danger hover:text-[#801]")}
          >
            ✕
          </button>
        </div>
      ))}
      {extras.length === 0 && (
        <div className="font-sans text-[12.5px] text-ink/45">{lexicon.admin.extrasEmpty}</div>
      )}
    </div>
  );
}

/* ── Estado ───────────────────────────────────────────────── */

function StateTab({
  product: p,
  onDeleted,
  onReverted,
  confirm,
}: {
  product: AdminProduct;
  onDeleted: () => void;
  onReverted: () => void;
  confirm: ReturnType<typeof useConfirm>;
}) {
  const toast = useToast();
  const [pending, startTransition] = useTransition();
  const out = isOut(p);

  async function askDelete() {
    const ok = await confirm({
      icon: "✕",
      title: lexicon.admin.deleteProductTitle,
      message: `“${p.name}” se elimina de la web y del panel. Esta acción no se puede deshacer.`,
      label: "Sí, eliminar",
      destructive: true,
    });
    if (!ok) return;
    startTransition(async () => {
      const res = await deleteProduct(p.id);
      if (!res.ok) return toast(res.error);
      onDeleted();
      toast(lexicon.admin.productDeleted);
    });
  }

  async function askRevert() {
    const ok = await confirm({
      icon: "↺",
      title: "Descartar cambios",
      message: `Volvés “${p.name}” a los valores originales del catálogo. Esta acción no se puede deshacer.`,
      label: "Sí, descartar",
      destructive: true,
    });
    if (!ok) return;
    startTransition(async () => {
      const res = await revertProduct(p.id);
      if (!res.ok) return toast(res.error);
      onReverted();
      toast(`${p.name} restaurado al original`);
    });
  }

  return (
    <div className="flex flex-col gap-[14px]">
      <ToggleRow
        label="Stock disponible"
        on={!out}
        onLabel="EN STOCK"
        offLabel="SIN STOCK"
        danger
        disabled={pending}
        onClick={() => {
          const t = stockToggle(p);
          if (t.next === null) return toast(t.message);
          startTransition(async () => {
            await setStockOverride(p.id, t.next);
            toast(t.message);
          });
        }}
      />
      <ToggleRow
        label="Publicado en la web"
        on={!p.hidden}
        onLabel="PUBLICADO"
        offLabel="OCULTO"
        danger
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            await setProductHidden(p.id, !p.hidden);
            toast(p.hidden ? `${p.name}: publicado en la web` : `${p.name}: oculto de la web`);
          })
        }
      />
      <Hint>
        “Sin stock” lo deja visible con aviso y deriva a WhatsApp. “Oculto” lo saca de
        la web, el comparador y el test.
        {p.stock > 0 || p.stockOverride
          ? ` Unidades en el local: ${p.stock}${p.stockOverride ? " (forzado sin stock)" : ""}.`
          : " Sin unidades cargadas: se cargan en Stock."}
      </Hint>
      {p.custom && (
        <button type="button" onClick={askDelete} className={cn(btnDanger, "self-start px-5")}>
          {lexicon.admin.deleteProductCta}
        </button>
      )}
      {p.edited && !p.custom && (
        <button type="button" onClick={askRevert} className={cn(btnDanger, "self-start px-5")}>
          ↺ Descartar cambios y volver al original
        </button>
      )}
    </div>
  );
}
