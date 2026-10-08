"use client";

import { useRouter } from "next/navigation";
import { useId, useState, useTransition, type FormEvent } from "react";
import { Button, Field, formatMoney, FormError, Input, Modal, Select, Textarea, Toggle } from "@/components/bt";
import { useToast } from "@/components/admin/toast";
import { sendPhoto } from "@/components/admin/upload";
import { createProduct } from "@/lib/server/actions/products";
import { addProductPhoto } from "@/lib/server/screens/admin-d2-actions";

export interface NewProductCategory {
  slug: string;
  /** "Bicicletas · MTB": grupo del menú + tipo. */
  label: string;
}

const digits = (s: string) => s.replace(/\D/g, "");
/** Hasta 12 fotos por producto (el mismo tope que `addProductPhoto`). */
const MAX_PHOTOS = 12;

interface NewPhoto {
  key: string;
  file: File;
  preview: string;
}

const EMPTY_FORM = { name: "", brand: "", price: "", stock: "", description: "", published: true };

/**
 * "+ Nuevo producto": modal con el alta completa (fotos, nombre,
 * categoría, marca, precio, stock, descripción y si se publica). Al
 * guardar crea el producto, sube las fotos y queda en la lista. Talles y
 * colores se agregan después desde la edición del producto.
 */
