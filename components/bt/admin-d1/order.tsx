import { cx } from "../cx";
import { formatMoney } from "../format";
import { FOCUS, FONT, MONO, TRANSITION } from "../styles";

/* ── OrderItemRow (3a / 4i) ───────────────────────────────────
   Grilla 64 | 1fr | auto, gap 12 (60 y gap 10 en mobile). Foto 64×48
   (60×46) radio 6 cover; nombre 700 14/1.2 + variante 12 #8d867a;
   precio 800 15 (14).
   ──────────────────────────────────────────────────────────── */

export function OrderItemRow({
  image,
  name,
  variant,
  price,
  quantity = 1,
  size = "md",
  className,
}: {
  image?: string;
  name: string;
  variant?: string | null;
  price: number;
  quantity?: number;
  /** md = panel desktop · sm = 4i mobile. */
  size?: "md" | "sm";
  className?: string;
}) {
  const md = size === "md";
  return (
    <div
      className={cx(
        "grid items-center",
        md ? "grid-cols-[64px_1fr_auto] gap-3" : "grid-cols-[60px_1fr_auto] gap-[10px]",
        FONT,
        className,
      )}
    >
      {image ? (
        // eslint-disable-next-line @next/next/no-img-element -- URLs ya resueltas (Cloudinary/Pexels/local)
        <img src={image} alt="" className={cx("block rounded-btn bg-surface-2 object-cover", md ? "h-12 w-16" : "h-[46px] w-[60px]")} />
      ) : (
        <span aria-hidden className={cx("block rounded-btn bg-surface-2", md ? "h-12 w-16" : "h-[46px] w-[60px]")} />
      )}
      <span className="flex min-w-0 flex-col gap-[2px]">
        <span className="text-[14px] font-bold leading-[1.2]">
          {quantity > 1 && <span className="text-yellow">{quantity}× </span>}
          {name}
        </span>
        {variant && <span className="text-[12px] text-text-3">{variant}</span>}
      </span>
      <span className={cx("whitespace-nowrap font-extrabold", md ? "text-[15px]" : "text-[14px]")}>{formatMoney(price)}</span>
    </div>
  );
}

/* ── ReceiptBox (3a) ──────────────────────────────────────────
   "Comprobante adjunto": borde 1.5 punteado #d7261e, radio 8, padding 14.
   800 14 + nombre del archivo mono 12 #8d867a; "Ver" 800 13 uppercase
   amarillo (abre el archivo en otra pestaña: imagen o PDF). Si es imagen
   muestra una miniatura de 48 px a la izquierda. Sin `href` (el cliente
   todavía no lo subió): borde punteado #3a362f y el aviso en #8d867a.
   ──────────────────────────────────────────────────────────── */

export function ReceiptBox({
  href,
  fileName,
  kind,
  title = "Comprobante adjunto",
  viewLabel = "Ver",
  emptyText = "Todavía no lo subió: lo puede mandar desde su pedido o por WhatsApp.",
  className,
}: {
  href?: string | null;
  fileName?: string;
  kind?: "pdf" | "image";
  title?: string;
  /** Texto cuando no hay archivo. */
  emptyText?: string;
  viewLabel?: string;
  className?: string;
}) {
  if (!href)
    return (
      <div className={cx("flex flex-col gap-[2px] rounded-box border-[1.5px] border-dashed border-line-strong p-[14px]", FONT, className)}>
        <span className="text-[14px] font-extrabold text-text-2">Sin comprobante adjunto</span>
        <span className="text-[13px] text-text-3">{emptyText}</span>
      </div>
    );
  return (
    <div
      className={cx(
        "flex items-center gap-3 rounded-box border-[1.5px] border-dashed border-red p-[14px]",
        FONT,
        className,
      )}
    >
      {kind === "image" ? (
        // eslint-disable-next-line @next/next/no-img-element -- archivo privado servido al admin
        <img src={href} alt="" className="block size-12 flex-none rounded-tag bg-surface-2 object-cover" />
      ) : (
        <span
          aria-hidden
          className={cx("flex size-12 flex-none items-center justify-center rounded-tag border border-line-strong text-[11px] font-semibold text-text-3", MONO)}
        >
          PDF
        </span>
      )}
      <span className="flex min-w-0 flex-1 flex-col gap-[2px]">
        <span className="text-[14px] font-extrabold">{title}</span>
        <span className={cx("truncate text-[12px] text-text-3", MONO)}>{fileName}</span>
      </span>
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={cx(
          "flex min-h-11 flex-none items-center rounded-[2px] px-1 text-[13px] font-extrabold uppercase tracking-[.06em] text-yellow hover:text-brand-hover md:min-h-0",
          TRANSITION,
          FOCUS,
        )}
      >
        {viewLabel}
        <span className="sr-only"> {fileName}</span>
      </a>
    </div>
  );
}
