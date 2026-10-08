import Link from "next/link";
import { Button, buttonClasses } from "@/components/bt/button";
import { cx } from "@/components/bt/cx";
import { FONT, MONO } from "@/components/bt/styles";
import { Tag } from "@/components/bt/tag";
import { Display } from "@/components/bt/typography";
import { WaLink } from "@/components/store/wa-link";
import { paths } from "@/lib/paths";
import { wa } from "@/lib/whatsapp";

/**
 * El taller (sin diseño en el handoff, armado con el lenguaje de bt): el
 * bloque amarillo del home, la orden de taller de /reparaciones y la
 * franja final. Las reparaciones son el fuerte del local: el taller se
 * marca siempre con el Tag rojo "Taller" y sus dos CTAs (turno de
 * reparación y WhatsApp). Sin precios: el presupuesto va por WhatsApp.
 */

export const WORKSHOP_COPY = {
  tag: "Taller",
  bookCta: "Sacar turno",
  waCta: "Consultar por WhatsApp",
  orderLabel: "Orden de taller",
  orderNote: "Te pasamos el presupuesto por WhatsApp antes de tocar nada.",
  more: "Ver el taller",
} as const;

/** Turno con el servicio de reparación preseleccionado (/turnos?servicio=reparacion). */
export function repairBookingHref(): string {
  return `${paths.appointments()}?servicio=reparacion`;
}

/** Tilde de la orden de taller: cuadrado tinta con ✓ amarillo (o al revés sobre tinta). */
export function ServiceCheck({ tone = "ink", className }: { tone?: "ink" | "yellow"; className?: string }) {
  return (
    <span
      aria-hidden
      className={cx(
        "grid size-[22px] flex-none place-items-center rounded-[3px] md:size-[26px]",
        tone === "ink" ? "bg-ink text-yellow" : "bg-yellow text-ink",
        className,
      )}
    >
      <svg viewBox="0 0 16 16" className="size-[14px] md:size-4" fill="none" stroke="currentColor" strokeWidth={2.6}>
        <path d="M3 8.5l3.2 3.2L13 4.8" strokeLinecap="square" />
      </svg>
    </span>
  );
}

/** Los dos CTAs del taller. `surface`: sobre amarillo (ink) o sobre la página (primario + secundario). */
export function WorkshopCtas({
  bookHref,
  whatsapp,
  surface,
  className,
}: {
  bookHref: string;
  whatsapp: string;
  surface: "yellow" | "page";
  className?: string;
}) {
  const onYellow = surface === "yellow";
  return (
    <div className={cx("flex flex-wrap items-center gap-3 max-md:flex-col max-md:items-stretch", className)}>
      <Button href={bookHref} variant={onYellow ? "ink" : "primary"} size="lg">
        {WORKSHOP_COPY.bookCta}
      </Button>
      <WaLink
        whatsapp={whatsapp}
        {...wa.repair()}
        className={buttonClasses({ variant: onYellow ? "ink-outline" : "outline-paper", size: "lg" })}
      >
        {WORKSHOP_COPY.waCta}
      </WaLink>
    </div>
  );
}

/* ── WorkshopBand ─────────────────────────────────────────────
   Home, justo debajo del hero: caja amarilla (radio 10 como el hero, a
   sangre en mobile). Izquierda: Tag rojo, título 64/40 tinta, texto y
   CTAs tinta. Derecha: la lista de trabajos como orden de taller (filas
   con tilde y divisor tinta 25 %), en 2 columnas desde md.
   ──────────────────────────────────────────────────────────── */

