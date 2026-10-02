"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { useToast } from "@/components/admin/toast";
import {
  Badge,
  Card,
  CardTitle,
  EmptyState,
  Lead as Intro,
  roundBtn,
  statePill,
  tabPill,
} from "@/components/admin/ui";
import { store } from "@/lib/config";
import { cx as cn } from "@/components/admin/cx";
import { formatDateTime } from "@/lib/format";
import { adjustStock, setStockAt, setStockOverride } from "@/lib/server/actions/products";
import { sendStockAlerts } from "@/lib/server/actions/stock-alerts";
import type { AdminProduct, LedgerEntry } from "@/lib/server/admin-queries";
import { isOut, productPhoto } from "../productos/product-utils";

type Reason = "ajuste" | "reposicion";

const REASONS: [Reason, string][] = [
  ["ajuste", "Ajuste de inventario"],
  ["reposicion", "Reposición"],
];

const REASON_LABEL: Record<string, string> = {
  seed: "Carga inicial",
  venta: "Venta",
  cancelacion: "Cancelación",
  vencimiento: "Reserva vencida",
  ajuste: "Ajuste",
  transferencia: "Transferencia",
  reposicion: "Reposición",
};

const FILTERS: [key: string, label: string][] = [
  ["todos", "Todos"],
  ["sin", "Sin stock"],
  ["bajo", "Stock bajo"],
  ["con", "Con unidades"],
];

/**
 * Stock del local: cantidades por producto (por sucursal si hay más de
 * una), +/− y "fijar" con motivo — todo pasa por el libro de movimientos —,
 * el override "sin stock" y el libro con los últimos movimientos. Con una
 * sola sucursal no hay transferencias.
 */
