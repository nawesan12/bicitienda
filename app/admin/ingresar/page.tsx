import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { BrandLockup } from "@/components/bt/brand";
import { Button } from "@/components/bt/button";
import { Field, Input } from "@/components/bt/field";
import { FormError } from "@/components/bt/modal";
import { Panel } from "@/components/bt/panel";
import { Display, Eyebrow } from "@/components/bt/typography";
import { store } from "@/lib/config";
import { loginWithPin } from "@/lib/server/admin-auth";

export const metadata: Metadata = {
  title: "Ingresar al panel",
  robots: { index: false, follow: false },
};

/** Mensajes de error del login, por código (?error=). */
const ERRORS: Record<string, string> = {
  bad: "PIN incorrecto.",
  locked: "Demasiados intentos fallidos. Probá de nuevo en unos minutos.",
  rate: "Demasiados intentos. Esperá un minuto.",
  config:
    "El acceso no está configurado: falta ADMIN_PIN_HASH (o ADMIN_SESSION_SECRET) en el servidor.",
};

async function login(formData: FormData) {
  "use server";
  const pin = String(formData.get("pin") ?? "").replace(/\s/g, "");
  const result = await loginWithPin(pin);
  if (!result.ok) {
    const minutes = result.minutes ? `&m=${result.minutes}` : "";
    redirect(`/admin/ingresar?error=${result.error}${minutes}`);
  }
  // El Resumen muestra el toast de bienvenida y limpia el parámetro.
  redirect("/admin?bienvenida=1");
}

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; m?: string }>;
}) {
  const { error, m } = await searchParams;
  const message =
    error === "locked" && m && /^\d+$/.test(m)
      ? `Demasiados intentos fallidos. Probá de nuevo en ${m} min.`
      : error
        ? (ERRORS[error] ?? ERRORS.bad)
        : null;

  // Sin diseño en el handoff: el lenguaje del admin (fondo ink-deep del
  // sidebar, panel surface, eyebrow amarillo y botón primario).
  return (
    <main className="flex min-h-dvh items-center justify-center bg-ink-deep px-4 py-10">
      <Panel as="section" padding="lg" gap="xl" className="w-full max-w-[440px]">
        <BrandLockup logoSize={44} wordmarkSize="sidebar" gap="gap-[10px]" />
        <div className="flex flex-col gap-2">
          <Eyebrow tone="yellow" size="md">
            Panel de administración
          </Eyebrow>
          <Display size="panel" as="h1">
            Ingresá con tu PIN
          </Display>
          <p className="m-0 text-[14px] leading-[1.5] text-text-2">
            Pedidos, turnos, presupuestos y productos de {store.brandName}.
          </p>
        </div>

        <form action={login} className="flex flex-col gap-4">
          <Field label="PIN de acceso">
            <Input
              type="password"
              name="pin"
              required
              inputMode="numeric"
              pattern="[0-9]*"
              minLength={6}
              maxLength={12}
              autoComplete="current-password"
              autoFocus
              size="lg"
              invalid={Boolean(message)}
              className="text-center tracking-[.3em]"
            />
          </Field>
          <FormError>{message}</FormError>
          <Button type="submit" size="full-lg">
            Entrar
          </Button>
        </form>
        <p className="m-0 text-center text-[12px] text-text-3">Acceso solo para el equipo del local.</p>
      </Panel>
    </main>
  );
}
