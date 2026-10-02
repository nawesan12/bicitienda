/**
 * Teléfonos de WhatsApp de Argentina. Se guardan normalizados en el
 * formato que espera wa.me: 54 + 9 + característica + número (13 dígitos,
 * p. ej. "5492235550182"). Acepta lo que escribe la gente:
 *
 *   "223 555-0182" · "0223 15 555-0182" · "+54 9 223 555 0182" · "2235550182"
 *
 * Regla: el número nacional (característica + número, sin 0 ni 15) tiene
 * que tener 10 dígitos. Sin dependencias: corre en el server y en el
 * navegador.
 */

/** Número nacional de 10 dígitos o null. */
function nationalNumber(input: string): string | null {
  let d = input.replace(/\D/g, "");
  if (d.startsWith("00")) d = d.slice(2);
  if (d.startsWith("54")) {
    d = d.slice(2);
    if (d.startsWith("9")) d = d.slice(1);
  }
  if (d.startsWith("0")) d = d.slice(1);
  if (d.length === 10) return d;
  // Con el "15" del celular después de la característica (2, 3 o 4 dígitos).
  if (d.length === 12) {
    for (const areaLen of [2, 3, 4]) {
      if (d.slice(areaLen, areaLen + 2) === "15") {
        const n = d.slice(0, areaLen) + d.slice(areaLen + 2);
        if (n.length === 10) return n;
      }
    }
  }
  return null;
}

/** "5492235550182" o null si no es un WhatsApp argentino válido. */
export function normalizeArPhone(input: string | null | undefined): string | null {
  if (!input) return null;
  const n = nationalNumber(input);
  return n ? `549${n}` : null;
}

/** true si el texto es un WhatsApp argentino válido (10 dígitos con característica). */
export function isValidArPhone(input: string | null | undefined): boolean {
  return normalizeArPhone(input) !== null;
}

/**
 * Formato visible: "223 555-0182" (característica de 3 dígitos, la más
 * común en el interior). Con otra longitud de característica queda
 * "11 5555-0182" o "2214 55-0182" según corresponda a 2/4 dígitos: como no
 * se puede saber sin una tabla, se usa 2 para "11" y 3 para el resto.
 */
export function formatArPhone(normalized: string | null | undefined): string {
  if (!normalized) return "";
  const n = nationalNumber(normalized);
  if (!n) return normalized;
  const areaLen = n.startsWith("11") ? 2 : 3;
  const area = n.slice(0, areaLen);
  const rest = n.slice(areaLen);
  return `${area} ${rest.slice(0, rest.length - 4)}-${rest.slice(-4)}`;
}
