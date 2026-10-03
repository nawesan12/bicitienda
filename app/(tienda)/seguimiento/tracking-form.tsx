"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/bt/button";
import { Field, Input } from "@/components/bt/field";
import { Panel } from "@/components/bt/panel";
import { Display } from "@/components/bt/typography";
import { BUY } from "../checkout/_lib/copy";

const T = BUY.tracking;

/**
 * Búsqueda de pedido: número + WhatsApp o email de la compra (el gate de
 * getOrderForCustomer acepta cualquiera de los dos). `toAccount` manda a
 * /cuenta con ?e=&n= (Mis pedidos sin sesión).
 */
export function TrackingForm({ toAccount }: { toAccount?: boolean }) {
  const router = useRouter();
  const [number, setNumber] = useState("");
  const [contact, setContact] = useState("");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!number.trim() || !contact.trim()) return;
    const q = `?e=${encodeURIComponent(contact.trim())}`;
    router.push(
      toAccount
        ? `/cuenta${q}&n=${encodeURIComponent(number.trim())}`
        : `/seguimiento/${encodeURIComponent(number.trim().replace(/^#/, ""))}${q}`,
    );
  }

  return (
    <form onSubmit={submit} className="w-full">
    <Panel padding="lg" gap="lg">
      <Display size="panel" as="h2">
        {T.formTitle}
      </Display>
      <FormBody
        number={number}
        contact={contact}
        setNumber={setNumber}
        setContact={setContact}
        submitLabel={toAccount ? T.submitAccount : T.submit}
      />
    </Panel>
    </form>
  );
}

function FormBody({
  number,
  contact,
  setNumber,
  setContact,
  submitLabel,
}: {
  number: string;
  contact: string;
  setNumber: (v: string) => void;
  setContact: (v: string) => void;
  submitLabel: string;
}) {
  return (
    <>
      <Field label={T.number}>
        <Input
          value={number}
          onChange={(e) => setNumber(e.target.value)}
          placeholder={T.numberPh}
          autoComplete="off"
          required
          size="lg"
        />
      </Field>
      <Field label={T.contact}>
        <Input
          value={contact}
          onChange={(e) => setContact(e.target.value)}
          placeholder={T.contactPh}
          autoComplete="email"
          required
          size="lg"
        />
      </Field>
      <Button type="submit" size="full-lg">
        {submitLabel}
      </Button>
      <p className="m-0 text-center text-[13px] text-text-3">{T.formNote}</p>
    </>
  );
}
