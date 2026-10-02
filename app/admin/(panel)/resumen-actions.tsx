"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useTransition } from "react";
import { useConfirm } from "@/components/admin/confirm";
import { useToast } from "@/components/admin/toast";
import { Card, CardTitle } from "@/components/admin/ui";
import { Bolt } from "@/components/store/bolt";
import { store } from "@/lib/config";
import { lexicon } from "@/lib/data/content";
import { createAgendaEvent } from "@/lib/server/actions/agenda";
import { createArticle } from "@/lib/server/actions/articles";
import { createProduct } from "@/lib/server/actions/products";
import { resetToSeed } from "@/lib/server/actions/settings";

const quick =
  "rounded-xl border border-white/14 px-[14px] py-[10px] text-left font-sans text-[13.5px] font-semibold text-cream/75 transition-colors hover:border-brand hover:text-brand disabled:opacity-50 max-[859px]:min-h-11";

/**
 * Parte interactiva del Resumen: accesos rápidos (crean y abren el editor
 * como el prototipo), newsletter, "Más consultados", "Restablecer todo" y
 * el toast de bienvenida al entrar.
 */
export function ResumenActions({
  newLeads,
  newsInfo,
  hasSubscribers,
  top,
}: {
  newLeads: number;
  newsInfo: string;
  hasSubscribers: boolean;
  top: { label: string; n: number; pct: number }[];
}) {
  const router = useRouter();
  const params = useSearchParams();
  const toast = useToast();
  const confirm = useConfirm();
  const [pending, startTransition] = useTransition();
  const welcomed = useRef(false);

  useEffect(() => {
    if (params.get("bienvenida") && !welcomed.current) {
      welcomed.current = true;
      toast(`Bienvenido al panel de ${store.brandName}`);
      router.replace("/admin");
    }
  }, [params, router, toast]);

  function run(fn: () => Promise<void>) {
    startTransition(fn);
  }

  async function askReset() {
    const ok = await confirm({
      icon: "!",
      title: "¿Restablecer todo?",
      message:
        "Se pierden TODOS los cambios: precios, notas, agenda, textos, Nosotros, foto del local y ajustes vuelven a los valores originales.",
      label: "Sí, restablecer",
      destructive: true,
    });
    if (!ok) return;
    run(async () => {
      const res = await resetToSeed();
      toast(res.ok ? "Todo restablecido a los valores originales" : res.error);
      router.refresh();
    });
  }

  return (
    <div className="mt-[22px] grid grid-cols-[repeat(auto-fit,minmax(min(300px,100%),1fr))] gap-[14px]">
      <div
        className="relative overflow-hidden rounded-[18px] bg-night p-[26px] text-cream"
        style={{
          backgroundImage:
            "linear-gradient(rgba(94,184,56,.05) 1px,transparent 1px),linear-gradient(90deg,rgba(94,184,56,.05) 1px,transparent 1px)",
          backgroundSize: "38px 38px",
        }}
      >
        <Bolt
          width={120}
          height={160}
          stroke="#5eb838"
          strokeWidth={0.7}
          className="pointer-events-none absolute -bottom-10 right-[-16px] opacity-[.14]"
        />
        <div className="relative font-display text-[17px] font-extrabold tracking-normal">
          Acciones rápidas
        </div>
        <div className="relative mt-[14px] flex flex-col gap-2">
          <Link href="/admin/productos" className={quick}>
            → Actualizar un precio
          </Link>
          <button
            type="button"
            disabled={pending}
            className={quick}
            onClick={() =>
              run(async () => {
                const res = await createArticle();
                if (!res.ok) return toast(res.error);
                toast("Nota creada — completala y listo");
                router.push(`/admin/novedades?nota=${res.id}`);
              })
            }
          >
            → Publicar una nota nueva
          </button>
          <button
            type="button"
            disabled={pending}
            className={quick}
            onClick={() =>
              run(async () => {
                const res = await createAgendaEvent();
                if (!res.ok) return toast(res.error);
                toast(lexicon.admin.eventAdded);
                router.push("/admin/comunidad");
              })
            }
          >
            {lexicon.admin.eventQuick}
          </button>
          <button
            type="button"
            disabled={pending}
            className={quick}
            onClick={() =>
              run(async () => {
                const res = await createProduct(null);
                if (!res.ok) return toast(res.error);
                toast(lexicon.admin.productCreated);
                router.push(`/admin/productos?editar=${res.id}`);
              })
            }
          >
            {lexicon.admin.newProductQuick}
          </button>
          <Link href="/admin/consultas?filtro=nuevas" className={quick}>
            → Ver consultas nuevas ({newLeads})
          </Link>
        </div>
      </div>

      <Card className="gap-0">
        <div className="flex items-baseline justify-between gap-[10px]">
          <CardTitle>Newsletter</CardTitle>
          {hasSubscribers && (
            <a
              href="/admin/consultas/export?kind=newsletter"
              onClick={() => toast("CSV descargado")}
              className="font-sans text-xs font-bold text-brand-deep hover:text-brand-deeper"
            >
              Exportar CSV ↓
            </a>
          )}
        </div>
        <div className="mt-[10px] font-sans text-[13.5px] leading-[1.6] text-ink/60">
          {newsInfo}
        </div>
        <CardTitle className="mt-[18px]">Cambios</CardTitle>
        <div className="mt-[10px] font-sans text-[13.5px] leading-[1.6] text-ink/60">
          Todo lo que edites acá se guarda solo y la web lo muestra al instante —
          abrila en otra pestaña y probá.
        </div>
        <div>
          <button
            type="button"
            onClick={askReset}
            disabled={pending}
            className="mt-[14px] inline-block rounded-full border-[1.5px] border-danger/40 px-[18px] py-[9px] font-sans text-[12.5px] font-bold text-danger transition-colors hover:bg-danger hover:text-white disabled:opacity-50 max-[859px]:min-h-11"
          >
            Restablecer todo a los valores originales
          </button>
        </div>
      </Card>

      <Card>
        <div className="flex items-baseline justify-between gap-[10px]">
          <CardTitle>Más consultados</CardTitle>
          <Link
            href="/admin/consultas?filtro=nuevas"
            className="font-sans text-xs font-bold text-brand-deep hover:text-brand-deeper"
          >
            Ver todo →
          </Link>
        </div>
        {top.length === 0 && (
          <div className="font-sans text-[13px] leading-[1.6] text-ink/50">
            Todavía no hay consultas registradas. Aparecen cuando alguien toca
            “Consultar” en un {lexicon.unit}.
          </div>
        )}
        {top.map((t) => (
          <div key={t.label}>
            <div className="flex justify-between gap-[10px] font-sans text-[13px] font-semibold">
              <span>{t.label}</span>
              <span className="text-brand-deep">{t.n}</span>
            </div>
            <div className="mt-[6px] h-[6px] overflow-hidden rounded-full bg-cream-5">
              <div className="h-full rounded-full bg-brand" style={{ width: `${t.pct}%` }} />
            </div>
          </div>
        ))}
      </Card>
    </div>
  );
}
