import Link from "next/link";
import type { ReactNode } from "react";
import { cx } from "../cx";
import { FOCUS, FONT, MONO, TRANSITION } from "../styles";

/* ── OrderSummaryCard (Mis pedidos 2g / 4f) ───────────────────
   #1f1d1a, borde #2b2824, radio 10 (mobile 8), padding 20 (12),
   grilla 96 | 1fr gap 18 (72 | 1fr gap 12). Thumb 96×72 (72×56).
   Número mono 600 13 (11) #8d867a + pill; ítems 800 17 (15); meta
   14 (13) #cfc8bb. La pill es la de bt (`OrderPill`/`QuotePill`).
   ──────────────────────────────────────────────────────────── */

export function OrderSummaryCard({
  href,
  number,
  pill,
  title,
  meta,
  image,
  className,
}: {
  href?: string | null;
  number: string;
  pill?: ReactNode;
  title: ReactNode;
  meta: ReactNode;
  /** null = sin foto (presupuestos): la grilla queda de una columna. */
  image?: string | null | false;
  className?: string;
}) {
  const body = (
    <>
      {image !== false &&
        (image ? (
          // eslint-disable-next-line @next/next/no-img-element -- miniatura de Cloudinary
          <img
            src={image}
            alt=""
            className="h-14 w-[72px] rounded-btn bg-card-photo object-cover md:h-[72px] md:w-24"
          />
        ) : (
          <span aria-hidden className="h-14 w-[72px] rounded-btn bg-surface-3 md:h-[72px] md:w-24" />
        ))}
      <span className="flex min-w-0 flex-col gap-1">
        <span className="flex items-center justify-between gap-2">
          <span className={cx(MONO, "text-[11px] font-semibold text-text-3 md:text-[13px]")}>{number}</span>
          {pill}
        </span>
        <span className="line-clamp-2 text-[15px] font-extrabold md:text-[17px]">{title}</span>
        <span className="text-[13px] text-text-2 md:text-[14px]">{meta}</span>
      </span>
    </>
  );
  const cls = cx(
    "grid items-center gap-3 rounded-box border border-line bg-surface p-3 text-paper md:gap-[18px] md:rounded-card md:p-5",
    image === false ? "grid-cols-1" : "grid-cols-[72px_minmax(0,1fr)] md:grid-cols-[96px_minmax(0,1fr)]",
    FONT,
    className,
  );
  if (!href) return <div className={cls}>{body}</div>;
  return (
    <Link href={href} className={cx(cls, TRANSITION, FOCUS, "hover:border-line-strong")}>
      {body}
    </Link>
  );
}
