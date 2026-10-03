import {
  Actions,
  Button,
  EmailShell,
  Eyebrow,
  firstName,
  money,
  P,
  Pill,
  splitVariant,
  Summary,
  Title,
  waLink,
} from "./components";

/**
 * Pedido cancelado (desde el admin) o vencido (la reserva de transferencia
 * o efectivo pasó sin pago; ver expireStaleOrders en lib/server/orders.ts).
 * Todavía no lo manda el core: queda listo para cablear en
 * lib/server/mail.ts (OrderEmailKind "cancelado" | "vencido").
 */
export interface OrderCancelledData {
  brandName: string;
  number: string;
  customerName: string;
  reason: "cancelado" | "vencido";
  items?: { name: string; variant?: string | null; quantity: number; unitPrice: number }[];
  total?: number;
  /** Si se pagó algo y hay que devolverlo. */
  refundNote?: string | null;
  /** Link para volver a comprar (catálogo o el producto). */
  shopUrl: string;
  whatsapp: string;
  footer: string;
}

export function OrderCancelledEmail(data: OrderCancelledData) {
  const first = firstName(data.customerName);
  const expired = data.reason === "vencido";
  return (
    <EmailShell
      preview={
        expired
          ? `La reserva del pedido ${data.number} venció y las unidades se liberaron.`
          : `El pedido ${data.number} fue cancelado.`
      }
      footer={data.footer}
      whatsapp={data.whatsapp}
    >
      <Eyebrow tone="red">Pedido {data.number}</Eyebrow>
      <Title accent={expired ? "venció." : "fue cancelado."}>
        {first}, tu {expired ? "reserva" : "pedido"}
      </Title>
      <Pill tone="muted">{expired ? "Reserva vencida" : "Cancelado"}</Pill>
      <P>
        {expired
          ? "No se acreditó el pago a tiempo, así que las unidades volvieron a estar disponibles. Si todavía lo querés, hacé el pedido de nuevo: si hay stock, sale igual."
          : "Cancelamos este pedido. Si fue un error o querés cambiar algo, escribinos y lo resolvemos."}
      </P>
      {data.refundNote && <P>{data.refundNote}</P>}

      {data.items && data.items.length > 0 && data.total != null && (
        <Summary
          label="Lo que tenías reservado"
          items={data.items.map((it) => ({
            ...splitVariant(it.name, it.variant),
            quantity: it.quantity,
            amount: it.unitPrice * it.quantity,
          }))}
          total={money(data.total)}
        />
      )}

      <Actions>
        <Button href={data.shopUrl}>{expired ? "Volver a pedirlo →" : "Ir a la tienda →"}</Button>
        <Button
          variant="secondary"
          href={waLink(data.whatsapp, `Hola! Consulta por el pedido ${data.number}`)}
        >
          Escribinos por WhatsApp
        </Button>
      </Actions>
    </EmailShell>
  );
}
