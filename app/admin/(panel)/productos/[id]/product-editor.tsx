"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { Button, ComputedField, cx, DangerTextButton, Eyebrow, Field, formatMoney, Input, Panel, PanelTitle, ProductCard, QtyStepper, ResponsiveTopBar, Select, type SortablePhoto, SortablePhotoGrid, Textarea, Toggle, transferPrice, UploadDropzone } from "@/components/bt";
import { useConfirm } from "@/components/admin/confirm";
import { useToast } from "@/components/admin/toast";
import { sendPhoto } from "@/components/admin/upload";
import { COPY } from "@/lib/data/demo/copy";
import { img } from "@/lib/images";
import { paths } from "@/lib/paths";
import { SPEC_KEYS, SPEC_PLACEHOLDERS } from "@/lib/specs";
import { deleteProduct, patchProduct, type ProductPatch } from "@/lib/server/actions/products";
import { addProductPhoto, saveProductEditor } from "@/lib/server/screens/admin-d2-actions";
import type { ProductEditorData } from "@/lib/server/screens/admin-d2";
import { NO_PHOTO } from "../product-utils";

const T = COPY.admin.products.edit;

/** Etiquetas del handoff (la tarjeta pinta "Nuevo" amarillo y el resto rojo). */
const TAGS = ["Más vendida", "Oferta", "Nuevo"];

/** Altura sugerida por talle (SIZE_HEIGHTS del prototipo), para autocompletar. */
const SIZE_HEIGHTS: Record<string, string> = {
  S: "1,55 – 1,65 m",
  M: "1,65 – 1,75 m",
  L: "1,75 – 1,85 m",
  XL: "1,85 – 1,95 m",
};

interface Row {
  key: string;
  id?: string;
  size: string;
  color: string;
  heightRange: string;
  /** Precio del talle formateado ("$ 509.900"); "" = hereda el de lista. */
  price: string;
  sku: string;
  stock: number;
}

/** Fila de la ficha técnica. */
interface SpecRow {
  key: string;
  label: string;
  value: string;
}

const digits = (s: string) => s.replace(/\D/g, "");
const moneyInput = (n: number | null) => (n == null ? "" : formatMoney(n));
const parsePrice = (s: string): number | null => (digits(s) ? Number(digits(s)) : null);
const thumb = (src: string) => img(src, { w: 400 });

