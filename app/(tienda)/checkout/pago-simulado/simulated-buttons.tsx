"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
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
  /** Nombre visible de la pasarela simulada ("Payway"). */
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
      if (approved) {
        router.push(confirmUrl);
      } else {
        setRejected(true);
      }
    });
  }

  return (
    <div className="mt-6">
      <div className="flex flex-col gap-[10px]">
        <button
          type="button"
          disabled={pending}
          onClick={() => run(true)}
          className="min-h-[48px] rounded-[10px] bg-[#1d2433] px-4 py-[14px] text-[15px] font-bold text-white hover:bg-[#2c3550] disabled:opacity-50"
        >
          {t.approve(amountLabel)}
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => run(false)}
          className="min-h-[48px] rounded-[10px] border border-[#cfd5df] bg-white px-4 py-[13px] text-[14px] font-bold text-[#b42318] hover:bg-[#fdeceb] disabled:opacity-50"
        >
          {t.reject}
        </button>
      </div>
      {rejected && (
        <div
          role="alert"
          className="mt-4 rounded-[10px] border border-[#f3c4bf] bg-[#fdeceb] px-4 py-3 text-[13px] leading-[1.5] text-[#b42318]"
        >
          {t.rejected(gateway)}
        </div>
      )}
    </div>
  );
}
