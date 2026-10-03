"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Button, Field, Input, cx } from "@/components/bt";
import { ACCOUNT_NAV_ITEM } from "@/components/bt/cliente-c/account-nav";
import { logoutAccount, updateMyProfile } from "@/lib/server/actions/account";

/** "Cerrar sesión": desktop como ítem del nav (#8d867a), mobile como botón. */
export function LogoutButton({ variant = "nav" }: { variant?: "nav" | "button" }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  async function logout() {
    setPending(true);
    await logoutAccount().catch(() => null);
    router.replace("/");
    router.refresh();
  }
  if (variant === "button") {
    return (
      <Button variant="secondary" size="full" onClick={logout} disabled={pending}>
        {pending ? "Cerrando…" : "Cerrar sesión"}
      </Button>
    );
  }
  return (
    <button
      type="button"
      onClick={logout}
      disabled={pending}
      className={cx(
        ACCOUNT_NAV_ITEM,
        "cursor-pointer font-bold text-text-3 transition-colors duration-150 hover:text-paper",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-yellow",
      )}
    >
      {pending ? "Cerrando…" : "Cerrar sesión"}
    </button>
  );
}

/** Mis datos (sin diseño): nombre y WhatsApp editables; email solo lectura. */
export function ProfileForm({ name: initialName, phone: initialPhone, email }: { name: string; phone: string; email: string }) {
  const router = useRouter();
  const [name, setName] = useState(initialName);
  const [phone, setPhone] = useState(initialPhone);
  const [pending, setPending] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setPending(true);
    setMsg(null);
    const res = await updateMyProfile({ name, phone }).catch(() => null);
    setPending(false);
    if (!res || !res.ok) {
      setMsg({ ok: false, text: res && !res.ok ? res.error : "No pudimos guardar. Probá de nuevo." });
      return;
    }
    setMsg({ ok: true, text: "Guardamos tus datos." });
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="flex max-w-[560px] flex-col gap-4" noValidate>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-3">
        <Field label="Nombre" size="md">
          <Input surface="page" size="lg" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
        <Field label="WhatsApp" size="md">
          <Input
            surface="page"
            size="lg"
            type="tel"
            inputMode="tel"
            autoComplete="tel-national"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
        </Field>
      </div>
      <Field label="Email" size="md" hint="Para cambiar el email, escribinos.">
        <Input surface="page" size="lg" type="email" value={email} readOnly disabled />
      </Field>
      {msg && (
        <p role={msg.ok ? "status" : "alert"} className={cx("m-0 text-[14px] font-semibold", msg.ok ? "text-yellow" : "text-red-light")}>
          {msg.text}
        </p>
      )}
      <div>
        <Button type="submit" variant="primary" size="lg" disabled={pending}>
          {pending ? "Guardando…" : "Guardar cambios"}
        </Button>
      </div>
    </form>
  );
}
