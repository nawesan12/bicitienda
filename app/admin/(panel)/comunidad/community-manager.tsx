"use client";

import { useState, useTransition } from "react";
import { AutoField, useDebouncedSave } from "@/components/admin/autosave";
import { useConfirm } from "@/components/admin/confirm";
import { useToast } from "@/components/admin/toast";
import {
  btnDark,
  btnGreen,
  btnX,
  Card,
  CardGrid,
  CardTitle,
  Hint,
  inputCls,
  Label,
  PhotoBox,
  tap,
} from "@/components/admin/ui";
import { FileButton, uploadSitePhoto } from "@/components/admin/upload";
import { cx as cn } from "@/components/admin/cx";
import { galleryLabels, lexicon } from "@/lib/data/content";
import { img } from "@/lib/images";
import {
  createAgendaEvent,
  deleteAgendaEvent,
  updateAgendaEvent,
} from "@/lib/server/actions/agenda";
import { patchContent } from "@/lib/server/actions/content";
import { patchSettings } from "@/lib/server/actions/settings";
import type { AgendaEvent, NumberedItem } from "@/lib/types";

/** "foto: rodada por la costa" → "Rodada por la costa". */
const slotLabel = (s: string) => {
  const t = s.replace(/^[^:]+:\s*/, "");
  return t.charAt(0).toUpperCase() + t.slice(1);
};

/**
 * Comunidad: agenda editable en la misma fila, beneficios, link de
 * invitación al grupo y la galería de 4 fotos.
 */
export function CommunityManager({
  agenda,
  perks,
  gallery,
  groupUrl,
}: {
  agenda: AgendaEvent[];
  perks: NumberedItem[];
  gallery: (string | null)[];
  groupUrl: string;
}) {
  const toast = useToast();
  const [pending, startTransition] = useTransition();

  return (
    <div className="animate-fade-in">
      <div className="mb-[18px] flex flex-wrap items-center justify-between gap-3">
        <div className="font-sans text-[13px] text-ink/55">
          Las dos primeras aparecen también en el home
        </div>
        <button
          type="button"
          disabled={pending}
          className={btnDark}
          onClick={() =>
            startTransition(async () => {
              const res = await createAgendaEvent();
              toast(res.ok ? lexicon.admin.eventAdded : res.error);
            })
          }
        >
          {lexicon.admin.eventNew}
        </button>
      </div>

      <div className="flex flex-col gap-[10px]">
        {agenda.map((ev) => (
          <EventRow key={ev.id} event={ev} />
        ))}
      </div>

      <CardGrid className="mt-[22px]">
        <PerksCard perks={perks} groupUrl={groupUrl} />
        <GalleryCard gallery={gallery} />
      </CardGrid>
    </div>
  );
}

function EventRow({ event }: { event: AgendaEvent }) {
  const toast = useToast();
  const confirm = useConfirm();
  const [, startTransition] = useTransition();
  const [row, setRow] = useState({
    day: event.day,
    month: event.month,
    title: event.title,
    meta: event.meta,
  });
  const { schedule, flush } = useDebouncedSave<typeof row>((v) => updateAgendaEvent(event.id, v));

  function set(patch: Partial<typeof row>) {
    const next = { ...row, ...patch };
    setRow(next);
    schedule(next);
  }

  async function askDelete() {
    const ok = await confirm({
      icon: "✕",
      title: lexicon.admin.eventDeleteTitle,
      message: `“${row.title || "Sin título"}” sale de la agenda de la web.`,
      label: "Sí, eliminar",
      destructive: true,
    });
    if (!ok) return;
    startTransition(async () => {
      await deleteAgendaEvent(event.id);
      toast(lexicon.admin.eventDeleted);
    });
  }

  const base =
    "box-border rounded-[10px] border-[1.5px] border-ink/15 bg-cream-3 outline-none transition-colors focus:border-brand";

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-ink/12 bg-white px-4 py-[14px] transition-colors hover:border-brand">
      <input
        value={row.day}
        placeholder="26"
        aria-label="Día"
        maxLength={2}
        onChange={(e) => set({ day: e.target.value.replace(/\D/g, "") })}
        onBlur={() => void flush()}
        className={cn(base, "w-14 px-2 py-[11px] text-center font-display text-base")}
      />
      <input
        value={row.month}
        placeholder="SEP"
        aria-label="Mes"
        maxLength={4}
        onChange={(e) => set({ month: e.target.value.toUpperCase() })}
        onBlur={() => void flush()}
        className={cn(base, "w-16 px-2 py-[11px] text-center font-sans text-xs font-bold")}
      />
      <input
        value={row.title}
        placeholder={lexicon.admin.eventTitlePlaceholder}
        aria-label="Título"
        onChange={(e) => set({ title: e.target.value })}
        onBlur={() => void flush()}
        className={cn(base, "min-w-[180px] flex-[2] px-[14px] py-[11px] font-sans text-sm font-bold")}
      />
      <input
        value={row.meta}
        placeholder={lexicon.admin.eventMetaPlaceholder}
        aria-label="Detalle"
        onChange={(e) => set({ meta: e.target.value })}
        onBlur={() => void flush()}
        className={cn(base, "min-w-[200px] flex-[3] px-[14px] py-[11px] font-sans text-[13px]")}
      />
      <button
        type="button"
        aria-label="Eliminar"
        onClick={askDelete}
        className={cn(btnX, "px-[10px] py-2 text-danger hover:text-[#801]")}
      >
        ✕
      </button>
    </div>
  );
}