export function ProductEditor({ data }: { data: ProductEditorData }) {
  const router = useRouter();
  const toast = useToast();
  const confirm = useConfirm();
  const [saving, startSave] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const initialTag = TAGS.find((t) => t.toLowerCase() === data.tag.toLowerCase()) ?? data.tag;
  const [initial, setInitial] = useState(() => ({
      name: data.name,
      category: data.category,
      brand: data.brandName,
      tag: initialTag,
      description: data.description,
      price: moneyInput(data.price),
      oldPrice: moneyInput(data.oldPrice),
      specs: data.specs.map((x, i) => ({ key: `spec-${i}`, ...x })) as SpecRow[],
      published: data.status === "publicado",
      featured: data.featured,
      hideWhenOut: data.hideWhenOut,
      photos: data.images.map((u) => ({ key: u, src: thumb(u) })) as SortablePhoto[],
      rows: data.variants.map((v) => ({ key: v.id, ...v, price: moneyInput(v.price) })) as Row[],
  }));
  const [f, setF] = useState(initial);
  const [removed, setRemoved] = useState<string[]>([]);
  const newKey = useRef(0);
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((s) => ({ ...s, [k]: v }));
  const setRow = (key: string, patch: Partial<Row>) =>
    setF((s) => ({ ...s, rows: s.rows.map((r) => (r.key === key ? { ...r, ...patch } : r)) }));

  const dirty = removed.length > 0 || JSON.stringify(f) !== JSON.stringify(initial);

  // Aviso al salir con cambios sin guardar.
  useEffect(() => {
    if (!dirty) return;
    const h = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", h);
    return () => window.removeEventListener("beforeunload", h);
  }, [dirty]);

  const price = parsePrice(f.price);
  const oldPrice = parsePrice(f.oldPrice);
  // Vista previa: con precios por talle distintos la card dice "Desde $min".
  const rowPrices = f.rows.map((r) => parsePrice(r.price) ?? price).filter((n): n is number => n != null);
  const previewPrice = rowPrices.length ? Math.min(...rowPrices) : price;
  const previewFrom = new Set(rowPrices).size > 1;
  const cat = data.categories.find((c) => c.slug === f.category);
  const coverSrc = f.photos[0]?.key;

  function buildPatch(): ProductPatch {
    const p: ProductPatch = {};
    if (f.name.trim() !== initial.name) p.name = f.name.trim();
    if (f.category !== initial.category) p.category = f.category;
    if (f.brand.trim() && f.brand.trim() !== initial.brand) p.brandName = f.brand.trim();
    if (f.tag !== initial.tag) p.tag = f.tag || null;
    if (f.description !== initial.description) p.description = f.description;
    if (price !== data.price) p.price = price;
    if (oldPrice !== data.oldPrice) p.oldPrice = oldPrice;
    const specs = cleanSpecs(f.specs);
    if (JSON.stringify(specs) !== JSON.stringify(cleanSpecs(initial.specs))) p.specs = specs;
    if (f.published !== initial.published) p.status = f.published ? "publicado" : "borrador";
    if (f.featured !== initial.featured) p.featured = f.featured;
    if (f.hideWhenOut !== initial.hideWhenOut) p.hideWhenOut = f.hideWhenOut;
    return p;
  }

  function save() {
    setError(null);
    if (!f.name.trim()) return setError("El nombre no puede quedar vacío.");
    const empty = f.rows.find((r) => !r.size.trim());
    if (empty) return setError("Cada variante necesita un talle (o “Único”).");
    startSave(async () => {
      const r = await saveProductEditor(data.id, {
        patch: buildPatch(),
        images: f.photos.map((p) => p.key),
        variants: f.rows.map((r) => ({
          id: r.id,
          size: r.size.trim(),
          color: r.color.trim(),
          heightRange: r.heightRange.trim(),
          price: parsePrice(r.price),
          sku: r.sku.trim(),
          stock: r.stock,
        })),
        removed,
      });
      if (!r.ok) {
        setError(r.error);
        return;
      }
      // saveProductEditor invalida: Next re-renderiza la página en la misma respuesta.
      toast("Cambios guardados");
      setRemoved([]);
      setInitial(f);
    });
  }

  async function upload(file: File) {
    setUploading(true);
    try {
      const r = await sendPhoto(file, "product", (fd) => addProductPhoto(data.id, fd));
      if (!r.ok) return toast(r.error);
      // La foto ya quedó guardada al final; se suma sin perder el orden que se está editando.
      const added = r.images
        .filter((u) => !initial.photos.some((p) => p.key === u))
        .map((u) => ({ key: u, src: thumb(u) }));
      setF((s) => ({ ...s, photos: [...s.photos, ...added] }));
      setInitial((s) => ({ ...s, photos: [...s.photos, ...added] }));
      toast("Foto subida");
    } finally {
      setUploading(false);
    }
  }

  async function remove() {
    if (!data.custom) {
      const ok = await confirm({
        title: "No se puede eliminar",
        message:
          "Los productos del catálogo original no se eliminan para no perder el historial. ¿Lo pasamos a borrador? Deja de verse en la tienda.",
        label: "Pasar a borrador",
        icon: "!",
      });
      if (!ok) return;
      const r = await patchProduct(data.id, { status: "borrador" });
      if (!r.ok) return toast(r.error);
      set("published", false);
      setInitial((s) => ({ ...s, published: false }));
      toast("Pasado a borrador");
      return;
    }
    const ok = await confirm({
      title: "Eliminar producto",
      message: `${data.name} se borra con sus variantes y fotos. Si tiene ventas, conviene pasarlo a borrador.`,
      label: "Sí, eliminar",
      destructive: true,
    });
    if (!ok) return;
    const r = await deleteProduct(data.id);
    if (!r.ok) return toast(r.error);
    toast("Producto eliminado");
    router.push("/admin/productos");
  }

  const statusLine = (
    <span className={cx("font-mono text-[12px] font-semibold max-lg:col-span-2", dirty ? "text-yellow" : "text-text-3")} aria-live="polite">
      {saving ? "Guardando…" : dirty ? "Cambios sin guardar" : "Todo guardado"}
    </span>
  );
  const viewBtn = (
    <Button variant="secondary" size="md" href={paths.catalog(data.slug)} external>
      {T.viewInStore}
    </Button>
  );
  const saveBtn = (
    <Button variant="primary" size="md" onClick={save} disabled={saving}>
      {saving ? "Guardando…" : T.save}
    </Button>
  );

  return (
    <>
      <ResponsiveTopBar
        title={f.name || data.name}
        back={{ href: "/admin/productos", label: "Productos" }}
        actions={
          <>
            {statusLine}
            {viewBtn}
            {saveBtn}
          </>
        }
        mobileActions={
          <>
            {viewBtn}
            {saveBtn}
          </>
        }
      />

      {error && (
        <p role="alert" className="mx-4 mt-4 mb-0 rounded-box border border-red-light/60 px-4 py-3 text-[14px] font-semibold text-red-light lg:mx-10">
          {error}
        </p>
      )}

      <div className="grid items-start gap-5 px-4 pt-5 pb-28 lg:gap-6 lg:px-10 lg:pt-6 lg:pb-10 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="flex min-w-0 flex-col gap-5">
          {/* Fotos */}
          <Panel surface="surface" padding="lg">
            <PanelTitle
              action={<span className="text-[13px] text-text-3 max-md:hidden">Arrastrá para ordenar · la primera es la portada</span>}
            >
              {T.photos}
            </PanelTitle>
            <SortablePhotoGrid
              photos={f.photos}
              onChange={(p) => set("photos", p)}
              coverLabel={T.cover}
              trailing={
                <UploadDropzone
                  variant="tile"
                  className="h-full"
                  label={uploading ? "Subiendo…" : T.upload}
                  accept="image/*"
                  disabled={uploading}
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    e.target.value = "";
                    if (file) await upload(file);
                  }}
                />
              }
            />
          </Panel>

          {/* Información */}
          <Panel surface="surface" padding="lg">
            <PanelTitle>{T.info}</PanelTitle>
            <Field label="Nombre">
              <Input value={f.name} onChange={(e) => set("name", e.target.value)} maxLength={160} />
            </Field>
            <div className="grid gap-3 md:grid-cols-3">
              <Field label="Categoría">
                <Select value={f.category} onChange={(e) => set("category", e.target.value)}>
                  {data.categories.map((c) => (
                    <option key={c.slug} value={c.slug}>
                      {c.group ? `${c.label}` : `${c.label} (general)`}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label={T.brand}>
                <Input value={f.brand} placeholder={T.brandPlaceholder} onChange={(e) => set("brand", e.target.value)} maxLength={60} />
              </Field>
              <Field label={T.tag}>
                <Select value={f.tag} onChange={(e) => set("tag", e.target.value)}>
                  <option value="">Sin etiqueta</option>
                  {[...TAGS, ...(f.tag && !TAGS.includes(f.tag) ? [f.tag] : [])].map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>
            <Field label={T.description}>
              <Textarea
                value={f.description}
                onChange={(e) => set("description", e.target.value)}
                rows={3}
                className="text-text-2"
                maxLength={4000}
              />
            </Field>
          </Panel>

          {/* Ficha técnica */}
          <Panel surface="surface" padding="lg">
            <PanelTitle
              action={
                <button
                  type="button"
                  className="rounded-[2px] text-[13px] font-extrabold uppercase tracking-[.06em] text-yellow hover:text-brand-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-yellow"
                  onClick={() => set("specs", [...f.specs, { key: `spec-new-${newKey.current++}`, label: "", value: "" }])}
                >
                  {T.addSpec}
                </button>
              }
            >
              {T.specs}
            </PanelTitle>
            <SpecsEditor rows={f.specs} onChange={(rows) => set("specs", rows)} />
            <p className="m-0 text-[13px] leading-[1.5] text-text-3">{T.specsHint}</p>
          </Panel>

          {/* Precio */}
          <Panel surface="surface" padding="lg">
            <PanelTitle>Precio</PanelTitle>
            <div className="grid gap-3 md:grid-cols-3">
              <Field label={T.listPrice} hint={price == null ? "Vacío = precio a consultar" : undefined}>
                <Input
                  inputMode="numeric"
                  value={f.price}
                  placeholder="A consultar"
                  className="text-[17px] font-extrabold max-md:text-[17px]"
                  onChange={(e) => set("price", digits(e.target.value) ? formatMoney(Number(digits(e.target.value))) : "")}
                />
              </Field>
              <Field label={T.transferPrice}>
                <ComputedField aria-live="polite">
                  {price == null ? "—" : `${formatMoney(transferPrice(price, data.transferDiscount))} · −${data.transferDiscount}%`}
                </ComputedField>
              </Field>
              <Field label={T.oldPrice} hint={T.oldPriceHint}>
                <Input
                  inputMode="numeric"
                  value={f.oldPrice}
                  placeholder="Sin promo"
                  onChange={(e) => set("oldPrice", digits(e.target.value) ? formatMoney(Number(digits(e.target.value))) : "")}
                />
              </Field>
            </div>
          </Panel>

          {/* Variantes y stock */}
          <Panel surface="surface" padding="lg">
            <PanelTitle
              action={
                <button
                  type="button"
                  className="rounded-[2px] text-[13px] font-extrabold uppercase tracking-[.06em] text-yellow hover:text-brand-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-yellow"
                  onClick={() =>
                    set("rows", [
                      ...f.rows,
                      { key: `new-${newKey.current++}`, size: "", color: "", heightRange: "", price: "", sku: "", stock: 0 },
                    ])
                  }
                >
                  {T.addVariant}
                </button>
              }
            >
              {T.variants}
            </PanelTitle>
            <VariantsTable
              basePrice={price}
              rows={f.rows}
              onRow={setRow}
              onRemove={(r) => {
                if (f.rows.length === 1) return toast("El producto necesita al menos una variante.");
                set("rows", f.rows.filter((x) => x.key !== r.key));
                if (r.id) setRemoved((x) => [...x, r.id!]);
              }}
            />
            <p className="m-0 text-[13px] leading-[1.5] text-text-3">
              Una fila por talle × color. Sin talles, dejá “Único”. El SKU vacío se arma solo. El stock es el del local. {T.variantPriceHint}
            </p>
          </Panel>
        </div>

        {/* Columna derecha */}
        <div className="flex min-w-0 flex-col gap-5">
          <Panel surface="surface" padding="lg" gap="md">
            <PanelTitle>{T.visibility}</PanelTitle>
            <Toggle label={T.toggles.published} checked={f.published} onChange={(e) => set("published", e.target.checked)} />
            <Toggle label={T.toggles.featured} checked={f.featured} onChange={(e) => set("featured", e.target.checked)} />
            <Toggle label={T.toggles.hideWhenOut} checked={f.hideWhenOut} onChange={(e) => set("hideWhenOut", e.target.checked)} />
          </Panel>

          <div className="flex flex-col gap-[10px]">
            <Eyebrow tone="muted" size="sm">
              {T.preview}
            </Eyebrow>
            <ProductCard
              layout="desktop"
              imageAspect="4/3"
              hideAdd
              href={paths.catalog(data.slug)}
              name={f.name || "Sin nombre"}
              category={cat?.label ?? data.categoryLabel}
              brand={f.brand.trim() || "Marca"}
              image={{ src: coverSrc ? img(coverSrc, { w: 720 }) : NO_PHOTO }}
              price={previewPrice ?? 0}
              priceFrom={previewFrom}
              tag={f.tag ? { label: f.tag } : undefined}
              transferDiscountPct={data.transferDiscount}
            />
            {price == null && <p className="m-0 text-[13px] text-text-3">Sin precio: en la tienda dice “Precio a consultar”.</p>}
          </div>

          <DangerTextButton onClick={remove} className="self-center">
            {T.delete}
          </DangerTextButton>
        </div>
      </div>

      {/* Barra fija en mobile para no perder "Guardar" al bajar. */}
      {dirty && (
        <div className="fixed inset-x-0 bottom-0 z-30 flex items-center gap-3 border-t border-line bg-ink-deep px-4 py-3 lg:hidden">
          <span className="flex-1 font-mono text-[12px] font-semibold text-yellow">Cambios sin guardar</span>
          {saveBtn}
        </div>
      )}
    </>
  );
}

/* ── Variantes ────────────────────────────────────────────── */

const CELL_INPUT =
  "block w-full min-w-0 rounded-tag border border-transparent bg-transparent px-[6px] py-1 text-paper outline-none placeholder:text-text-4 hover:border-line-strong focus:border-yellow focus:bg-ink transition-colors duration-150";

function VariantsTable({
  basePrice,
  rows,
  onRow,
  onRemove,
}: {
  /** Precio de lista: placeholder de la columna Precio (vacío = hereda). */
  basePrice: number | null;
  rows: Row[];
  onRow: (key: string, patch: Partial<Row>) => void;
  onRemove: (r: Row) => void;
}) {
  const fillHeight = (r: Row) => {
    const h = SIZE_HEIGHTS[r.size.trim().toUpperCase()];
    if (h && !r.heightRange.trim()) onRow(r.key, { heightRange: h });
  };
  const grid =
    "md:grid md:grid-cols-[52px_minmax(0,1.1fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.2fr)_112px_28px] md:items-center md:gap-3";
  return (
    <div role="table" aria-label="Variantes y stock" className="overflow-hidden rounded-box border border-line">
      <div
        role="row"
        className={cx("hidden bg-ink px-[18px] py-3 font-mono text-[11px] font-semibold uppercase text-text-3", grid)}
      >
        <span role="columnheader">Talle</span>
        <span role="columnheader">Color</span>
        <span role="columnheader">{T.heightRange}</span>
        <span role="columnheader">{T.variantPrice}</span>
        <span role="columnheader">{T.sku}</span>
        <span role="columnheader">Stock</span>
        <span role="columnheader" className="sr-only">
          Quitar
        </span>
      </div>
      {rows.map((r, i) => (
        <div
          key={r.key}
          role="row"
          className={cx(
            "grid grid-cols-2 gap-x-3 gap-y-2 px-4 py-3 md:px-[18px] md:py-[10px]",
            i > 0 && "border-t border-line",
            "max-md:border-t max-md:border-line max-md:first:border-t-0",
            grid,
          )}
        >
          <label role="cell" className="flex flex-col gap-1">
            <span className="text-[11px] font-bold uppercase tracking-[.08em] text-text-3 md:sr-only">Talle</span>
            <input
              className={cx(CELL_INPUT, "text-[20px] font-black uppercase stretch-75")}
              value={r.size}
              placeholder="M"
              maxLength={20}
              aria-label="Talle"
              onChange={(e) => onRow(r.key, { size: e.target.value })}
              onBlur={() => fillHeight(r)}
            />
          </label>
          <label role="cell" className="flex flex-col gap-1">
            <span className="text-[11px] font-bold uppercase tracking-[.08em] text-text-3 md:sr-only">Color</span>
            <input
              className={cx(CELL_INPUT, "text-[14px]")}
              value={r.color}
              placeholder="—"
              maxLength={40}
              aria-label="Color"
              onChange={(e) => onRow(r.key, { color: e.target.value })}
            />
          </label>
          <label role="cell" className="flex flex-col gap-1">
            <span className="text-[11px] font-bold uppercase tracking-[.08em] text-text-3 md:sr-only">{T.heightRange}</span>
            <input
              className={cx(CELL_INPUT, "text-[14px] text-text-2")}
              value={r.heightRange}
              placeholder={SIZE_HEIGHTS[r.size.trim().toUpperCase()] ?? "—"}
              maxLength={40}
              aria-label={T.heightRange}
              onChange={(e) => onRow(r.key, { heightRange: e.target.value })}
            />
          </label>
          <label role="cell" className="flex flex-col gap-1">
            <span className="text-[11px] font-bold uppercase tracking-[.08em] text-text-3 md:sr-only">{T.variantPrice}</span>
            <input
              className={cx(CELL_INPUT, "text-[14px] font-bold")}
              inputMode="numeric"
              value={r.price}
              placeholder={basePrice == null ? "—" : formatMoney(basePrice)}
              aria-label={`${T.variantPrice} ${r.size || "variante"}`}
              onChange={(e) =>
                onRow(r.key, { price: digits(e.target.value) ? formatMoney(Number(digits(e.target.value))) : "" })
              }
            />
          </label>
          <label role="cell" className="flex flex-col gap-1">
            <span className="text-[11px] font-bold uppercase tracking-[.08em] text-text-3 md:sr-only">{T.sku}</span>
            <input
              className={cx(CELL_INPUT, "font-mono text-[12px] font-semibold text-text-3 uppercase")}
              value={r.sku}
              placeholder="Automático"
              maxLength={60}
              aria-label="SKU"
              onChange={(e) => onRow(r.key, { sku: e.target.value })}
            />
          </label>
          <div role="cell" className="flex flex-col gap-1">
            <span className="text-[11px] font-bold uppercase tracking-[.08em] text-text-3 md:hidden">Stock</span>
            <QtyStepper
              size="admin"
              min={0}
              max={9999}
              value={r.stock}
              highlightZero
              label={`Stock ${r.size || "variante"}`}
              onChange={(n) => onRow(r.key, { stock: n })}
            />
          </div>
          <div role="cell" className="flex items-end justify-end md:items-center">
            <button
              type="button"
              aria-label={`Quitar variante ${r.size} ${r.color}`.trim()}
              onClick={() => onRemove(r)}
              className="flex size-11 items-center justify-center rounded-tag text-[14px] font-extrabold text-text-3 transition-colors duration-150 hover:text-red-light focus-visible:outline-2 focus-visible:outline-yellow md:size-7"
            >
              ✕
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ── Ficha técnica ────────────────────────────────────────── */

/** Specs para guardar: sin filas vacías y con los textos recortados. */
function cleanSpecs(rows: SpecRow[]): { label: string; value: string }[] {
  return rows
    .map((r) => ({ label: r.label.trim(), value: r.value.trim() }))
    .filter((r) => r.label && r.value);
}

const SPEC_DATALIST = "spec-keys";

const iconBtn =
  "flex size-11 items-center justify-center rounded-tag text-[14px] font-extrabold text-text-3 transition-colors duration-150 hover:text-paper focus-visible:outline-2 focus-visible:outline-yellow disabled:opacity-30 disabled:hover:text-text-3 md:size-8";

/**
 * Editor de la ficha técnica: filas dato / valor con sugerencias de los
 * campos fijos (`SPEC_KEYS`, datalist) y su ejemplo como placeholder
 * (`SPEC_PLACEHOLDERS`). Reordenar con ↑ / ↓; ✕ quita la fila.
 */
function SpecsEditor({ rows, onChange }: { rows: SpecRow[]; onChange: (rows: SpecRow[]) => void }) {
  const used = new Set(rows.map((r) => r.label.trim()));
  const patch = (key: string, p: Partial<SpecRow>) => onChange(rows.map((r) => (r.key === key ? { ...r, ...p } : r)));
  const move = (i: number, d: -1 | 1) => {
    const j = i + d;
    if (j < 0 || j >= rows.length) return;
    const next = [...rows];
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  };
  return (
    <>
      <datalist id={SPEC_DATALIST}>
        {SPEC_KEYS.filter((k) => !used.has(k)).map((k) => (
          <option key={k} value={k} />
        ))}
      </datalist>
      {rows.length === 0 ? (
        <p className="m-0 rounded-box border border-dashed border-line-strong px-4 py-5 text-center text-[14px] text-text-3">
          Sin datos todavía. Sumá rodado, cuadro, frenos, transmisión…
        </p>
      ) : (
        <div role="table" aria-label={T.specs} className="overflow-hidden rounded-box border border-line">
          {rows.map((r, i) => {
            const ph = (SPEC_PLACEHOLDERS as Record<string, string>)[r.label.trim()] ?? "";
            return (
              <div
                key={r.key}
                role="row"
                className={cx(
                  "grid grid-cols-[minmax(0,1fr)_auto] gap-x-2 gap-y-1 px-3 py-2 md:grid-cols-[minmax(0,.8fr)_minmax(0,1.4fr)_auto] md:items-center md:gap-3 md:px-[18px]",
                  i > 0 && "border-t border-line",
                )}
              >
                <label role="cell" className="flex min-w-0 flex-col gap-1">
                  <span className="sr-only">{T.specLabel}</span>
                  <input
                    className={cx(CELL_INPUT, "font-mono text-[12px] font-semibold uppercase text-text-2")}
                    list={SPEC_DATALIST}
                    value={r.label}
                    placeholder={T.specLabel}
                    maxLength={60}
                    onChange={(e) => patch(r.key, { label: e.target.value })}
                  />
                </label>
                <label role="cell" className="col-start-1 flex min-w-0 flex-col gap-1 md:col-start-auto">
                  <span className="sr-only">{T.specValue}</span>
                  <input
                    className={cx(CELL_INPUT, "text-[14px]")}
                    value={r.value}
                    placeholder={ph || T.specValue}
                    maxLength={200}
                    onChange={(e) => patch(r.key, { value: e.target.value })}
                  />
                </label>
                <div role="cell" className="col-start-2 row-span-2 row-start-1 flex items-center md:col-start-auto md:row-span-1 md:row-start-auto">
                  <button type="button" className={iconBtn} disabled={i === 0} aria-label={`Subir ${r.label || "fila"}`} onClick={() => move(i, -1)}>
                    ↑
                  </button>
                  <button
                    type="button"
                    className={iconBtn}
                    disabled={i === rows.length - 1}
                    aria-label={`Bajar ${r.label || "fila"}`}
                    onClick={() => move(i, 1)}
                  >
                    ↓
                  </button>
                  <button
                    type="button"
                    className={cx(iconBtn, "hover:text-red-light")}
                    aria-label={`Quitar ${r.label || "fila"}`}
                    onClick={() => onChange(rows.filter((x) => x.key !== r.key))}
                  >
                    ✕
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
