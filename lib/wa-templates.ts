/**
 * Plantillas de WhatsApp: render puro de las variables del handoff
 * ({nombre} {día} {hora} {servicio} {producto} {número} {link}). Sin
 * envío automático: el resultado se abre como link wa.me (lib/whatsapp.ts).
 * Una variable sin valor queda vacía; una desconocida queda tal cual.
 */

export const TEMPLATE_VARIABLES = [
  "nombre",
  "día",
  "hora",
  "servicio",
  "producto",
  "número",
  "link",
] as const;

export type TemplateVariable = (typeof TEMPLATE_VARIABLES)[number];
export type TemplateValues = Partial<Record<TemplateVariable, string | null | undefined>>;

/** Alias sin tilde: {dia} y {numero} también funcionan. */
const ALIASES: Record<string, TemplateVariable> = { dia: "día", numero: "número" };

export function renderTemplate(body: string, values: TemplateValues): string {
  return body
    .replace(/\{([a-záéíóúñ]+)\}/gi, (match, raw: string) => {
      const key = raw.toLowerCase();
      const name = (ALIASES[key] ?? key) as TemplateVariable;
      if (!(TEMPLATE_VARIABLES as readonly string[]).includes(name)) return match;
      return values[name] ?? "";
    })
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}
