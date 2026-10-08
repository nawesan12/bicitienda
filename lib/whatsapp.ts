import { leadLabels, waMessages } from "@/lib/data/content";
import { normalizeArPhone } from "@/lib/phone";
import type { LeadType } from "@/lib/types";

/**
 * WhatsApp del core: arma los links `wa.me` y el lead que registra cada
 * botón. El copy (mensajes y etiquetas) es de la tienda y vive en
 * lib/data/content.ts; acá solo está la forma. El número sale siempre de
 * getStore() (editable en Ajustes), nunca hardcodeado.
 */

/**
 * Link al chat; sin mensaje abre el chat vacío (el `waHome` del prototipo).
 * El número pasa por `normalizeArPhone`: wa.me necesita 549 + característica
 * ("2235351524" sin prefijo abre un chat de otro país). Si no es un número
 * argentino válido, quedan sus dígitos tal cual.
 */
export function waUrl(whatsapp: string, message?: string): string {
  const number = normalizeArPhone(whatsapp) ?? whatsapp.replace(/\D/g, "");
  return message
    ? `https://wa.me/${number}?text=${encodeURIComponent(message)}`
    : `https://wa.me/${number}`;
}

/** Lo que necesita <WaLink>: mensaje + consulta a registrar. */
export interface WaContext {
  message?: string;
  type: LeadType;
  label: string;
  detail: string;
}

/** Contextos prearmados del prototipo (mensaje + lead de cada botón). */
export const wa = {
  /** Botón general (nav, flotante, footer, local): chat sin texto. */
  general(): WaContext {
    return { type: "general", label: leadLabels.general, detail: "" };
  },
  product(name: string): WaContext {
    return {
      message: waMessages.product(name),
      type: "producto",
      label: name,
      detail: leadLabels.productDetail,
    };
  },
  repair(): WaContext {
    return {
      message: waMessages.repair,
      type: "reparacion",
      label: leadLabels.repair,
      detail: "",
    };
  },
  repairForm(f: { tipo: string; modelo: string; problema: string }): WaContext {
    return {
      message: waMessages.repairForm(f),
      type: "reparacion",
      label: f.tipo + (f.modelo.trim() ? " · " + f.modelo.trim() : ""),
      detail: f.problema.trim(),
    };
  },
  financing(productName: string | null): WaContext {
    return {
      message: waMessages.financing(productName),
      type: "financiacion",
      label: productName ?? leadLabels.financing,
      detail: leadLabels.financingDetail,
    };
  },
  /** Sin link del grupo: escribe al local pidiendo sumarse. */
  community(): WaContext {
    return {
      message: waMessages.community,
      type: "comunidad",
      label: leadLabels.community,
      detail: "",
    };
  },
  /** CTA de WhatsApp de una nota. */
  article(title: string, ctaLabel: string, ctaMsg: string): WaContext {
    return {
      message: ctaMsg || waMessages.articleFallback,
      type: "nota",
      label: title,
      detail: ctaLabel,
    };
  },
};
