import Link from "next/link";
import type { ReactNode } from "react";
import { BrandLockup } from "./brand";
import { cx } from "./cx";
import { FOCUS, FONT, MONO, TRANSITION } from "./styles";

export interface FooterProps {
  homeHref: string;
  /** "[Dirección a confirmar]" mientras falte el dato del cliente. */
  address: string;
  hours: string;
  whatsapp: string;
  /** Link wa.me opcional para el número. */
  whatsappHref?: string;
  socials?: { label: string; href?: string }[];
  /** % off por transferencia (10). */
  transferDiscountPct?: number;
  /** Celda del taller (link a /reparaciones); sin ella, la tira queda en 3. */
  workshop?: { href: string; title: string; sub: string };
  className?: string;
}

/**
 * Footer (Footer.dc.html).
 * Taller (sin diseño en el handoff): con `workshop`, 4.ª celda de la tira
 * en rojo claro (link a /reparaciones) y, en mobile, fila con borde rojo.
 * Desktop (≥ lg): tira de 3 celdas (Mercado Pago · X% off transferencia
 * [amarillo] · Retiro en el local; títulos 900 22 @72 % uppercase,
 * bajada 14 px; padding 26×56 la primera y 26×40 el resto; el handoff
 * tenía una celda de cuotas que se sacó: no hay plan fijo) y debajo
 * logo 56 + wordmark 26 con columnas Local / Horarios /
 * WhatsApp (1.4fr 1fr 1fr 1fr, gap 40, padding 44×56, 15/1.6).
 * Mobile (< lg, 4a): logo 44 + wordmark 22, dirección · horarios,
 * WhatsApp · redes y la tira resumida en mono 11 px.
 */
export function Footer({
  homeHref,
  address,
  hours,
  whatsapp,
  whatsappHref,
  socials = [{ label: "Instagram" }, { label: "Facebook" }],
  transferDiscountPct = 10,
  workshop,
  className,
}: FooterProps) {
  const strip = [
    { title: "Mercado Pago", sub: "Tarjetas, débito y dinero en cuenta" },
    { title: `${transferDiscountPct}% off transferencia`, sub: "O pagás en efectivo en el local", highlight: true },
    { title: "Retiro en el local", sub: "Te la damos armada y ajustada" },
  ];

  const wa = whatsappHref ? (
    <a href={whatsappHref} target="_blank" rel="noopener noreferrer" className="hover:text-yellow">
      {whatsapp}
    </a>
  ) : (
    <span>{whatsapp}</span>
  );

  const socialLinks = socials.map((s, i) => (
    <span key={s.label}>
      {i > 0 && " · "}
      {s.href ? (
        <a href={s.href} target="_blank" rel="noopener noreferrer" className="hover:text-yellow">
          {s.label}
        </a>
      ) : (
        s.label
      )}
    </span>
  ));

  return (
    <footer className={cx("border-t border-line bg-ink text-text-2", FONT, className)}>
      {/* Desktop */}
      <div className="max-lg:hidden">
        <ul className={cx("m-0 grid list-none border-b border-line p-0", workshop ? "grid-cols-4" : "grid-cols-3")}>
          {strip.map((c, i) => (
            <li
              key={c.title}
              className={cx(
                "flex flex-col gap-1 py-[26px]",
                i === 0 ? "px-14" : "px-10",
                (i < strip.length - 1 || workshop) && "border-r border-line",
              )}
            >
              <span
                className={cx(
                  "text-[22px] font-black uppercase stretch-72",
                  c.highlight ? "text-yellow" : "text-paper",
                )}
              >
                {c.title}
              </span>
              <span className="text-[14px]">{c.sub}</span>
            </li>
          ))}
          {workshop && (
            <li className="flex">
              <Link
                href={workshop.href}
                className={cx(
                  "flex flex-1 flex-col items-start gap-1 px-10 py-[26px] hover:bg-surface",
                  TRANSITION,
                  "focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-yellow",
                )}
              >
                <span className="text-[22px] font-black text-red-light uppercase stretch-72">{workshop.title}</span>
                <span className="text-[14px]">{workshop.sub} →</span>
              </Link>
            </li>
          )}
        </ul>
        <div className="grid grid-cols-[1.4fr_1fr_1fr_1fr] gap-10 px-14 py-11 text-[15px] leading-[1.6]">
          <BrandLockup href={homeHref} logoSize={56} wordmarkSize="footer" gap="gap-3" className="flex-none self-start" />
          <div className="flex flex-col gap-1">
            <strong className="text-[13px] uppercase tracking-[.08em] text-paper">Local</strong>
            <span>{address}</span>
          </div>
          <div className="flex flex-col gap-1">
            <strong className="text-[13px] uppercase tracking-[.08em] text-paper">Horarios</strong>
            <span>{hours}</span>
          </div>
          <div className="flex flex-col gap-1">
            <strong className="text-[13px] uppercase tracking-[.08em] text-paper">WhatsApp</strong>
            {wa}
            <span>{socialLinks}</span>
          </div>
        </div>
      </div>

      {/* Mobile */}
      <div className="flex flex-col gap-[14px] px-4 pt-6 pb-7 text-[14px] leading-[1.5] lg:hidden">
        {workshop && (
          <Link
            href={workshop.href}
            className={cx(
              "mb-2 flex min-h-[64px] items-center justify-between gap-3 rounded-box border-[1.5px] border-red px-4 py-3 hover:bg-red-light/6",
              TRANSITION,
              FOCUS,
            )}
          >
            <span className="flex flex-col gap-[2px]">
              <span className="text-[20px] leading-none font-black text-red-light uppercase stretch-72">
                {workshop.title}
              </span>
              <span className="text-text-2">{workshop.sub}</span>
            </span>
            <span aria-hidden className="text-[18px] font-bold text-red-light">
              →
            </span>
          </Link>
        )}
        <BrandLockup href={homeHref} logoSize={44} wordmarkSize="mobile-footer" gap="gap-[10px]" className="flex-none self-start" />
        <span>
          {address} · {hours}
        </span>
        <span>
          WhatsApp {wa} · {socialLinks}
        </span>
        <span className={cx("text-[11px] font-semibold uppercase text-text-3", MONO)}>
          Mercado Pago · {transferDiscountPct}% off transferencia · Retiro en el local
        </span>
      </div>
    </footer>
  );
}

/** Link del pie con hover amarillo (por si B2 suma links legales). */
export function FooterLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className="hover:text-yellow">
      {children}
    </Link>
  );
}
