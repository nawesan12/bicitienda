import Link from "next/link";
import { cx } from "@/components/bt/cx";
import { FOCUS, FONT, TRANSITION } from "@/components/bt/styles";
import { WrenchIcon } from "./turnos/agenda";

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

/* ── RepairsTodayCard (Resumen · Taller hoy) ──────────────────
   El taller es lo que más deja: va primero y destacado. Panel con borde
   2 amarillo, cabecera con la llave, "Taller hoy" 900 28 @70 y el conteo
   grande en amarillo. Cada reparación: hora 900 20 @75 | nombre 800 15 +
   estado + "qué le pasa" 13 px; a la derecha, WhatsApp (link aparte, no
   anidado) y la fila entera abre el turno en la agenda. Pie: agenda del
   día y "+ Reparación" (el turno manual arranca en Reparación).
   ──────────────────────────────────────────────────────────── */

export interface RepairsTodayItem {
  id: string;
  time: string;
  name: string;
  detail?: string;
  status: TodayCardStatus;
  href: string;
  whatsappUrl?: string;
}

export function RepairsTodayCard({
  items,
  count,
  agendaHref,
  newHref,
  className,
}: {
  items: RepairsTodayItem[];
  /** Reparaciones en pie (sin "No vino"). */
  count: number;
  agendaHref: string;
  newHref: string;
  className?: string;
}) {
  return (
    <section
      aria-labelledby="taller-hoy"
      className={cx("flex flex-col gap-[14px] rounded-card border-2 border-yellow bg-surface p-4 lg:p-5", FONT, className)}
    >
      <header className="flex items-center gap-3">
        <span aria-hidden className="flex size-10 flex-none items-center justify-center rounded-btn bg-yellow text-ink">
          <WrenchIcon className="size-5" />
        </span>
        <span className="flex min-w-0 flex-1 flex-col">
          <h2 id="taller-hoy" className="m-0 text-[26px] font-black uppercase leading-none stretch-70 lg:text-[28px]">
            Taller hoy
          </h2>
          <span className="text-[12px] font-bold uppercase tracking-[.08em] text-text-3">Reparaciones agendadas</span>
        </span>
        <span className="flex flex-none flex-col items-end">
          <span className="text-[40px] font-black leading-[.9] text-yellow stretch-72">{count}</span>
          <span className="text-[11px] font-bold uppercase tracking-[.06em] text-text-3">{count === 1 ? "bici" : "bicis"}</span>
        </span>
      </header>

      {items.length ? (
        <ul className="m-0 flex list-none flex-col gap-2 p-0">
          {items.map((r) => (
            <li
              key={r.id}
              className={cx(
                "flex items-stretch gap-2 rounded-box border",
                r.status === "ahora" ? "border-yellow bg-yellow text-ink" : r.status === "sin_confirmar" ? "border-red" : "border-line",
                (r.status === "hecho" || r.status === "no_vino") && "text-text-3",
              )}
            >
              <Link
                href={r.href}
                aria-label={`${r.time} · ${r.name}${r.detail ? ` · ${r.detail}` : ""}`}
                className={cx(
                  "grid min-w-0 flex-1 grid-cols-[52px_1fr] items-center gap-[10px] rounded-box p-3 lg:grid-cols-[58px_1fr]",
                  TRANSITION,
                  FOCUS,
                  r.status === "ahora" ? "hover:bg-brand-hover" : "hover:bg-surface-2",
                )}
              >
                <span className="text-[20px] font-black leading-none stretch-75">{r.time}</span>
                <span className="flex min-w-0 flex-col gap-[2px]">
                  <span className="flex items-baseline justify-between gap-2">
                    <span className="truncate text-[15px] font-extrabold">{r.name}</span>
                    <span
                      className={cx(
                        "flex-none whitespace-nowrap text-[10px] font-bold uppercase tracking-[.06em] lg:text-[11px]",
                        (r.status === "no_vino" || r.status === "sin_confirmar") && "text-red-light",
                      )}
                    >
                      {LABEL[r.status]}
                    </span>
                  </span>
                  <span className={cx("truncate text-[13px]", r.detail ? "opacity-85" : "italic opacity-60")}>
                    {r.detail || "Sin detalle de la falla"}
                  </span>
                </span>
              </Link>
              {r.whatsappUrl && (
                <a
                  href={r.whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`Escribirle a ${r.name} por WhatsApp`}
                  className={cx(
                    "flex w-12 flex-none items-center justify-center border-l text-[11px] font-extrabold uppercase tracking-[.04em]",
                    r.status === "ahora" ? "border-ink/20 hover:bg-brand-hover" : "border-line text-paper hover:text-yellow",
                    TRANSITION,
                    FOCUS,
                  )}
                >
                  <WhatsAppGlyph className="size-5" />
                </a>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <p className="m-0 rounded-box border border-dashed border-line-strong p-[14px] text-[14px] text-text-3">
          Hoy no hay reparaciones agendadas. Si alguien trae la bici sin turno, cargala para que quede en la agenda.
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        <Link
          href={newHref}
          className={cx(
            "inline-flex min-h-11 flex-1 items-center justify-center whitespace-nowrap rounded-btn bg-yellow px-3 text-[13px] font-extrabold lg:px-4 lg:text-[14px] uppercase tracking-[.02em] text-ink hover:bg-brand-hover",
            TRANSITION,
            FOCUS,
          )}
        >
          + Reparación
        </Link>
        <Link
          href={agendaHref}
          className={cx(
            "inline-flex min-h-11 flex-1 items-center justify-center whitespace-nowrap rounded-btn border border-line-strong px-3 text-[13px] font-extrabold uppercase tracking-[.02em] text-paper hover:border-text-4 lg:px-4 lg:text-[14px]",
            TRANSITION,
            FOCUS,
          )}
        >
          Agenda del día →
        </Link>
      </div>
    </section>
  );
}

function WhatsAppGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden className={className}>
      <path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm0 18.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2Zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.2-.4.2-.4.7-1.3.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.7 11.8 11.8 0 0 0 4.5 4c1.7.7 2.3.8 3.2.6.5-.1 1.5-.6 1.7-1.2.2-.6.2-1.1.2-1.2-.1-.1-.2-.2-.5-.3Z" />
    </svg>
  );
}
