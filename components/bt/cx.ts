import { extendTailwindMerge } from "tailwind-merge";

/**
 * tailwind-merge con los tokens de `app/theme.css` (radios, spacing y
 * `stretch-*`), para que una clase pasada por `className` le gane a la
 * del componente aunque sean de la misma propiedad.
 */
const merge = extendTailwindMerge<"stretch">({
  // En Tailwind 4 `text-[…]` no pisa el line-height: font-size y leading
  // no compiten (tailwind-merge los trata como en v3 y borraría `leading-*`).
  override: {
    conflictingClassGroups: { "font-size": [] },
  },
  extend: {
    theme: {
      radius: ["tag", "btn", "box", "card", "pill"],
      spacing: ["content", "wide", "gutter", "gutter-admin"],
    },
    classGroups: {
      stretch: [{ stretch: [(v: string) => /^\d+$/.test(v)] }],
    },
  },
});

/** Une clases condicionales (descarta los falsy) y resuelve conflictos de Tailwind: gana la última. */
export function cx(...classes: (string | false | null | undefined)[]): string {
  return merge(classes.filter(Boolean).join(" "));
}
