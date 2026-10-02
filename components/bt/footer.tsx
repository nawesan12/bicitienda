import Link from "next/link";
import type { ReactNode } from "react";
import { BrandLockup } from "./brand";
import { cx } from "./cx";
import { FONT, MONO } from "./styles";

export interface FooterProps {
  homeHref: string;
  /** "[Dirección a confirmar]" mientras falte el dato del cliente. */
  address: string;
  hours: string;
  whatsapp: string;
  /** Link wa.me opcional para el número. */
  whatsappHref?: string;
  socials?: { label: string; href?: string }[];
  /** Cuotas sin interés de la tira (6). */
  installments?: number;
  /** % off por transferencia (10). */
  transferDiscountPct?: number;
  className?: string;
}

/**
 * Footer (Footer.dc.html).
 * Desktop (≥ lg): tira de 4 celdas (Mercado Pago · N cuotas sin interés
 * [amarillo] · X% off transferencia · Retiro en el local; títulos 900 22
 * @72 % uppercase, bajada 14 px; padding 26×56 la primera y 26×40 el
 * resto) y debajo logo 56 + wordmark 26 con columnas Local / Horarios /
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
  installments = 6,
  transferDiscountPct = 10,
  className,
}: FooterProps) {
  const strip = [
    { title: "Mercado Pago", sub: "Tarjetas, débito y dinero en cuenta" },
    { title: `${installments} cuotas sin interés`, sub: "Con bancos seleccionados", highlight: true },
    { title: `${transferDiscountPct}% off transferencia`, sub: "O pagás en efectivo en el local" },
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
        <ul className="m-0 grid list-none grid-cols-4 border-b border-line p-0">
          {strip.map((c, i) => (
            <li
              key={c.title}
              className={cx(
                "flex flex-col gap-1 py-[26px]",
                i === 0 ? "px-14" : "px-10",
                i < 3 && "border-r border-line",
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
        <BrandLockup href={homeHref} logoSize={44} wordmarkSize="mobile-footer" gap="gap-[10px]" className="flex-none self-start" />
        <span>
          {address} · {hours}
        </span>
        <span>
          WhatsApp {wa} · {socialLinks}
        </span>
        <span className={cx("text-[11px] font-semibold uppercase text-text-3", MONO)}>
          Mercado Pago · {installments} cuotas · {transferDiscountPct}% off transferencia · Retiro en el local
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
