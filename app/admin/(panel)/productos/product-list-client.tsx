"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition, type FormEvent } from "react";
import { Button, Field, formatMoney, FormError, Input, Modal, Select, Toggle } from "@/components/bt";
import { lexicon } from "@/lib/data/content";
import { useToast } from "@/components/admin/toast";
import { createProduct, patchProduct } from "@/lib/server/actions/products";

export interface NewProductCategory {
  slug: string;
  /** "Bicicletas · MTB": grupo del menú + tipo. */
  label: string;
}

const digits = (s: string) => s.replace(/\D/g, "");

/**
 * "+ Nuevo producto": abre un modal con nombre, categoría y precio; al
 * confirmar crea el producto y abre su edición (3d) para fotos, talles y
 * stock.
 */
export function NewProductButton({
  label,
  categories,
  className,
}: {
  label: string;
  categories: NewProductCategory[];
  className?: string;
}) {
  const router = useRouter();
  const toast = useToast();
  const [pending, start] = useTransition();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [category, setCategory] = useState(categories[0]?.slug ?? "");
  const [price, setPrice] = useState("");
  const [error, setError] = useState<string | null>(null);

  const close = () => {
    if (pending) return;
    setOpen(false);
    setError(null);
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return setError("Poné el nombre del producto.");
    setError(null);
    start(async () => {
      const r = await createProduct(category || null, {
        name: name.trim(),
        price: digits(price) ? Number(digits(price)) : null,
      });
      if (!r.ok) return setError(r.error);
      toast(lexicon.admin.productCreated);
      setOpen(false);
      setName("");
      setPrice("");
      router.push(`/admin/productos/${r.id}?nuevo=1`);
    });
  };

  return (
    <>
      <Button variant="primary" size="md" className={className} onClick={() => setOpen(true)}>
        {label}
      </Button>
      <Modal open={open} onClose={close} title="Nuevo producto" width={480}>
        <form onSubmit={submit} className="flex flex-col gap-4">
          <Field label="Nombre">
            <Input
              autoFocus
              value={name}
              maxLength={120}
              placeholder="Ej.: Venzo Raptor R29"
              onChange={(e) => {
                setName(e.target.value);
                setError(null);
              }}
            />
          </Field>
          <Field label="Categoría">
            <Select value={category} onChange={(e) => setCategory(e.target.value)}>
              {categories.map((c) => (
                <option key={c.slug} value={c.slug}>
                  {c.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Precio" optional hint="Vacío = precio a consultar">
            <Input
              inputMode="numeric"
              value={price}
              placeholder="A consultar"
              onChange={(e) => setPrice(digits(e.target.value) ? formatMoney(Number(digits(e.target.value))) : "")}
            />
          </Field>
          <p className="m-0 text-[14px] leading-[1.5] text-text-2">
            Fotos, talles, stock y descripción se cargan en el paso siguiente.
          </p>
          <FormError>{error}</FormError>
          <div className="flex flex-wrap justify-end gap-[10px]">
            <Button type="button" variant="secondary" size="md" disabled={pending} onClick={close}>
              Cancelar
            </Button>
            <Button type="submit" variant="primary" size="md" disabled={pending}>
              {pending ? "Creando…" : "Crear producto"}
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}

/**
 * Switch "Prueba" de la fila: guarda al instante (`testRide`). Queda por
 * encima del link de la fila (relative z-10) y no navega.
 */
export function TestRideToggle({ id, name, initial }: { id: string; name: string; initial: boolean }) {
  const toast = useToast();
  const [on, setOn] = useState(initial);
  const [pending, start] = useTransition();
  return (
    <span className="relative z-10 flex">
      <Toggle
        aria-label={`Disponible para prueba: ${name}`}
        checked={on}
        disabled={pending}
        onChange={(e) => {
          const next = e.target.checked;
          setOn(next);
          start(async () => {
            const r = await patchProduct(id, { testRide: next });
            if (!r.ok) {
              setOn(!next);
              toast(r.error);
            } else toast(next ? `${name}: disponible para prueba` : `${name}: sin prueba`);
          });
        }}
      />
    </span>
  );
}
