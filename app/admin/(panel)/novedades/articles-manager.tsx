"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { AutoField } from "@/components/admin/autosave";
import { useConfirm } from "@/components/admin/confirm";
import { ModalShell } from "@/components/admin/modal-shell";
import { useToast } from "@/components/admin/toast";
import {
  btnDanger,
  btnDark,
  btnGhost,
  inputCls,
  Label,
  tap,
} from "@/components/admin/ui";
import { cx as cn } from "@/components/admin/cx";
import {
  createArticle,
  deleteArticle,
  patchArticle,
  resetArticles,
} from "@/lib/server/actions/articles";
import type { Article } from "@/lib/types";

const TABS = [
  { id: "info", label: "Información" },
  { id: "cuerpo", label: "Cuerpo" },
  { id: "cta", label: "Cierre / CTA" },
];

/**
 * Novedades: tarjetas de las notas (las 3 primeras van al home), alta al
 * instante, restaurar originales y el editor de 3 pestañas.
 */
export function ArticlesManager({
  articles,
  initialOpen,
}: {
  articles: Article[];
  initialOpen: string | null;
}) {
  const router = useRouter();
  const toast = useToast();
  const confirm = useConfirm();
  const [openId, setOpenId] = useState<string | null>(initialOpen);
  const [pending, startTransition] = useTransition();
  const open = articles.find((a) => a.id === openId);

  function close(saved: boolean) {
    setOpenId(null);
    if (initialOpen) router.replace("/admin/novedades");
    if (saved) toast("Nota guardada");
  }

  async function askDelete(a: Article) {
    const ok = await confirm({
      icon: "✕",
      title: "Eliminar la nota",
      message: `“${a.title}” se elimina de la web. Esta acción no se puede deshacer.`,
      label: "Sí, eliminar",
      destructive: true,
    });
    if (!ok) return;
    startTransition(async () => {
      await deleteArticle(a.id);
      close(false);
      toast("Nota eliminada");
    });
  }

  async function askReset() {
    const ok = await confirm({
      icon: "↺",
      title: "Restaurar notas originales",
      message: "Se pierden las notas nuevas y las ediciones. Vuelven las notas originales.",
      label: "Sí, restaurar",
      destructive: true,
    });
    if (!ok) return;
    startTransition(async () => {
      await resetArticles();
      toast("Notas restauradas");
    });
  }

  return (
    <div className="animate-fade-in">
      <div className="mb-[18px] flex flex-wrap items-center justify-between gap-3">
        <div className="font-sans text-[13px] text-ink/55">
          {articles.length} notas publicadas · las 3 primeras aparecen en el home
        </div>
        <div className="flex flex-wrap gap-[10px]">
          <button type="button" onClick={askReset} className={btnGhost}>
            ↺ Restaurar originales
          </button>
          <button
            type="button"
            disabled={pending}
            className={btnDark}
            onClick={() =>
              startTransition(async () => {
                const res = await createArticle();
                if (!res.ok) return toast(res.error);
                setOpenId(res.id);
                toast("Nota creada — completala y listo");
              })
            }
          >
            + Nueva nota
          </button>
        </div>
      </div>

      <div className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(min(320px,100%),1fr))]">
        {articles.map((a) => (
          <div
            key={a.id}
            className="flex flex-col gap-[10px] rounded-2xl border-[1.5px] border-ink/10 bg-white p-5 transition-[transform,box-shadow,border-color] hover:-translate-y-[3px] hover:border-brand hover:shadow-[0_12px_28px_rgba(21,23,15,.09)]"
          >
            <div className="flex items-center gap-[10px]">
              <span className="rounded-full bg-brand-pastel px-[9px] py-1 font-sans text-[10px] font-bold tracking-[.14em] text-brand-deeper">
                {a.tag}
              </span>
              <span className="font-sans text-[11.5px] text-ink/45">
                {a.date} · {a.readMinutes} min
              </span>
            </div>
            <div className="font-display text-[17px] font-extrabold leading-[1.3] tracking-normal [text-wrap:pretty]">
              {a.title}
            </div>
            <div className="font-sans text-[12.5px] leading-[1.55] text-ink/55">{a.excerpt}</div>
            <div className="mt-auto flex gap-2 pt-[6px]">
              <button
                type="button"
                onClick={() => setOpenId(a.id)}
                className={cn(
                  tap,
                  "flex-1 rounded-full border-[1.5px] border-brand/50 p-[10px] text-center font-sans text-[12.5px] font-bold text-brand-deep transition-colors hover:bg-brand hover:text-night",
                )}
              >
                Editar nota
              </button>
              <button
                type="button"
                onClick={() => askDelete(a)}
                className={cn(btnDanger, "border-danger/35 px-4 py-[10px]")}
              >
                Eliminar
              </button>
            </div>
          </div>
        ))}
      </div>

      {open && (
        <ArticleModal
          key={open.id}
          article={open}
          onClose={() => close(true)}
          onDelete={() => askDelete(open)}
        />
      )}
    </div>
  );
}