export function StockManager({
  products,
  locations,
  ledger,
}: {
  products: AdminProduct[];
  locations: { id: string; name: string }[];
  ledger: (Omit<LedgerEntry, "createdAt"> & { createdAt: string })[];
}) {
  const [reason, setReason] = useState<Reason>("ajuste");
  const [filter, setFilter] = useState("todos");
  const [q, setQ] = useState("");

  const list = useMemo(() => {
    let r = products;
    if (filter === "sin") r = r.filter(isOut);
    if (filter === "bajo") r = r.filter((p) => p.stock > 0 && p.stock <= store.lowStock);
    if (filter === "con") r = r.filter((p) => p.stock > 0);
    if (q.trim()) {
      const needle = q.trim().toLowerCase();
      r = r.filter((p) => `${p.name} ${p.brandName}`.toLowerCase().includes(needle));
    }
    return r;
  }, [products, filter, q]);

  const count = (k: string) =>
    k === "sin"
      ? products.filter(isOut).length
      : k === "bajo"
        ? products.filter((p) => p.stock > 0 && p.stock <= store.lowStock).length
        : k === "con"
          ? products.filter((p) => p.stock > 0).length
          : products.length;

  return (
    <div className="animate-fade-in">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <Intro>
          Las unidades del local. Con cero unidades el modelo se muestra “Sin stock” en
          la web; cada venta las descuenta sola. Todo ajuste queda en el libro de
          movimientos con su motivo.
        </Intro>
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-sans text-[10.5px] font-bold tracking-[.18em] text-ink/50">
            MOTIVO
          </span>
          {REASONS.map(([k, label]) => (
            <button key={k} type="button" onClick={() => setReason(k)} className={tabPill(reason === k, true)}>
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="mb-[14px] flex flex-wrap items-center gap-2">
        {FILTERS.map(([k, label]) => (
          <button
            key={k}
            type="button"
            onClick={() => setFilter(k)}
            className={cn(tabPill(filter === k, true), "gap-2")}
          >
            {label}
            <span className="font-sans text-[10.5px] font-bold opacity-60">{count(k)}</span>
          </button>
        ))}
        <span className="flex-1" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar producto…"
          aria-label="Buscar producto"
          className="box-border min-w-[190px] rounded-full border-[1.5px] border-ink/15 bg-white px-[18px] py-[10px] font-sans text-[13px] outline-none focus:border-brand max-[859px]:min-h-11 max-[859px]:flex-1"
        />
      </div>

      <div className="grid items-start gap-[18px] min-[1200px]:grid-cols-[minmax(0,1fr)_380px]">
        <div className="flex flex-col gap-[10px]">
          {list.length === 0 && <EmptyState title="No hay productos en este filtro" />}
          {list.map((p) => (
            <StockRow key={p.id} product={p} locations={locations} reason={reason} />
          ))}
        </div>

        <Card className="min-[1200px]:sticky min-[1200px]:top-6">
          <CardTitle>Movimientos</CardTitle>
          {ledger.length === 0 ? (
            <div className="font-sans text-[13px] text-ink/50">Todavía no hay movimientos.</div>
          ) : (
            <div className="flex max-h-[70vh] flex-col overflow-y-auto">
              {ledger.map((m) => (
                <div
                  key={m.id}
                  className="flex items-start justify-between gap-3 border-b border-ink/8 py-[10px] last:border-none"
                >
                  <div className="min-w-0">
                    <div className="truncate font-sans text-[13px] font-bold">{m.productName}</div>
                    <div className="font-sans text-[11.5px] text-ink/50">
                      {formatDateTime(m.createdAt)} · {REASON_LABEL[m.reason] ?? m.reason}
                      {locations.length > 1 && ` · ${m.location}`}
                      {m.orderNumber && (
                        <>
                          {" · "}
                          <Link
                            href={`/admin/pedidos/${m.orderNumber}`}
                            className="font-bold text-brand-deep hover:underline"
                          >
                            #{m.orderNumber}
                          </Link>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="flex-none text-right">
                    <div
                      className={cn(
                        "font-display text-[15px] tracking-normal",
                        m.delta > 0 ? "text-brand-deep" : "text-danger",
                      )}
                    >
                      {m.delta > 0 ? `+${m.delta}` : `−${Math.abs(m.delta)}`}
                    </div>
                    <div className="font-sans text-[10.5px] text-ink/45">queda {m.qtyAfter}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

function StockRow({
  product: p,
  locations,
  reason,
}: {
  product: AdminProduct;
  locations: { id: string; name: string }[];
  reason: Reason;
}) {
  const toast = useToast();
  const [pending, startTransition] = useTransition();
  const out = isOut(p);
  const forced = p.stockOverride === "sin_stock";

  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-[14px] rounded-2xl border-[1.5px] bg-white px-4 py-3 transition-colors hover:border-brand",
        out ? "border-danger/25" : "border-ink/10",
      )}
    >
      <Link
        href={`/admin/productos?editar=${p.id}`}
        className="flex min-w-[220px] flex-1 items-center gap-[14px] text-ink transition-colors hover:text-brand-deep"
      >
        <div
          className="box-border flex h-[52px] w-[62px] flex-none items-center justify-center rounded-[10px] p-[5px]"
          style={{ background: "repeating-linear-gradient(-45deg,#f7f6f1 0 10px,#efeee7 10px 20px)" }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={productPhoto(p.images, 160)}
            alt={p.name}
            loading="lazy"
            className="max-h-full max-w-full object-contain mix-blend-multiply"
          />
        </div>
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-display text-[15px] font-extrabold tracking-normal">{p.name}</span>
            {p.hidden && <Badge className="bg-ink text-cream">OCULTO</Badge>}
          </div>
          <div className="font-sans text-[11.5px] text-ink/50">
            {p.brandName} · {p.categoryLabel}
          </div>
        </div>
      </Link>

      <div className="flex flex-wrap items-center gap-2">
        {locations.map((l) => (
          <QtyControl
            key={l.id}
            product={p}
            location={l}
            showName={locations.length > 1}
            reason={reason}
          />
        ))}
        <span
          className={cn(
            "whitespace-nowrap rounded-full px-3 py-[7px] font-sans text-[11px] font-bold tracking-[.08em]",
            out ? "bg-danger-bg text-danger" : "bg-brand-pastel text-brand-deeper",
          )}
        >
          {out ? "SIN STOCK" : `${p.stock} EN STOCK`}
        </span>
        <button
          type="button"
          disabled={pending}
          title="Mostrar “Sin stock” aunque haya unidades"
          onClick={() =>
            startTransition(async () => {
              await setStockOverride(p.id, !forced);
              toast(forced ? `${p.name}: vuelve a mandar la cantidad` : `${p.name}: forzado sin stock`);
            })
          }
          className={statePill(
            forced ? "border-danger/50 bg-danger text-white" : "border-ink/18 bg-white text-ink/50",
          )}
        >
          {forced ? "✓ FORZADO SIN STOCK" : "FORZAR SIN STOCK"}
        </button>
        {p.pendingAlerts > 0 && (
          <button
            type="button"
            disabled={pending || out}
            title={out ? "Cargá unidades para poder avisar" : undefined}
            onClick={() =>
              startTransition(async () => {
                const { sent } = await sendStockAlerts(p.id);
                toast(sent ? `Aviso enviado a ${sent} interesados` : "No había avisos pendientes");
              })
            }
            className={statePill("border-brand/50 bg-white text-brand-deeper disabled:opacity-50")}
          >
            AVISAR A {p.pendingAlerts}
          </button>
        )}
      </div>
    </div>
  );
}

function QtyControl({
  product: p,
  location,
  showName,
  reason,
}: {
  product: AdminProduct;
  location: { id: string; name: string };
  showName: boolean;
  reason: Reason;
}) {
  const toast = useToast();
  const [pending, startTransition] = useTransition();
  const qty = p.stockByLocation[location.id] ?? 0;
  const [draft, setDraft] = useState<string | null>(null);

  function done(res: { ok: true; qtyAfter: number } | { ok: false; error: string }) {
    if (!res.ok) return toast(res.error);
    toast(`${p.name}: ${res.qtyAfter} ${res.qtyAfter === 1 ? "unidad" : "unidades"}`);
  }

  function commit() {
    if (draft === null) return;
    const n = parseInt(draft.replace(/\D/g, ""), 10);
    setDraft(null);
    if (!Number.isFinite(n) || n === qty) return;
    startTransition(async () => {
      done(await setStockAt({ id: p.id, locationId: location.id, qty: n, reason }));
    });
  }

  function step(delta: number) {
    startTransition(async () => {
      done(await adjustStock({ id: p.id, locationId: location.id, delta, reason }));
    });
  }

  return (
    <div className="flex items-center gap-[6px]">
      {showName && (
        <span className="font-sans text-[10.5px] font-bold tracking-[.12em] text-ink/45">
          {location.name.toUpperCase()}
        </span>
      )}
      <button
        type="button"
        aria-label="Restar una unidad"
        disabled={pending || qty <= 0}
        onClick={() => step(-1)}
        className={cn(roundBtn(), "disabled:opacity-40")}
      >
        −
      </button>
      <input
        value={draft ?? String(qty)}
        inputMode="numeric"
        aria-label={`Unidades de ${p.name}${showName ? ` en ${location.name}` : ""}`}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") (e.target as HTMLInputElement).blur();
        }}
        className="box-border h-[34px] w-14 rounded-[10px] border-[1.5px] border-ink/15 bg-cream-3 text-center font-display text-[15px] tracking-normal outline-none focus:border-brand max-[859px]:h-11"
      />
      <button
        type="button"
        aria-label="Sumar una unidad"
        disabled={pending}
        onClick={() => step(1)}
        className={roundBtn()}
      >
        +
      </button>
    </div>
  );
}