function PerksCard({ perks: initial, groupUrl }: { perks: NumberedItem[]; groupUrl: string }) {
  const [perks, setPerks] = useState(initial);
  const { schedule, flush } = useDebouncedSave<NumberedItem[]>((v) => patchContent({ perks: v }));

  function set(i: number, patch: Partial<NumberedItem>) {
    const next = perks.map((x, j) => (j === i ? { ...x, ...patch } : x));
    setPerks(next);
    schedule(next);
  }

  return (
    <Card>
      <CardTitle>Beneficios de la comunidad</CardTitle>
      {perks.map((x, i) => (
        <NumberedEditor key={i} item={x} onChange={(p) => set(i, p)} onBlur={flush} />
      ))}
      <Label className="mt-[6px]">LINK DE INVITACIÓN AL GRUPO DE WHATSAPP</Label>
      <AutoField
        initial={groupUrl}
        onSave={(v) => patchSettings({ whatsappGroupUrl: v.trim() })}
        placeholder="https://chat.whatsapp.com/…"
        className={inputCls()}
      />
      <Hint>Vacío = el botón “Sumarme al grupo” abre un chat con el local.</Hint>
    </Card>
  );
}

/** Bloque numerado (beneficios, pilares): número verde, título y texto. */
export function NumberedEditor({
  item,
  onChange,
  onBlur,
  bodyPlaceholder,
}: {
  item: NumberedItem;
  onChange: (patch: Partial<NumberedItem>) => void;
  onBlur: () => void;
  bodyPlaceholder?: string;
}) {
  const f =
    "box-border rounded-[10px] border-[1.5px] border-ink/15 bg-white outline-none transition-colors focus:border-brand";
  return (
    <div className="grid grid-cols-[64px_minmax(0,1fr)] gap-2 rounded-xl border border-ink/8 bg-cream-3 p-3">
      <input
        value={item.n}
        aria-label="Número"
        onChange={(e) => onChange({ n: e.target.value })}
        onBlur={onBlur}
        className={cn(f, "px-2 py-[10px] text-center font-display text-[15px] text-brand-deep")}
      />
      <input
        value={item.title}
        placeholder="Título"
        aria-label="Título"
        onChange={(e) => onChange({ title: e.target.value })}
        onBlur={onBlur}
        className={cn(f, "px-3 py-[10px] font-sans text-sm font-bold")}
      />
      <textarea
        rows={2}
        value={item.body}
        placeholder={bodyPlaceholder}
        aria-label="Texto"
        onChange={(e) => onChange({ body: e.target.value })}
        onBlur={onBlur}
        className={cn(f, "col-span-full resize-y px-3 py-[10px] font-sans text-[13px] leading-[1.55]")}
      />
    </div>
  );
}

function GalleryCard({ gallery: initial }: { gallery: (string | null)[] }) {
  const toast = useToast();
  const confirm = useConfirm();
  const [gallery, setGallery] = useState([0, 1, 2, 3].map((i) => initial[i] ?? null));

  async function save(next: (string | null)[], msg: string) {
    setGallery(next);
    const res = await patchContent({ gallery: next });
    toast(res.ok ? msg : res.error);
  }

  return (
    <Card>
      <CardTitle>Galería de la comunidad</CardTitle>
      <div className="font-sans text-[12.5px] text-ink/55">{lexicon.admin.galleryHint}</div>
      <div className="grid grid-cols-2 gap-[10px]">
        {gallery.map((url, i) => {
          const label = slotLabel(galleryLabels[i] ?? `Foto ${i + 1}`);
          return (
            <div key={i} className="flex flex-col gap-[6px]">
              <PhotoBox src={url ? img(url, { w: 500 }) : null} alt={label} placeholder={label} />
              <div className="flex gap-[6px]">
                <FileButton
                  label={url ? "Cambiar" : "Subir foto"}
                  className={cn(btnGreen, "flex-1 px-[10px] py-[7px] text-[11.5px]")}
                  onFile={async (file) => {
                    const res = await uploadSitePhoto(file, "gallery");
                    if (!res.ok) return toast(res.error);
                    await save(
                      gallery.map((g, j) => (j === i ? res.url : g)),
                      "Foto de la galería actualizada",
                    );
                  }}
                />
                {url && (
                  <button
                    type="button"
                    title="Quitar"
                    aria-label="Quitar"
                    onClick={async () => {
                      const ok = await confirm({
                        icon: "✕",
                        title: "Quitar la foto",
                        message: `“${label}” vuelve al espacio vacío en la galería.`,
                        label: "Sí, quitar",
                        destructive: true,
                      });
                      if (ok) await save(gallery.map((g, j) => (j === i ? null : g)), "Foto quitada");
                    }}
                    className={cn(
                      tap,
                      "rounded-full border-[1.5px] border-danger/35 px-[10px] py-[6px] font-sans text-xs font-bold text-danger transition-colors hover:bg-danger hover:text-white max-[859px]:min-w-11",
                    )}
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