function ArticleModal({
  article: a,
  onClose,
  onDelete,
}: {
  article: Article;
  onClose: () => void;
  onDelete: () => void;
}) {
  const [tab, setTab] = useState("info");
  // Título y textos del CTA viven en el header y en la vista previa.
  const [title, setTitle] = useState(a.title);
  const [ctaTitle, setCtaTitle] = useState(a.ctaTitle);
  const [ctaLabel, setCtaLabel] = useState(a.ctaLabel);
  const save = (patch: Parameters<typeof patchArticle>[1]) => patchArticle(a.id, patch);
  const field = inputCls(true);

  return (
    <ModalShell
      width={680}
      onClose={onClose}
      tabs={TABS}
      activeTab={tab}
      onTab={setTab}
      header={
        <div className="min-w-0 flex-1">
          <div className="font-sans text-[10px] font-semibold tracking-[.26em] text-brand">
            EDITOR DE NOTA
          </div>
          <div className="mt-1 truncate font-display text-lg font-extrabold tracking-normal">
            {title}
          </div>
        </div>
      }
      footer={
        <>
          <button type="button" onClick={onDelete} className={cn(btnDanger, "px-[22px] py-3")}>
            Eliminar nota
          </button>
          <button type="button" onClick={onClose} className={cn(btnDark, "px-[30px] py-[13px] text-[13.5px]")}>
            Listo ✓
          </button>
        </>
      }
    >
      <div className="animate-fade-in flex flex-col gap-3">
        {tab === "info" && (
          <>
            <Label>TÍTULO</Label>
            <AutoField<string>
              initial={a.title}
              onSave={(v) => (v.trim() ? save({ title: v }) : Promise.resolve())}
              onSaved={(v) => setTitle(v)}
              className={cn(field, "text-[15px] font-bold")}
            />
            <div className="grid gap-[10px] [grid-template-columns:repeat(auto-fit,minmax(min(160px,100%),1fr))]">
              <div>
                <Label>CATEGORÍA</Label>
                <AutoField
                  initial={a.tag}
                  onSave={(v) => save({ tag: v })}
                  placeholder="GUÍA"
                  className={cn(field, "mt-[6px] w-full py-[11px] text-[13px]")}
                />
              </div>
              <div>
                <Label>FECHA</Label>
                <AutoField
                  initial={a.date}
                  onSave={(v) => save({ date: v })}
                  placeholder="Sep 2026"
                  className={cn(field, "mt-[6px] w-full py-[11px] text-[13px]")}
                />
              </div>
              <div>
                <Label>LECTURA</Label>
                <AutoField
                  initial={`${a.readMinutes} min`}
                  onSave={(v) => save({ read: v })}
                  placeholder="4 min"
                  className={cn(field, "mt-[6px] w-full py-[11px] text-[13px]")}
                />
              </div>
            </div>
            <Label>BAJADA (PARA LAS TARJETAS)</Label>
            <AutoField
              multiline
              rows={2}
              initial={a.excerpt}
              onSave={(v) => save({ excerpt: v })}
              className={cn(field, "resize-y text-[13px] leading-[1.6]")}
            />
          </>
        )}
        {tab === "cuerpo" && (
          <>
            <Label>CUERPO — UN PÁRRAFO POR LÍNEA EN BLANCO</Label>
            <AutoField<string[]>
              multiline
              rows={14}
              initial={a.paras.join("\n\n")}
              transform={(v) => v.split(/\n\s*\n/).map((s) => s.trim()).filter(Boolean)}
              onSave={(paras) => save({ paras })}
              className={cn(field, "resize-y rounded-xl px-4 py-[14px] leading-[1.75]")}
            />
          </>
        )}
        {tab === "cta" && (
          <>
            <Label>TÍTULO DEL CIERRE</Label>
            <AutoField
              initial={a.ctaTitle}
              onSave={(v) => {
                setCtaTitle(v);
                return save({ ctaTitle: v });
              }}
              className={field}
            />
            <Label>TEXTO DEL BOTÓN</Label>
            <AutoField
              initial={a.ctaLabel}
              onSave={(v) => {
                setCtaLabel(v);
                return save({ ctaLabel: v });
              }}
              className={field}
            />
            <Label>MENSAJE PREARMADO DE WHATSAPP</Label>
            <AutoField
              initial={a.ctaMsg}
              onSave={(v) => save({ ctaMsg: v })}
              placeholder="Hola! Leí la nota y..."
              className={field}
            />
            <div className="mt-[6px] flex flex-wrap items-center justify-between gap-[14px] rounded-[14px] bg-night p-[18px] text-cream">
              <div>
                <div className="font-display text-sm font-extrabold tracking-normal">{ctaTitle}</div>
                <div className="mt-[2px] font-sans text-[11px] text-cream/55">
                  Te asesoramos por WhatsApp, sin vueltas.
                </div>
              </div>
              <span className="rounded-full bg-brand px-[18px] py-[10px] font-sans text-[11.5px] font-bold text-night">
                {ctaLabel}
              </span>
            </div>
          </>
        )}
      </div>
    </ModalShell>
  );
}