export function WorkshopBand({
  title,
  body,
  services,
  bookHref,
  moreHref,
  whatsapp,
}: {
  title: string;
  body: string;
  services: string[];
  bookHref: string;
  moreHref: string;
  whatsapp: string;
}) {
  return (
    <section aria-labelledby="taller-home" className={cx("lg:px-14 lg:pb-2", FONT)}>
      <div className="grid gap-7 bg-yellow px-4 pt-7 pb-8 text-ink md:px-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:gap-14 lg:rounded-card lg:p-11">
        <div className="flex flex-col items-start gap-4 lg:gap-5">
          <Tag tone="red" size="hero">
            {WORKSHOP_COPY.tag}
          </Tag>
          <Display id="taller-home" size="section" className="max-w-[12ch] text-balance">
            {title}
          </Display>
          <p className="m-0 max-w-[460px] text-[16px] leading-[1.5] font-medium text-pretty text-ink/80 md:text-[18px]">
            {body}
          </p>
          <WorkshopCtas bookHref={bookHref} whatsapp={whatsapp} surface="yellow" className="mt-1 w-full md:w-auto" />
        </div>
        <div className="flex flex-col gap-3 lg:self-center">
          <span className={cx("text-[12px] font-semibold uppercase text-ink/60", MONO)}>
            {WORKSHOP_COPY.orderLabel}
          </span>
          <ul className="m-0 grid list-none border-t-[1.5px] border-ink p-0 md:grid-cols-2 md:gap-x-8">
            {services.map((s) => (
              <li
                key={s}
                className="flex min-h-[52px] items-center gap-3 border-b border-ink/25 py-2 text-[17px] leading-[1.15] font-extrabold uppercase stretch-80 md:min-h-[60px] md:text-[20px]"
              >
                <ServiceCheck />
                {s}
              </li>
            ))}
          </ul>
          <Link
            href={moreHref}
            className="self-start rounded-[2px] py-3 text-[14px] font-extrabold uppercase tracking-[.06em] underline decoration-[1.5px] underline-offset-4 hover:decoration-transparent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
          >
            {WORKSHOP_COPY.more}
          </Link>
        </div>
      </div>
    </section>
  );
}

/* ── WorkOrder ────────────────────────────────────────────────
   /reparaciones: la lista de trabajos como una orden de taller sobre
   paper (el cuerpo claro de la product card). Encabezado mono, grilla de
   trabajos con tilde (1 / 2 / 3 columnas) y pie punteado con la regla del
   taller y el WhatsApp para lo que no está en la lista.
   ──────────────────────────────────────────────────────────── */

export function WorkOrder({
  title,
  services,
  whatsapp,
}: {
  title: string;
  services: string[];
  whatsapp: string;
}) {
  return (
    <section aria-labelledby="trabajos" className={cx("px-4 py-8 md:px-14 md:py-14", FONT)}>
      <div className="flex flex-col gap-6 rounded-card bg-paper px-4 pt-5 pb-6 text-ink md:gap-8 md:p-10">
        <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
          <Display id="trabajos" size="section">
            {title}
          </Display>
          <span className={cx("text-[12px] font-semibold uppercase text-card-meta md:text-[13px]", MONO)}>
            {WORKSHOP_COPY.orderLabel}
          </span>
        </div>
        <ul className="m-0 grid list-none border-t-[1.5px] border-ink p-0 sm:grid-cols-2 sm:gap-x-8 lg:grid-cols-3">
          {services.map((s) => (
            <li
              key={s}
              className="flex min-h-[56px] items-center gap-3 border-b border-dashed border-card-dash py-3 text-[19px] leading-[1.1] font-extrabold uppercase stretch-80 md:min-h-[76px] md:gap-4 md:text-[24px]"
            >
              <ServiceCheck />
              {s}
            </li>
          ))}
        </ul>
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <p className="m-0 max-w-[520px] text-[15px] leading-[1.5] font-medium text-card-cuotas md:text-[16px]">
            {WORKSHOP_COPY.orderNote} ¿Lo tuyo no está en la lista? Preguntanos igual.
          </p>
          <WaLink
            whatsapp={whatsapp}
            {...wa.repair()}
            className={buttonClasses({ variant: "ink-outline", size: "md", className: "max-md:w-full" })}
          >
            {WORKSHOP_COPY.waCta}
          </WaLink>
        </div>
      </div>
    </section>
  );
}

/* ── WorkshopCtaStrip ─────────────────────────────────────────
   Cierre de /reparaciones: franja amarilla a sangre con la pregunta del
   mostrador y los dos CTAs tinta.
   ──────────────────────────────────────────────────────────── */

export function WorkshopCtaStrip({
  title,
  text,
  bookHref,
  whatsapp,
}: {
  title: string;
  text: string;
  bookHref: string;
  whatsapp: string;
}) {
  return (
    <section aria-labelledby="taller-cta" className={cx("bg-yellow text-ink", FONT)}>
      <div className="flex flex-col gap-5 px-4 py-9 md:px-14 md:py-14 lg:flex-row lg:items-end lg:justify-between lg:gap-12">
        <div className="flex flex-col gap-3">
          <Display id="taller-cta" size="section" className="max-w-[18ch] text-balance">
            {title}
          </Display>
          <p className="m-0 max-w-[520px] text-[16px] leading-[1.5] font-medium text-ink/80 md:text-[18px]">{text}</p>
        </div>
        <WorkshopCtas bookHref={bookHref} whatsapp={whatsapp} surface="yellow" className="flex-none" />
      </div>
    </section>
  );
}
