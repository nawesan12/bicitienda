import type { Spec } from "@/lib/types";

/**
 * Especificaciones: orden fijo de la ficha, campos del editor del admin y
 * métricas del comparador ("Lo esencial"). Funciones puras, portadas tal
 * cual del prototipo del handoff — no cambiar el parseo sin revisar el
 * comparador, que depende de cómo vienen escritos los valores del catálogo.
 */

/** Orden fijo de la ficha. Las specs extra van después, en su orden. */
export const SPEC_KEYS = [
  "Velocidad",
  "Autonomía",
  "Motor",
  "Batería",
  "Peso",
  "Carga máx.",
  "Frenos",
  "Suspensión",
  "Transmisión",
  "Rodado",
  "Marco",
  "Plegable",
  "Colores",
] as const;

/** Claves que alimentan el comparador (● COMPARADOR en el admin). */
export const COMPARE_KEYS = [
  "Velocidad",
  "Autonomía",
  "Motor",
  "Batería",
  "Peso",
] as const;

/** Placeholders de los 13 campos fijos del editor de specs. */
export const SPEC_PLACEHOLDERS: Record<(typeof SPEC_KEYS)[number], string> = {
  Velocidad: "35 km/h",
  Autonomía: "100 km asistida / 50 km eléctrica",
  Motor: "500 W",
  Batería: "36V / 10Ah",
  Peso: "20 kg",
  "Carga máx.": "150 kg",
  Frenos: "Disco hidráulicos",
  Suspensión: "Horquilla delantera",
  Transmisión: "Shimano 7 vel.",
  Rodado: '20×4" fat',
  Marco: "Aluminio plegable",
  Plegable: "Sí / No",
  Colores: "Negro · Blanco",
};

const STD: readonly string[] = SPEC_KEYS;

/**
 * Ordena para la ficha: descarta las vacías, pone primero las 13 fijas
 * (la primera de cada etiqueta) y después las extra en su orden.
 */
export function sortSpecs(specs: Spec[] | null | undefined): Spec[] {
  const ok = (specs ?? []).filter(
    (s) => s && String(s.label || "").trim() && String(s.value || "").trim(),
  );
  return [
    ...STD.map((k) => ok.find((s) => s.label === k)).filter(
      (s): s is Spec => !!s,
    ),
    ...ok.filter((s) => !STD.includes(s.label)),
  ];
}

/**
 * "Pegar ficha completa": una spec por línea en formato "Etiqueta: valor".
 * Parte en el PRIMER ":" (el valor puede tener más); las líneas sin
 * etiqueta se ignoran.
 */
export function parseSpecs(txt: string): Spec[] {
  return txt
    .split("\n")
    .map((l) => {
      const i = l.indexOf(":");
      return i > 0
        ? { label: l.slice(0, i).trim(), value: l.slice(i + 1).trim() }
        : null;
    })
    .filter((s): s is Spec => !!s);
}

/* ── Comparador: "Lo esencial" ────────────────────────────── */

/** Saca separadores de miles: "1.200 W" → "1200 W" (no toca decimales). */
const NUM = (s: string) => String(s || "").replace(/(\d)\.(\d{3})/g, "$1$2");

/** Todos los números de un texto, con coma o punto decimal. */
const nums = (s: string) =>
  (NUM(s).match(/\d+(?:[.,]\d+)?/g) || []).map((x) =>
    parseFloat(x.replace(",", ".")),
  );

const num = (x: string) => parseFloat(x.replace(",", "."));

const sp = (specs: Spec[], k: string) =>
  specs.find((x) => x.label === k)?.value ?? "";

export interface CompareMetric {
  label: string;
  unit: string;
  /** "max" = más es mejor; "min" = gana el menor (peso). */
  dir: "max" | "min";
  value: (specs: Spec[]) => number | null;
}

export const MET: CompareMetric[] = [
  {
    label: "Velocidad máx.",
    unit: "km/h",
    dir: "max",
    // El primer número: "35 km/h", "25 km/h asistida".
    value: (s) => nums(sp(s, "Velocidad"))[0] ?? null,
  },
  {
    label: "Autonomía",
    unit: "km",
    dir: "max",
    // El mayor número: "100 km asistida / 50 km eléctrica" → 100.
    value: (s) => {
      const n = nums(sp(s, "Autonomía"));
      return n.length ? Math.max(...n) : null;
    },
  },
  {
    label: "Potencia motor",
    unit: "W",
    dir: "max",
    // "1200 W", "600 W × 2" (doble motor) → potencia × motores.
    value: (s) => {
      const m = NUM(sp(s, "Motor")).match(
        /(\d+(?:[.,]\d+)?)\s*W(?:\s*[×x]\s*(\d+))?/i,
      );
      return m ? num(m[1]) * (m[2] ? parseInt(m[2], 10) : 1) : null;
    },
  },
  {
    label: "Batería",
    unit: "Wh",
    dir: "max",
    // Wh explícitos o, si no, la suma de V×Ah de cada batería.
    value: (s) => {
      const txt = NUM(sp(s, "Batería"));
      const wh = txt.match(/(\d+(?:[.,]\d+)?)\s*Wh/i);
      if (wh) return num(wh[1]);
      let tot = 0;
      const re = /(\d+(?:[.,]\d+)?)\s*V\s*\/?\s*(\d+(?:[.,]\d+)?)\s*Ah/gi;
      let m: RegExpExecArray | null;
      while ((m = re.exec(txt))) tot += num(m[1]) * num(m[2]);
      return tot ? Math.round(tot) : null;
    },
  },
  {
    label: "Peso",
    unit: "kg",
    dir: "min",
    value: (s) => nums(sp(s, "Peso"))[0] ?? null,
  },
];

export interface CompareMetricRow {
  label: string;
  /** "menos es mejor" (peso), "capacidad estimada" (Wh) o "". */
  hint: string;
  cells: {
    value: number | null;
    /** "1.200 W" o "—". */
    txt: string;
    /** Largo de la barra, 4–100 (relativo al máximo). 0 sin dato. */
    pct: number;
    /** MEJOR: solo con ≥2 modelos y ≥2 valores comparables. */
    isBest: boolean;
  }[];
}

/**
 * Filas de "Lo esencial" para los modelos del comparador. Una métrica sin
 * ningún valor no aparece.
 */
export function compareMetrics(items: { specs: Spec[] }[]): CompareMetricRow[] {
  const multi = items.length > 1;
  return MET.flatMap(({ label, unit, dir, value }) => {
    const vals = items.map((p) => value(p.specs));
    const ok = vals.filter((v): v is number => v != null);
    if (!ok.length) return [];
    const mx = Math.max(...ok);
    const best = dir === "max" ? mx : Math.min(...ok);
    return [
      {
        label,
        hint:
          dir === "min"
            ? "menos es mejor"
            : unit === "Wh"
              ? "capacidad estimada"
              : "",
        cells: vals.map((v) => ({
          value: v,
          txt: v == null ? "—" : `${v.toLocaleString("es-AR")} ${unit}`,
          pct: v == null ? 0 : Math.max(4, Math.round((v / mx) * 100)),
          isBest: multi && ok.length > 1 && v === best,
        })),
      },
    ];
  });
}
