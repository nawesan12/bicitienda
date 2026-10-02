/**
 * `cn` con "el último gana" para las utilidades que se pisan en el panel:
 * las piezas de ui.tsx traen padding, tamaño de letra, colores y bordes, y
 * cada uso los ajusta (`cx(btnGreen, "px-[14px]")`). Sin esto, cuál gana
 * dependería del orden del CSS generado. Cubre solo los grupos que el
 * panel pisa; el resto de las clases se concatena tal cual.
 */

const PREFIXES = [
  "min-w", "min-h", "max-w", "max-h",
  "px", "py", "pt", "pb", "pl", "pr", "p",
  "mx", "my", "mt", "mb", "ml", "mr", "m",
  "w", "h", "gap", "rounded-t", "rounded", "tracking", "leading",
  "self", "justify", "items", "opacity", "z",
];

const TEXT_SIZE = /^(xs|sm|base|lg|xl|\dxl|\[\d.*(px|rem|em)\])$/;
const FONT_WEIGHT = /^(thin|extralight|light|normal|medium|semibold|bold|extrabold|black|\[\d+\])$/;
const BORDER_WIDTH = /^(\d+|\[\d.*px\])$/;

function group(cls: string): string {
  const i = cls.lastIndexOf(":");
  const variants = i >= 0 ? cls.slice(0, i + 1) : "";
  const u = cls.slice(i + 1).replace(/!$/, "");
  const val = (p: string) => u.slice(p.length + 1);
  if (/^text-(left|center|right|justify|start|end)$/.test(u)) return variants + "text-align";
  if (u.startsWith("bg-grid")) return cls;
  if (u.startsWith("text-")) return variants + (TEXT_SIZE.test(val("text")) ? "text-size" : "text-color");
  if (u.startsWith("font-")) return variants + (FONT_WEIGHT.test(val("font")) ? "font-weight" : "font-family");
  if (/^border-[trblxy]-/.test(u)) return variants + u.slice(0, 8) + (BORDER_WIDTH.test(u.slice(9)) ? "w" : "c");
  if (u.startsWith("border-")) return variants + (BORDER_WIDTH.test(val("border")) ? "border-w" : "border-c");
  if (u.startsWith("bg-")) return variants + "bg";
  if (/^flex-(1|none|auto|initial|\[)/.test(u)) return variants + "flex-grow";
  for (const p of PREFIXES) if (u === p || u.startsWith(`${p}-`)) return variants + p;
  return cls;
}

export function cx(...classes: (string | false | null | undefined)[]): string {
  const out = new Map<string, string>();
  for (const c of classes) {
    if (!c) continue;
    for (const cls of c.split(/\s+/)) {
      if (!cls) continue;
      const g = group(cls);
      out.delete(g);
      out.set(g, cls);
    }
  }
  return [...out.values()].join(" ");
}
