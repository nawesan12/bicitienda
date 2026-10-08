"use client";

import Link from "next/link";
import { useRef, useState, useTransition } from "react";
import { useToast } from "@/components/admin/toast";
import { Button, buttonClasses, ClosedNote, cx, Eyebrow, FormError, Input, MessageBox, Modal, Mono, QuotePill } from "@/components/bt";
import { QuoteLinesEditor, type QuoteLineDraft } from "./quote-lines-editor";
import { formatMoney } from "@/components/bt/format";
import { adminAdvanceQuote, adminPatchQuote, adminRejectQuote, adminSetQuoteLines } from "@/lib/server/actions/quotes";
import type { QuoteDetail } from "@/lib/server/screens/admin-d1";

function validLabel(date: string | null): string {
  if (!date) return "—";
  const meses = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
  return `Hasta el ${Number(date.slice(8, 10))} ${meses[Number(date.slice(5, 7)) - 1]}`;
}

const sameLines = (a: QuoteLineDraft[], b: QuoteLineDraft[]) =>
  JSON.stringify(a.map((l) => [l.name.trim(), l.price, l.quantity])) === JSON.stringify(b.map((l) => [l.name.trim(), l.price, l.quantity]));

/**
 * Panel de cotización (5b): lo que pide el cliente, editor de ítems (se
 * guarda al salir de cada campo), demora y validez, total en vivo y el
 * botón amarillo de lib/quote-flow.ts: Enviar por WhatsApp (abre wa.me
 * con la cotización y pasa a Cotizado) → Marcar como aceptado → Crear
 * pedido. "Rechazar" mientras esté abierto; cerrado = ClosedNote.
 */
