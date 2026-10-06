import { Logo } from "@/components/bt/brand";
import { Button, TextLink } from "@/components/bt/button";
import { cx } from "@/components/bt/cx";
import { FONT, MONO } from "@/components/bt/styles";
import { Tag } from "@/components/bt/tag";
import { Display, Highlight } from "@/components/bt/typography";
import { HideForMembers, StarIcon } from "./member-client";
import { MEMBERS_COPY } from "./members-copy";

/**
 * Promo de registro ("Club BiciTienda"), armada con el lenguaje de bt:
 * el bloque del home con la tarjeta de cliente y la lista de beneficios
 * que también usa /cuenta/registro. Todo lleva a la pantalla de registro.
 */

const B = MEMBERS_COPY.band;

/* ── MemberCard ───────────────────────────────────────────────
   Tarjeta de cliente amarilla (proporción de tarjeta, radio 14) con el
   logo, la marca del club, el número mono y franjas tinta en la esquina.
   Desde lg va levemente girada sobre una sombra tinta.
   ──────────────────────────────────────────────────────────── */

export function MemberCard({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cx(
        "relative flex aspect-[1.586] w-full max-w-[420px] flex-col justify-between overflow-hidden rounded-[14px] bg-yellow p-5 text-ink shadow-[0_24px_60px_-20px_rgba(0,0,0,.8)] md:p-6",
        FONT,
        className,
      )}
    >
      <span className="absolute -top-6 -right-10 h-28 w-48 rotate-[28deg] bg-[repeating-linear-gradient(90deg,var(--color-ink)_0_10px,transparent_10px_20px)] opacity-90" />
      <div className="relative flex items-center gap-3">
        <Logo size={44} decorative />
        <span className="text-[13px] leading-[1.1] font-extrabold tracking-[.08em] uppercase">
          Club
          <br />
          BiciTienda
        </span>
      </div>
      <div className="relative flex flex-col gap-1">
        <span className="text-[34px] leading-[.9] font-black uppercase stretch-66 md:text-[44px]">{B.cardLabel}</span>
        <div className="flex items-center justify-between gap-3 border-t-[1.5px] border-ink pt-2">
          <span className={cx("text-[12px] font-semibold md:text-[13px]", MONO)}>{B.cardNumber}</span>
          <span className="flex items-center gap-1 text-[11px] font-extrabold tracking-[.06em] uppercase md:text-[12px]">
            <StarIcon className="size-[14px] text-red" />
            {B.cardFoot}
          </span>
        </div>
      </div>
    </div>
  );
}

/* ── MemberPerks ──────────────────────────────────────────────
   Lista de beneficios: n.º amarillo mono + estrella, título 800 @80 y
   texto. `grid`: 4 columnas con divisores (home); `list`: apilada (registro).
   ──────────────────────────────────────────────────────────── */

export function MemberPerks({ layout = "grid", className }: { layout?: "grid" | "list"; className?: string }) {
  const grid = layout === "grid";
  return (
    <ul
      className={cx(
        "m-0 list-none p-0",
        grid
          ? "grid gap-px overflow-hidden rounded-box border border-line bg-line sm:grid-cols-2 lg:grid-cols-4"
          : "flex flex-col border-t border-line",
        FONT,
        className,
      )}
    >
      {MEMBERS_COPY.perks.map((p) => (
        <li
          key={p.n}
          className={cx(
            "flex gap-3 text-paper",
            grid ? "flex-col bg-ink p-5 lg:p-6" : "items-start border-b border-line py-3",
          )}
        >
          <span className="flex items-center gap-2 text-yellow">
            <StarIcon className="size-4" />
            {grid && <span className={cx("text-[12px] font-semibold", MONO)}>{p.n}</span>}
          </span>
          <span className="flex min-w-0 flex-col gap-1">
            <span
              className={cx(
                "leading-none font-extrabold uppercase stretch-80",
                grid ? "text-[20px] lg:text-[22px]" : "text-[18px]",
              )}
            >
              {p.title}
            </span>
            <span className="text-[14px] leading-[1.45] text-text-2 md:text-[15px]">{p.text}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}

/* ── MembersBand ──────────────────────────────────────────────
   Home: caja surface radio 10 con borde amarillo, Tag rojo, título 64/40
   con el remate en amarillo, CTA primario + "Ya tengo cuenta" y la
   tarjeta de cliente a la derecha; abajo los 4 beneficios. Se oculta si
   el visitante ya tiene sesión.
   ──────────────────────────────────────────────────────────── */

export function MembersBand({ registerHref, loginHref }: { registerHref: string; loginHref: string }) {
  return (
    <HideForMembers>
      <section aria-labelledby="club-home" className={cx("px-4 py-7 lg:px-14 lg:py-10", FONT)}>
        <div className="relative flex flex-col gap-7 overflow-hidden rounded-card border-[1.5px] border-yellow bg-surface p-5 md:p-8 lg:gap-10 lg:p-11">
          <span
            aria-hidden
            className="pointer-events-none absolute -bottom-40 -left-40 size-[420px] rounded-full bg-yellow/8 blur-3xl"
          />
          <div className="relative grid items-center gap-8 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] lg:gap-14">
            <div className="flex flex-col items-start gap-4 lg:gap-5">
              <Tag tone="red" size="hero">
                {B.tag}
              </Tag>
              <Display id="club-home" size="section" className="max-w-[14ch] text-balance">
                {B.titleLead} <Highlight>{B.titleHighlight}</Highlight>
              </Display>
              <p className="m-0 max-w-[480px] text-[16px] leading-[1.5] font-medium text-pretty text-text-2 md:text-[18px]">
                {B.text}
              </p>
              <div className="mt-1 flex w-full flex-wrap items-center gap-x-6 gap-y-2 max-md:flex-col max-md:items-stretch md:w-auto">
                <Button href={registerHref} variant="primary" size="lg">
                  {B.cta}
                </Button>
                <TextLink href={loginHref} tone="muted" className="py-3 max-md:text-center">
                  {B.login}
                </TextLink>
              </div>
            </div>
            <div className="flex justify-center max-md:hidden lg:justify-end lg:pr-4">
              <MemberCard className="lg:rotate-[-4deg]" />
            </div>
          </div>
          <MemberPerks className="relative" />
        </div>
      </section>
    </HideForMembers>
  );
}
