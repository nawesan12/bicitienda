"use client";

import type { AnchorHTMLAttributes, ReactNode } from "react";
import { waUrl, type WaContext } from "@/lib/whatsapp";
import type { LeadType } from "@/lib/types";

/**
 * Botón/link de WhatsApp que registra la consulta (lead) y abre el chat.
 * El registro no bloquea: va por `navigator.sendBeacon` a /api/leads (el
 * navegador lo entrega aunque la pestaña pase a WhatsApp) y, si no hay
 * beacon, por fetch keepalive. El href es el link real a wa.me, así
 * funciona igual sin JS o con click del medio.
 *
 *   <WaLink whatsapp={runtime.whatsapp} {...wa.product(p.name)}>Consultar</WaLink>
 *   <WaLink whatsapp={…} type="general" label="Botón de WhatsApp general" detail="">…</WaLink>
 */

type Props = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href" | "type"> &
  Partial<Pick<WaContext, "message">> & {
    /** Número de la tienda (getStore().whatsapp). */
    whatsapp: string;
    type: LeadType;
    label: string;
    detail?: string;
    /** Link alternativo (p. ej. el grupo de la comunidad) en vez de wa.me. */
    href?: string;
    children: ReactNode;
  };

function sendLead(type: LeadType, label: string, detail: string) {
  const payload = JSON.stringify({ type, label, detail });
  try {
    if (navigator.sendBeacon?.("/api/leads", new Blob([payload], { type: "application/json" })))
      return;
  } catch {
    /* sin beacon: fetch keepalive */
  }
  void fetch("/api/leads", {
    method: "POST",
    body: payload,
    headers: { "Content-Type": "application/json" },
    keepalive: true,
  }).catch(() => {});
}

export function WaLink({
  whatsapp,
  message,
  type,
  label,
  detail = "",
  href,
  onClick,
  children,
  ...rest
}: Props) {
  return (
    <a
      href={href ?? waUrl(whatsapp, message)}
      target="_blank"
      rel="noopener noreferrer"
      {...rest}
      onClick={(e) => {
        sendLead(type, label, detail);
        onClick?.(e);
      }}
    >
      {children}
    </a>
  );
}
