"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useConfirm } from "@/components/admin/confirm";
import { useToast } from "@/components/admin/toast";
import { cx as cn } from "@/components/admin/cx";
import {
  createLocation,
  deleteLocation,
  setLocationActive,
  updateLocation,
  type LocationPatch,
} from "@/lib/server/actions/locations";
import type { AdminLocation } from "@/lib/server/admin-queries";

/**
 * Gestor de sucursales: filas con edición inline (autosave on-blur, como
 * la agenda), alta, activar/desactivar con confirmación y borrado solo
 * cuando la sucursal está vacía y sin pedidos.
 */
export function LocationsManager({
  locations,
}: {
  locations: AdminLocation[];
}) {
  const toast = useToast();
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function addLocation() {
    startTransition(async () => {
      const r = await createLocation({
        name: `Sucursal ${locations.length + 1}`,
        shortName: "",
        address: "",
        hours: "",
        mapsUrl: "",
        order: locations.length,
      });
      toast(r.ok ? "Sucursal creada — completá sus datos" : r.error);
      router.refresh();
    });
  }

  return (
    <div>
      <div className="mb-[14px] flex items-center justify-between gap-3">
        <div className="font-sans text-[12.5px] text-ink/50">
          {locations.length === 1
            ? "Una sucursal: la web se ve como local único."
            : `${locations.length} sucursales · la principal es la primera.`}
        </div>
        <button
          type="button"
          disabled={pending}
          onClick={addLocation}
          className="rounded-full bg-ink px-5 py-[11px] font-sans text-[12.5px] font-bold text-cream transition-colors hover:bg-brand hover:text-night disabled:opacity-50"
        >
          + Nueva sucursal
        </button>
      </div>

      <div className="flex flex-col gap-[10px]">
        {locations.map((l) => (
          <LocationRow key={l.id} location={l} />
        ))}
      </div>

      <div className="mt-4 font-sans text-xs leading-relaxed text-ink/50">
        El stock por sucursal se maneja desde cada producto (tab «Stock»).
        Una sucursal con stock o pedidos no se borra: transferí el stock y
        desactivala.
      </div>
    </div>
  );
}

function LocationRow({ location }: { location: AdminLocation }) {
  const toast = useToast();
  const confirm = useConfirm();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [form, setForm] = useState<LocationPatch>({
    name: location.name,
    shortName: location.shortName,
    address: location.address,
    hours: location.hours,
    mapsUrl: location.mapsUrl,
    order: location.order,
  });

  function save() {
    const changed =
      form.name !== location.name ||
      form.shortName !== location.shortName ||
      form.address !== location.address ||
      form.hours !== location.hours ||
      form.mapsUrl !== location.mapsUrl ||
      form.order !== location.order;
    if (!changed) return;
    startTransition(async () => {
      const r = await updateLocation(location.id, form);
      toast(r.ok ? "Sucursal guardada" : r.error);
      // Sin router.refresh(): el input ya muestra el valor y un refresh en
      // medio de la edición de otro campo pisaría lo que se está tipeando.
    });
  }

  async function askToggleActive() {
    if (location.active) {
      const ok = await confirm({
        title: `¿Desactivar ${location.shortName || location.name}?`,
        message:
          "Deja de aparecer en la web y en el checkout. El stock que tenga queda guardado.",
        label: "Desactivar",
        destructive: true,
      });
      if (!ok) return;
    }
    startTransition(async () => {
      const r = await setLocationActive(location.id, !location.active);
      toast(r.ok ? (location.active ? "Sucursal desactivada" : "Sucursal activada") : r.error);
      router.refresh();
    });
  }

  async function askDelete() {
    const ok = await confirm({
      title: `¿Borrar ${location.shortName || location.name}?`,
      message: "Solo se puede si no tiene stock ni pedidos asociados.",
      label: "Borrar",
      destructive: true,
    });
    if (!ok) return;
    startTransition(async () => {
      const r = await deleteLocation(location.id);
      toast(r.ok ? "Sucursal borrada" : r.error);
      router.refresh();
    });
  }

  const inputClass =
    "box-border w-full rounded-[10px] border-[1.5px] border-ink/12 bg-cream-3 px-3 py-[9px] font-sans text-[13px] outline-none focus:border-brand disabled:opacity-50";

  const field = (
    key: keyof LocationPatch,
    label: string,
    span?: string,
  ) => (
    <label className={cn("flex flex-col gap-1", span)}>
      <span className="font-sans text-[9.5px] font-bold tracking-[.16em] text-ink/40">
        {label}
      </span>
      <input
        value={String(form[key])}
        disabled={pending}
        onChange={(e) =>
          setForm((f) => ({
            ...f,
            [key]: key === "order" ? Number(e.target.value) || 0 : e.target.value,
          }))
        }
        onBlur={save}
        onKeyDown={(e) => {
          if (e.key === "Enter") (e.target as HTMLInputElement).blur();
        }}
        className={inputClass}
      />
    </label>
  );

  return (
    <div
      className={cn(
        "rounded-2xl border-[1.5px] bg-white px-4 py-[14px] transition-colors",
        location.active ? "border-ink/10" : "border-ink/8 opacity-60",
      )}
    >
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span className="font-display text-[15px] text-ink">
          {form.name || "Sucursal"}
        </span>
        {!location.active && (
          <span className="rounded-full bg-cream-2 px-2 py-[3px] font-sans text-[9px] font-bold tracking-[.12em] text-ink/50">
            INACTIVA
          </span>
        )}
        <span className="rounded-full bg-brand-pastel px-2 py-[3px] font-sans text-[9px] font-bold tracking-[.12em] text-brand-deeper">
          {location.totalUnits} U. · {location.productsWithStock} PRODUCTOS
        </span>
        {location.ordersCount > 0 && (
          <span className="rounded-full bg-cream-2 px-2 py-[3px] font-sans text-[9px] font-bold tracking-[.12em] text-ink/50">
            {location.ordersCount} PEDIDOS
          </span>
        )}
        <span className="flex-1" />
        <button
          type="button"
          disabled={pending}
          onClick={askToggleActive}
          className={cn(
            "rounded-full border-[1.5px] px-[13px] py-[7px] font-sans text-[11px] font-bold tracking-[.06em] transition-colors disabled:opacity-50",
            location.active
              ? "border-brand/50 bg-brand-pastel text-brand-deeper hover:border-ink"
              : "border-ink/20 bg-cream text-ink/50 hover:border-ink",
          )}
        >
          {location.active ? "ACTIVA" : "ACTIVAR"}
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={askDelete}
          className="rounded-full border-[1.5px] border-danger/40 px-[13px] py-[7px] font-sans text-[11px] font-bold text-danger transition-colors hover:bg-danger hover:text-white disabled:opacity-50"
        >
          Borrar
        </button>
      </div>
      <div className="grid grid-cols-[repeat(auto-fit,minmax(150px,1fr))] gap-2">
        {field("name", "NOMBRE", "min-[900px]:col-span-2")}
        {field("shortName", "NOMBRE CORTO")}
        {field("order", "ORDEN")}
        {field("address", "DIRECCIÓN", "min-[900px]:col-span-2")}
        {field("hours", "HORARIOS", "min-[900px]:col-span-2")}
        {field("mapsUrl", "LINK DE GOOGLE MAPS", "min-[900px]:col-span-4")}
      </div>
    </div>
  );
}
