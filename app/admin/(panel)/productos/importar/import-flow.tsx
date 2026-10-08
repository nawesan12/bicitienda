"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  Button,
  Kpi,
  KpiGrid,
  Panel,
  PanelTitle,
  Pill,
  UploadDropzone,
  buttonClasses,
  cx,
} from "@/components/bt";
import { commitImport, previewImport } from "@/lib/server/actions/product-import";
import type { ImportPreview } from "@/lib/server/product-import";

const ACTION_LABEL = { crear: "Nuevo", actualizar: "Actualiza", sin_cambios: "Sin cambios" } as const;
const ACTION_TONE = { crear: "yellow", actualizar: "line", sin_cambios: "muted" } as const;

/** Subida → vista previa (errores por fila) → confirmar. */
export function ImportFlow() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [done, setDone] = useState<ImportPreview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const send = (commit: boolean) => {
    if (!file) return;
    setError(null);
    start(async () => {
      const fd = new FormData();
      fd.set("file", file);
      const r = await (commit ? commitImport(fd) : previewImport(fd));
      if (!r.ok) return setError(r.error);
      if (commit && r.preview.ok) {
        setDone(r.preview);
        setPreview(null);
        router.refresh();
      } else setPreview(r.preview);
    });
  };

  const p = preview;
  return (
    <div className="flex min-w-0 flex-col gap-5">
      <Panel surface="surface" padding="lg" gap="lg">
        <PanelTitle>1 · Bajá la plantilla</PanelTitle>
        <p className="m-0 text-[15px] leading-[1.5] text-text-2">
          CSV separado por “;” que Excel abre en columnas. También podés subir un .xlsx con los mismos encabezados.
        </p>
        <a href="/admin/productos/plantilla" download className={cx(buttonClasses({ variant: "secondary", size: "md" }), "self-start")}>
          Descargar plantilla
        </a>
      </Panel>

      <Panel surface="surface" padding="lg" gap="lg">
        <PanelTitle>2 · Subí la planilla</PanelTitle>
        <UploadDropzone
          label="Elegí el CSV o Excel"
          hint="(hasta 4 MB)"
          accept=".csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          selected={file?.name}
          onChange={(e) => {
            setFile(e.target.files?.[0] ?? null);
            setPreview(null);
            setDone(null);
            setError(null);
          }}
        />
        {error && <p className="m-0 text-[14px] font-semibold text-red-light">{error}</p>}
        <Button variant="primary" size="md" className="self-start" disabled={!file || pending} onClick={() => send(false)}>
          {pending && !p ? "Revisando…" : "Ver vista previa"}
        </Button>
      </Panel>

      {done && (
        <Panel surface="yellow" padding="lg" gap="md">
          <PanelTitle>Listo: planilla importada</PanelTitle>
          <p className="m-0 text-[15px] font-medium">
            {done.summary.productsNew} productos nuevos · {done.summary.productsUpdated} actualizados ·{" "}
            {done.summary.variantsNew} variantes nuevas · {done.summary.stockChanges} cambios de stock.
          </p>
          <Link href="/admin/productos" className={cx(buttonClasses({ variant: "ink", size: "md" }), "self-start")}>
            Ver productos
          </Link>
        </Panel>
      )}

      {p && (
        <Panel surface="surface" padding="lg" gap="lg">
          <PanelTitle
            action={
              <span className={cx("font-mono text-[12px] font-semibold", p.ok ? "text-text-3" : "text-red-light")}>
                {p.rows} {p.rows === 1 ? "fila" : "filas"} · {p.errors.length} {p.errors.length === 1 ? "error" : "errores"}
              </span>
            }
          >
            3 · Revisá y confirmá
          </PanelTitle>
          <KpiGrid columns={4}>
            <Kpi size="sm" label="Productos nuevos" value={p.summary.productsNew} tone="yellow" />
            <Kpi size="sm" label="Actualizados" value={p.summary.productsUpdated} />
            <Kpi size="sm" label="Variantes nuevas" value={p.summary.variantsNew} />
            <Kpi size="sm" label="Cambios de stock" value={p.summary.stockChanges} />
          </KpiGrid>

          {(p.newCategories?.length ?? 0) > 0 && (
            <p className="m-0 text-[14px] leading-[1.5] text-text-2">
              Se {p.newCategories!.length === 1 ? "crea la categoría" : "crean las categorías"}{" "}
              <strong className="text-paper">{p.newCategories!.join(", ")}</strong> (sin grupo del menú; después la
              ubicás en Categorías).
            </p>
          )}

          {p.errors.length > 0 && (
            <div className="flex flex-col rounded-box border border-red-light/60">
              <p className="m-0 px-4 py-3 text-[14px] font-bold text-red-light">
                Corregí estas filas y volvé a subir la planilla. No se importa nada mientras haya errores.
              </p>
              <ul className="m-0 flex max-h-[360px] list-none flex-col overflow-y-auto p-0">
                {p.errors.map((e, i) => (
                  <li key={i} className="grid grid-cols-[72px_minmax(0,1fr)] gap-3 border-t border-line px-4 py-[10px] text-[14px]">
                    <span className="font-mono text-[12px] font-semibold text-red-light">Fila {e.row}</span>
                    <span className="text-text-2">
                      {e.field && <span className="font-mono text-[12px] text-text-3">{e.field} · </span>}
                      {e.message}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {p.products.length > 0 && (
            <ul className="m-0 flex list-none flex-col overflow-hidden rounded-box border border-line p-0">
              {p.products.map((prod) => (
                <li key={prod.sku} className="flex flex-col gap-2 border-t border-line px-4 py-3 first:border-t-0">
                  <div className="flex items-center justify-between gap-3">
                    <span className="flex min-w-0 flex-col">
                      <span className="truncate text-[14px] font-bold">{prod.name || "(sin nombre)"}</span>
                      <span className="font-mono text-[12px] font-semibold text-text-3">{prod.sku}</span>
                    </span>
                    <Pill tone={ACTION_TONE[prod.action]} size="sm">
                      {ACTION_LABEL[prod.action]}
                    </Pill>
                  </div>
                  {prod.variants.some((v) => v.size !== "Único" || v.color) && (
                    <p className="m-0 font-mono text-[12px] font-semibold text-text-2">
                      {prod.variants
                        .map(
                          (v) =>
                            `${[v.size, v.color].filter(Boolean).join(" ")}${
                              v.stock != null && v.stock !== v.stockBefore ? ` ${v.stockBefore}→${v.stock}` : v.stock != null ? ` ${v.stock}` : ""
                            }`,
                        )
                        .join(" · ")}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          )}

          <div className="flex flex-wrap gap-3">
            <Button variant="primary" size="md" disabled={!p.ok || pending} onClick={() => send(true)}>
              {pending ? "Importando…" : "Confirmar importación"}
            </Button>
            <Button variant="secondary" size="md" disabled={pending} onClick={() => setPreview(null)}>
              Descartar
            </Button>
          </div>
        </Panel>
      )}
    </div>
  );
}
