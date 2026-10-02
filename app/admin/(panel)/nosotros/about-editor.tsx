"use client";

import { useState } from "react";
import { useDebouncedSave } from "@/components/admin/autosave";
import { useConfirm } from "@/components/admin/confirm";
import { useToast } from "@/components/admin/toast";
import {
  btnDanger,
  btnDark,
  Card,
  CardGrid,
  CardTitle,
  Hint,
  inputCls,
  Label,
} from "@/components/admin/ui";
import { FileButton, uploadSitePhoto } from "@/components/admin/upload";
import { cx as cn } from "@/components/admin/cx";
import { lexicon } from "@/lib/data/content";
import { img } from "@/lib/images";
import { patchContent } from "@/lib/server/actions/content";
import type { AboutContent } from "@/lib/types";
import { NumberedEditor } from "../comunidad/community-manager";

/**
 * Nosotros: textos de la página, foto del local (se usa en Nosotros y en
 * el home) y los 3 pilares.
 */
export function AboutEditor({ about }: { about: AboutContent }) {
  const toast = useToast();
  const confirm = useConfirm();
  const [data, setData] = useState(about);
  // Los párrafos se editan como texto crudo (líneas en blanco incluidas).
  const [parasRaw, setParasRaw] = useState(about.paras.join("\n\n"));
  const { schedule, flush } = useDebouncedSave<AboutContent>((v) => patchContent({ nosotros: v }));

  function set(patch: Partial<AboutContent>) {
    const next = { ...data, ...patch };
    setData(next);
    schedule(next);
  }

  async function savePhoto(localPhoto: string | null, msg: string) {
    const next = { ...data, localPhoto };
    setData(next);
    const res = await patchContent({ nosotros: next });
    toast(res.ok ? msg : res.error);
  }

  async function askRemove() {
    const ok = await confirm({
      icon: "✕",
      title: "Quitar la foto del local",
      message: "La foto deja de verse en Nosotros y en el home.",
      label: "Sí, quitar",
      destructive: true,
    });
    if (ok) await savePhoto(null, "Foto quitada");
  }

  const field = inputCls();

  return (
    <CardGrid className="animate-fade-in">
      <Card>
        <CardTitle>Textos de la página</CardTitle>
        <Label>TÍTULO</Label>
        <input
          value={data.title}
          aria-label="Título"
          onChange={(e) => set({ title: e.target.value })}
          onBlur={() => void flush()}
          className={cn(field, "font-display text-[17px]")}
        />
        <Label>BAJADA</Label>
        <textarea
          rows={3}
          value={data.intro}
          aria-label="Bajada"
          onChange={(e) => set({ intro: e.target.value })}
          onBlur={() => void flush()}
          className={cn(field, "resize-y text-[13px] leading-[1.6]")}
        />
        <Label>HISTORIA — UN PÁRRAFO POR LÍNEA EN BLANCO</Label>
        <textarea
          rows={12}
          value={parasRaw}
          aria-label="Historia"
          onChange={(e) => {
            setParasRaw(e.target.value);
            set({
              paras: e.target.value
                .split(/\n\s*\n/)
                .map((s) => s.trim())
                .filter(Boolean),
            });
          }}
          onBlur={() => void flush()}
          className={cn(field, "resize-y text-[13px] leading-[1.7]")}
        />
      </Card>
      <div className="flex flex-col gap-[18px]">
        <Card>
          <div className="flex flex-wrap items-center justify-between gap-[10px]">
            <CardTitle>Foto del local</CardTitle>
            <span className="rounded-full bg-brand-pastel px-[10px] py-1 font-sans text-[9.5px] font-bold tracking-[.14em] text-brand-deeper">
              NOSOTROS + HOME
            </span>
          </div>
          <div
            className="relative aspect-[4/3] overflow-hidden rounded-[14px] border border-ink/10"
            style={{ background: "repeating-linear-gradient(-45deg,#f7f6f1 0 12px,#efeee7 12px 24px)" }}
          >
            {data.localPhoto ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={img(data.localPhoto, { w: 900 })}
                alt="Foto del local"
                className="absolute inset-0 block h-full w-full object-cover"
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center p-5 text-center font-sans text-[13px] font-medium leading-[1.5] text-ink/50">
                Todavía no hay foto
                <br />
                JPG o PNG, en horizontal
              </div>
            )}
          </div>
          <div className="flex flex-wrap gap-[10px]">
            <FileButton
              label={data.localPhoto ? "Cambiar foto" : "Subir foto"}
              className={btnDark}
              onFile={async (file) => {
                const res = await uploadSitePhoto(file, "local");
                if (!res.ok) return toast(res.error);
                await savePhoto(res.url, "Foto del local actualizada");
              }}
            />
            {data.localPhoto && (
              <button type="button" onClick={askRemove} className={btnDanger}>
                Quitar foto
              </button>
            )}
          </div>
          <Hint>{lexicon.admin.localPhotoHint}</Hint>
        </Card>
        <Card>
          <CardTitle>Pilares</CardTitle>
          {data.pillars.map((x, i) => (
            <NumberedEditor
              key={i}
              item={x}
              bodyPlaceholder="Descripción"
              onBlur={() => void flush()}
              onChange={(p) =>
                set({ pillars: data.pillars.map((y, j) => (j === i ? { ...y, ...p } : y)) })
              }
            />
          ))}
        </Card>
      </div>
    </CardGrid>
  );
}
