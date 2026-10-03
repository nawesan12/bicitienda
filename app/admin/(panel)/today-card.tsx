import Link from "next/link";
import { cx } from "@/components/bt/cx";
import { FOCUS, FONT, TRANSITION } from "@/components/bt/styles";

/* ── TodayAppointmentCard (2i / 4h) ───────────────────────────
   Grilla 64 | 1fr (52 en mobile), gap 14 (10), padding 14 (12), radio 8,
   borde 1 px. Hora 900 22/1 @75 (20). Nombre 800 15; estado 700 11
   uppercase .06em (10 en mobile); "servicio · detalle" 13 px opacidad .85.
   Estados: Ahora (amarillo) · Hecho (surface, texto #8d867a) ·
   Confirmado (surface, paper, borde line) · Sin confirmar (surface,
   paper, borde rojo) · No vino (nuevo: como Hecho, estado rojo claro).
   Responsive: mobile < lg, desktop ≥ lg.
   ──────────────────────────────────────────────────────────── */

export type TodayCardStatus = "hecho" | "ahora" | "confirmado" | "sin_confirmar" | "no_vino";

const LABEL: Record<TodayCardStatus, string> = {
  hecho: "Hecho",
  ahora: "Ahora",
  confirmado: "Confirmado",
  sin_confirmar: "Sin confirmar",
  no_vino: "No vino",
};

const TONE: Record<TodayCardStatus, string> = {
  ahora: "border-yellow bg-yellow text-ink",
  hecho: "border-line bg-surface text-text-3",
  no_vino: "border-line bg-surface text-text-3",
  confirmado: "border-line bg-surface text-paper",
  sin_confirmar: "border-red bg-surface text-paper",
};

export function TodayAppointmentCard({
  time,
  name,
  service,
  detail,
  status,
  href,
  className,
}: {
  time: string;
  name: string;
  service: string;
  detail?: string;
  status: TodayCardStatus;
  href?: string;
  className?: string;
}) {
  const cls = cx(
    "grid grid-cols-[52px_1fr] items-center gap-[10px] rounded-box border p-3 lg:grid-cols-[64px_1fr] lg:gap-[14px] lg:p-[14px]",
    TONE[status],
    FONT,
    href && cx(TRANSITION, FOCUS, status === "ahora" ? "hover:bg-brand-hover" : "hover:border-text-4"),
    className,
  );
  const body = (
    <>
      <span className="text-[20px] font-black leading-none stretch-75 lg:text-[22px]">{time}</span>
      <span className="flex min-w-0 flex-col gap-[2px]">
        <span className="flex items-baseline justify-between gap-2">
          <span className="truncate text-[15px] font-extrabold">{name}</span>
          <span
            className={cx(
              "flex-none whitespace-nowrap text-[10px] font-bold uppercase tracking-[.06em] lg:text-[11px]",
              status === "no_vino" && "text-red-light",
            )}
          >
            {LABEL[status]}
          </span>
        </span>
        <span className="truncate text-[13px] opacity-85">
          {service}
          {detail ? ` · ${detail}` : ""}
        </span>
      </span>
    </>
  );
  return href ? (
    <Link href={href} className={cls}>
      {body}
    </Link>
  ) : (
    <div className={cls}>{body}</div>
  );
}
