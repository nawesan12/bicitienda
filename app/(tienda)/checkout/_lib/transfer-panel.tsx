import { Divider, Panel } from "@/components/bt/panel";
import { Eyebrow, Price } from "@/components/bt/typography";
import { CopyButton, KeyValueList } from "@/components/bt";
import { fillTemplate } from "@/lib/data/demo/format";
import { isTransferPending, type TransferDetails } from "@/lib/server/screens/compra-b";
import { waUrl } from "@/lib/whatsapp";
import { ReceiptUpload } from "./receipt-upload";
import { BUY } from "./copy";

const T = BUY.confirm.transfer;

/**
 * Datos para transferir + comprobante (UploadDropzone o WhatsApp). Lo usan
 * la confirmación (2e) y el seguimiento; `id` = "comprobante" en el
 * seguimiento (el mail de transferencia linkea a #comprobante).
 */
export function TransferPanel({
  id,
  number,
  contact,
  total,
  discountPct,
  hasDiscount,
  bank,
  whatsapp,
  receiptSent,
  className,
}: {
  id?: string;
  number: string;
  contact: string;
  total: number;
  discountPct: number;
  hasDiscount: boolean;
  bank: TransferDetails;
  whatsapp: string;
  receiptSent: boolean;
  className?: string;
}) {
  const waHref = waUrl(whatsapp, fillTemplate(T.waMsg, { número: number }));
  return (
    <Panel as="section" surface="surface" padding="md" gap="md" className={className}>
      <Eyebrow tone="yellow" size="md" as="h2">
        {T.bankTitle}
      </Eyebrow>
      <KeyValueList
        layout="stacked"
        items={[
          { label: T.alias, value: bank.alias, mono: true, action: !isTransferPending(bank.alias) && <CopyButton value={bank.alias} /> },
          { label: T.cbu, value: bank.cbu, mono: true, action: !isTransferPending(bank.cbu) && <CopyButton value={bank.cbu} /> },
          { label: T.holder, value: bank.holder },
          { label: T.bank, value: bank.bank },
        ]}
      />
      <div className="flex items-end justify-between gap-4">
        <div className="flex flex-col gap-1">
          <Eyebrow size="sm">{T.amount}</Eyebrow>
          {hasDiscount && (
            <span className="text-[13px] text-text-3">{fillTemplate(T.amountNote, { off: discountPct })}</span>
          )}
        </div>
        <Price amount={total} size="panel" tone="yellow" />
      </div>
      <Divider />
      <div id={id} className="flex scroll-mt-6 flex-col gap-[14px]">
        <Eyebrow size="md" as="h3">
          {T.uploadTitle}
        </Eyebrow>
        <ReceiptUpload number={number} contact={contact} waHref={waHref} alreadySent={receiptSent} />
      </div>
    </Panel>
  );
}
