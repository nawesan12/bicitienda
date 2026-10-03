"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/bt/button";
import { lexicon } from "@/lib/data/content";
import { simulatePayment } from "@/lib/server/actions/simulated-payment";

const t = lexicon.commerce.sandbox;

export function SimulatedPayButtons({
  orderId,
  gateway,
  amountLabel,
  confirmUrl,
}: {
  orderId: string;
  /** Nombre visible de la pasarela simulada ("Mercado Pago"). */
  gateway: string;
  /** Monto a cobrar ya formateado, para el botón. */
  amountLabel: string;
  confirmUrl: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [rejected, setRejected] = useState(false);

  function run(approved: boolean) {
    startTransition(async () => {
      await simulatePayment(orderId, approved);
      if (approved) router.push(confirmUrl);
      else setRejected(true);
    });
  }

  return (
    <div className="flex flex-col gap-[10px]">
      <Button size="full-lg" disabled={pending} onClick={() => run(true)}>
        {t.approve(amountLabel)}
      </Button>
      <Button size="full" variant="danger" disabled={pending} onClick={() => run(false)}>
        {t.reject}
      </Button>
      {rejected && (
        <div className="flex flex-col gap-2">
          <p role="alert" className="m-0 text-[14px] leading-[1.5] font-semibold text-red-light">
            {t.rejected(gateway)}
          </p>
          <Button href={confirmUrl} size="full" variant="secondary">
            Volver al pedido
          </Button>
        </div>
      )}
    </div>
  );
}