export function QuotePanel({ quote }: { quote: QuoteDetail }) {
  const toast = useToast();
  const [pending, start] = useTransition();
  const [lines, setLines] = useState<QuoteLineDraft[]>(quote.lines);
  const saved = useRef<QuoteLineDraft[]>(quote.lines);
  const [eta, setEta] = useState(quote.eta);
  const [valid, setValid] = useState(quote.validUntil ?? "");
  const [error, setError] = useState<string | null>(null);
  const [rejectOpen, setRejectOpen] = useState(false);
  const total = lines.reduce((s, l) => s + l.price * l.quantity, 0);

  async function persistLines(next: QuoteLineDraft[]): Promise<boolean> {
    const clean = next.filter((l) => l.name.trim());
    if (sameLines(clean, saved.current)) return true;
    const res = await adminSetQuoteLines(
      quote.id,
      clean.map((l) => ({ name: l.name.trim(), price: l.price, quantity: l.quantity, productSlug: l.productSlug ?? null, variantId: l.variantId ?? null })),
    );
    if (!res.ok) {
      setError(res.error);
      return false;
    }
    saved.current = clean;
    return true;
  }

  function commitLines(next: QuoteLineDraft[]) {
    setError(null);
    start(async () => {
      // Las actions invalidan el panel: Next re-renderiza en la misma respuesta.
      await persistLines(next);
    });
  }

  function patch(p: { eta?: string; validUntil?: string | null }) {
    setError(null);
    start(async () => {
      const res = await adminPatchQuote(quote.id, p);
      if (!res.ok) setError(res.error);
    });
  }

  function advance() {
    if (!quote.next) return;
    setError(null);
    // wa.me se abre en el click (si no, el navegador bloquea la ventana).
    const win = quote.next.to === "cotizado" ? window.open("", "_blank") : null;
    start(async () => {
      if (!(await persistLines(lines))) {
        win?.close();
        return;
      }
      const res = await adminAdvanceQuote(quote.id, { expectedFrom: quote.status });
      if (!res.ok) {
        win?.close();
        setError(res.error);
        return;
      }
      if (win && res.whatsappUrl) win.location.href = res.whatsappUrl;
      else win?.close();
      toast(
        res.status === "cotizado"
          ? "Presupuesto enviado · quedó Cotizado"
          : res.status === "aceptado"
            ? "Presupuesto aceptado"
            : `Pedido #${res.orderNumber} creado`,
      );
    });
  }

  function reject() {
    setError(null);
    start(async () => {
      const res = await adminRejectQuote(quote.id);
      if (!res.ok) return setError(res.error);
      setRejectOpen(false);
      toast("Presupuesto rechazado");
    });
  }

  return (
    <div className="flex min-w-0 flex-col gap-[18px] rounded-card border border-line bg-surface p-4 md:p-6">
      <div className="flex items-start justify-between gap-3">
        <Mono size={12} className="pt-[3px]">
          {quote.meta}
        </Mono>
        <QuotePill status={quote.status} />
      </div>

      <div className="flex flex-col gap-1">
        <h2 className="m-0 text-[36px] font-black uppercase leading-[.95] stretch-70 max-md:text-[32px]">{quote.title}</h2>
        <span className="text-[14px] text-text-2">{quote.customerLine}</span>
      </div>

      <div className="flex flex-col gap-2">
        <Eyebrow>Lo que pide · {quote.kind}</Eyebrow>
        <MessageBox meta={[quote.forBike && `Para: ${quote.forBike}`, quote.budget && `Presupuesto: ${quote.budget}`]}>{quote.detail}</MessageBox>
        {quote.photos.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {quote.photos.map((src, i) => (
              <a key={src} href={src} target="_blank" rel="noopener noreferrer" className="block rounded-btn focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-yellow">
                {/* eslint-disable-next-line @next/next/no-img-element -- foto privada servida al admin */}
                <img src={src} alt={`Foto ${i + 1} del cliente`} className="block h-16 w-16 rounded-btn border border-line object-cover" />
              </a>
            ))}
          </div>
        )}
      </div>

      <div className="flex flex-col">
        <Eyebrow className="pb-2">Cotización</Eyebrow>
        <QuoteLinesEditor lines={lines} onChange={setLines} onCommit={commitLines} readOnly={!quote.open} />
      </div>

      <div className="grid grid-cols-2 gap-[10px] pt-1">
        <label className="flex flex-col gap-2">
          <Eyebrow>Demora</Eyebrow>
          {quote.open ? (
            <Input
              surface="panel"
              size="sm"
              value={eta}
              placeholder="30 a 45 días"
              maxLength={80}
              onChange={(e) => setEta(e.target.value)}
              onBlur={() => eta !== quote.eta && patch({ eta })}
              className="border-line-strong"
            />
          ) : (
            <span className="text-[14px]">{quote.eta || "—"}</span>
          )}
        </label>
        <label className="flex flex-col gap-2">
          <Eyebrow>Válido</Eyebrow>
          {quote.open ? (
            <Input
              surface="panel"
              size="sm"
              type="date"
              value={valid}
              onChange={(e) => setValid(e.target.value)}
              onBlur={() => valid !== (quote.validUntil ?? "") && patch({ validUntil: valid || null })}
              className="border-line-strong [color-scheme:dark]"
            />
          ) : (
            <span className="text-[14px]">{validLabel(quote.validUntil)}</span>
          )}
        </label>
      </div>

      <div className="flex items-baseline justify-between gap-3 pt-4">
        <span className="text-[14px] font-extrabold uppercase tracking-[.06em]">Total</span>
        <span className="whitespace-nowrap text-[34px] font-black leading-none text-yellow stretch-72">{formatMoney(total)}</span>
      </div>

      <FormError>{!rejectOpen ? error : null}</FormError>

      {quote.open && quote.next ? (
        <>
          <Button variant="primary" size="full" disabled={pending || !lines.some((l) => l.name.trim())} onClick={advance}>
            {pending ? "Guardando…" : quote.next.label}
          </Button>
          <div className="grid grid-cols-2 gap-[10px]">
            <a href={quote.whatsappUrl} target="_blank" rel="noopener noreferrer" className={buttonClasses({ variant: "secondary", size: "sm" })}>
              WhatsApp
            </a>
            <Button variant="danger" size="sm" disabled={pending} onClick={() => setRejectOpen(true)}>
              Rechazar
            </Button>
          </div>
        </>
      ) : (
        <ClosedNote
          action={
            quote.orderNumber ? (
              <Link href={`/admin/pedidos?sel=${quote.orderNumber}`} className={cx("text-[13px] font-extrabold uppercase tracking-[.06em] text-yellow hover:text-brand-hover")}>
                Ver pedido #{quote.orderNumber} →
              </Link>
            ) : undefined
          }
        >
          {quote.closedNote}
        </ClosedNote>
      )}

      <Modal
        open={rejectOpen}
        onClose={() => setRejectOpen(false)}
        title="Rechazar"
        width={420}
        footer={
          <>
            <Button variant="secondary" size="sm" onClick={() => setRejectOpen(false)}>
              Volver
            </Button>
            <Button variant="danger" size="sm" disabled={pending} onClick={reject}>
              {pending ? "Guardando…" : "Sí, rechazar"}
            </Button>
          </>
        }
      >
        <p className="m-0 text-[15px] leading-[1.5] text-text-2">El presupuesto #{quote.number} se cierra sin compra. No se le avisa al cliente.</p>
        <FormError>{error}</FormError>
      </Modal>
    </div>
  );
}