export function NewProductButton({
  label,
  categories,
  brands,
  className,
}: {
  label: string;
  categories: NewProductCategory[];
  /** Marcas cargadas, como sugerencias; se puede escribir una nueva. */
  brands: string[];
  className?: string;
}) {
  const router = useRouter();
  const toast = useToast();
  const [pending, start] = useTransition();
  const [open, setOpen] = useState(false);
  const [f, setF] = useState(EMPTY_FORM);
  const [category, setCategory] = useState(categories[0]?.slug ?? "");
  const [photos, setPhotos] = useState<NewPhoto[]>([]);
  const [status, setStatus] = useState("");
  const [error, setError] = useState<string | null>(null);
  const brandsId = useId();

  const set = <K extends keyof typeof EMPTY_FORM>(k: K, v: (typeof EMPTY_FORM)[K]) => {
    setF((s) => ({ ...s, [k]: v }));
    setError(null);
  };
  // La categoría elegida puede desaparecer (se borró en otra pestaña).
  const categoryValue = categories.some((c) => c.slug === category) ? category : (categories[0]?.slug ?? "");
  const newBrand = f.brand.trim() && !brands.some((b) => b.toLowerCase() === f.brand.trim().toLowerCase());

  const reset = () => {
    for (const p of photos) URL.revokeObjectURL(p.preview);
    setPhotos([]);
    setF(EMPTY_FORM);
    setStatus("");
    setError(null);
  };

  const close = () => {
    if (pending) return;
    setOpen(false);
    reset();
  };

  const addFiles = (list: FileList | null) => {
    const files = [...(list ?? [])].filter((file) => file.type.startsWith("image/"));
    const room = MAX_PHOTOS - photos.length;
    if (files.length > room) toast(`Hasta ${MAX_PHOTOS} fotos por producto.`);
    setPhotos((ps) => [
      ...ps,
      ...files.slice(0, Math.max(0, room)).map((file) => ({
        key: `${file.name}-${file.size}-${file.lastModified}-${Math.random()}`,
        file,
        preview: URL.createObjectURL(file),
      })),
    ]);
  };

  const removePhoto = (key: string) =>
    setPhotos((ps) => {
      const p = ps.find((x) => x.key === key);
      if (p) URL.revokeObjectURL(p.preview);
      return ps.filter((x) => x.key !== key);
    });

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (pending) return;
    if (!f.name.trim()) return setError("Poné el nombre del producto.");
    if (!categoryValue) return setError("Primero creá una categoría (Productos → Categorías).");
    setError(null);
    start(async () => {
      try {
        setStatus("Creando el producto…");
        const r = await createProduct(categoryValue, {
          name: f.name.trim(),
          brandName: f.brand.trim(),
          price: digits(f.price) ? Number(digits(f.price)) : null,
          stock: digits(f.stock) ? Number(digits(f.stock)) : 0,
          description: f.description.trim(),
          published: f.published,
        });
        if (!r.ok) {
          setStatus("");
          return setError(r.error);
        }
        // Las fotos se suben de a una (cada una viaja achicada en su propia
        // action); si alguna falla, el producto ya existe y se avisa.
        let failed = 0;
        for (const [i, p] of photos.entries()) {
          setStatus(`Subiendo fotos… ${i + 1} de ${photos.length}`);
          try {
            const up = await sendPhoto(p.file, "product", (fd) => addProductPhoto(r.id, fd));
            if (!up.ok) failed++;
          } catch {
            failed++;
          }
        }
        toast(
          failed
            ? `Producto creado, pero ${failed === 1 ? "una foto no se pudo subir" : `${failed} fotos no se pudieron subir`}: sumalas desde Editar.`
            : `Producto creado: ${f.name.trim()}`,
        );
        setOpen(false);
        reset();
        router.refresh();
      } catch {
        setStatus("");
        setError("No se pudo crear el producto. Revisá la conexión y probá de nuevo.");
      }
    });
  };

  return (
    <>
      <Button variant="primary" size="md" className={className} onClick={() => setOpen(true)}>
        {label}
      </Button>
      <Modal open={open} onClose={close} title="Nuevo producto" width={560}>
        <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
          <Field label="Fotos" optional hint="La primera es la portada. Ideal: fondo blanco, 1400 px o más.">
            <span className="flex flex-wrap gap-2">
              {photos.map((p, i) => (
                <span key={p.key} className="relative size-[76px] overflow-hidden rounded-btn border border-line bg-paper">
                  {/* eslint-disable-next-line @next/next/no-img-element -- vista previa local (blob:) */}
                  <img src={p.preview} alt={`Foto ${i + 1}`} className="size-full object-contain" />
                  <button
                    type="button"
                    disabled={pending}
                    onClick={(e) => {
                      e.preventDefault();
                      removePhoto(p.key);
                    }}
                    aria-label={`Quitar foto ${i + 1}`}
                    className="absolute top-1 right-1 flex size-6 items-center justify-center rounded-full bg-ink/80 text-[12px] font-bold text-paper"
                  >
                    ✕
                  </button>
                </span>
              ))}
              {photos.length < MAX_PHOTOS && (
                <span className="relative flex size-[76px] cursor-pointer flex-col items-center justify-center rounded-btn border border-dashed border-line-strong text-center text-[12px] font-semibold text-text-2 hover:border-yellow">
                  <span className="text-[20px] leading-none text-yellow">+</span>
                  Agregar
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    disabled={pending}
                    aria-label="Agregar fotos"
                    className="absolute inset-0 cursor-pointer opacity-0"
                    onChange={(e) => {
                      addFiles(e.target.files);
                      e.target.value = "";
                    }}
                  />
                </span>
              )}
            </span>
          </Field>
          <Field label="Nombre">
            <Input
              autoFocus
              value={f.name}
              maxLength={120}
              placeholder="Ej.: Venzo Raptor R29"
              onChange={(e) => set("name", e.target.value)}
            />
          </Field>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Categoría">
              <Select value={categoryValue} onChange={(e) => setCategory(e.target.value)} disabled={!categories.length}>
                {categories.length === 0 && <option value="">Sin categorías</option>}
                {categories.map((c) => (
                  <option key={c.slug} value={c.slug}>
                    {c.label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field
              label="Marca"
              optional
              hint={newBrand ? `Se crea la marca “${f.brand.trim()}”.` : "Elegí una o escribí una nueva."}
            >
              <Input
                value={f.brand}
                maxLength={60}
                list={brandsId}
                placeholder="A confirmar"
                onChange={(e) => set("brand", e.target.value)}
              />
              <datalist id={brandsId}>
                {brands.map((b) => (
                  <option key={b} value={b} />
                ))}
              </datalist>
            </Field>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Precio" optional hint="Vacío = precio a consultar">
              <Input
                inputMode="numeric"
                value={f.price}
                placeholder="A consultar"
                onChange={(e) => {
                  const d = digits(e.target.value).slice(0, 10);
                  set("price", d ? formatMoney(Number(d)) : "");
                }}
              />
            </Field>
            <Field label="Stock" optional hint="Unidades en el local. Talles y colores, después desde Editar.">
              <Input
                inputMode="numeric"
                value={f.stock}
                placeholder="0"
                onChange={(e) => set("stock", digits(e.target.value).slice(0, 4))}
              />
            </Field>
          </div>
          <Field label="Descripción" optional>
            <Textarea
              rows={3}
              value={f.description}
              maxLength={4000}
              onChange={(e) => set("description", e.target.value)}
            />
          </Field>
          <Toggle
            label="Publicado en la tienda"
            description={f.published ? "Se ve en la tienda apenas lo creás." : "Queda como borrador: no se ve en la tienda."}
            checked={f.published}
            onChange={(e) => set("published", e.target.checked)}
          />
          <FormError>{error}</FormError>
          <div className="flex flex-wrap items-center justify-end gap-[10px]">
            {pending && status && <span className="mr-auto text-[14px] text-text-2" aria-live="polite">{status}</span>}
            <Button type="button" variant="secondary" size="md" disabled={pending} onClick={close}>
              Cancelar
            </Button>
            <Button type="submit" variant="primary" size="md" disabled={pending}>
              {pending ? "Guardando…" : "Crear producto"}
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
