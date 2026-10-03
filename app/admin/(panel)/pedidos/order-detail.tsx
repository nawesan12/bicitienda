import { cx, Mono, OrderItemRow, OrderPill, ReceiptBox, SummaryRows, Timeline } from "@/components/bt";
import { resolveImage, img } from "@/lib/images";
import type { OrderDetail } from "@/lib/server/screens/admin-d1";
import { OrderPanelActions } from "./order-panel-actions";

/**
 * Panel de detalle del pedido, compartido por 3a (`variant="panel"`, la
 * columna de 380 px) y 4i (`variant="page"`: tamaños mobile hasta lg y
 * los del panel desde lg). Timeline de 5 pasos, botón amarillo con la
 * próxima transición, WhatsApp y cancelar.
 */
export function OrderDetailPanel({ order, variant }: { order: OrderDetail; variant: "panel" | "page" }) {
  const page = variant === "page";
  return (
    <div
      className={cx(
        "flex min-w-0 flex-col",
        page
          ? "gap-4 lg:gap-5 lg:rounded-card lg:border lg:border-line lg:bg-surface lg:p-6"
          : "gap-5 rounded-card border border-line bg-surface p-6",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <Mono size={13} className={cx(page && "max-lg:text-[12px]", "pt-[3px]")}>
          {order.meta}
        </Mono>
        <OrderPill status={order.pill} className={cx(page && "max-lg:px-[9px] max-lg:text-[10px]")} />
      </div>

      <div className="flex items-end justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-1">
          <h2
            className={cx(
              "m-0 font-black uppercase leading-[.95] stretch-70",
              page ? "text-[40px] lg:text-[36px]" : "text-[36px]",
            )}
          >
            {order.customerName}
          </h2>
          <span className="text-[14px] text-text-2">WhatsApp {order.phoneLabel}</span>
        </div>
        <a
          href={order.chatUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={cx(
            "flex-none whitespace-nowrap rounded-[2px] text-[13px] font-extrabold uppercase tracking-[.06em] text-yellow hover:text-brand-hover",
            "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-yellow",
            page && "max-lg:hidden",
          )}
        >
          Escribir →
        </a>
      </div>

      <div className={cx("flex flex-col border-t border-line", page ? "gap-[10px] pt-3 lg:gap-3 lg:pt-4" : "gap-3 pt-4")}>
        {order.items.map((it) => {
          const src = it.image ? img(resolveImage(it.image), { w: 160 }) : undefined;
          return page ? (
            <div key={it.id}>
              <OrderItemRow className="lg:hidden" size="sm" image={src} name={it.name} variant={it.variant} price={it.price} quantity={it.quantity} />
              <OrderItemRow className="max-lg:hidden" image={src} name={it.name} variant={it.variant} price={it.price} quantity={it.quantity} />
            </div>
          ) : (
            <OrderItemRow key={it.id} image={src} name={it.name} variant={it.variant} price={it.price} quantity={it.quantity} />
          );
        })}
      </div>

      {page ? (
        <>
          <SummaryRows tone="panel" className="lg:hidden" size="sm" rows={[{ label: "Pago", value: order.payment }]} total={{ amount: order.total }} />
          <SummaryRows
            tone="panel"
            className="max-lg:hidden"
            rows={[
              { label: "Pago", value: order.payment },
              { label: "Entrega", value: order.delivery },
            ]}
            total={{ amount: order.total }}
          />
        </>
      ) : (
        <SummaryRows
          tone="panel"
          rows={[
            { label: "Pago", value: order.payment },
            { label: "Entrega", value: order.delivery },
          ]}
          total={{ amount: order.total }}
        />
      )}

      {order.receipt ? (
        <ReceiptBox href={order.receipt.href} fileName={order.receipt.fileName} kind={order.receipt.kind} />
      ) : (
        order.pill === "transf_pendiente" && <ReceiptBox />
      )}

      <Timeline done={order.done} cancelled={order.cancelled} cancelledLabel={order.status === "VENCIDO" ? "Reserva vencida" : "Cancelado"} />

      <OrderPanelActions
        orderId={order.id}
        number={order.number}
        next={order.next}
        canCancel={order.canCancel}
        whatsappUrl={order.whatsappUrl}
        whatsappIsTemplate={order.whatsappIsTemplate}
        variant={variant}
      />
    </div>
  );
}
