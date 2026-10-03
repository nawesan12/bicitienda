import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Bolt } from "@/components/store/bolt";
import { store } from "@/lib/config";
import { loginWithPin } from "@/lib/server/admin-auth";
import { resolveImage } from "@/lib/images";

export const metadata: Metadata = {
  title: "Ingresar al panel",
  robots: { index: false, follow: false },
};

/** Grilla verde de 48px del login del prototipo (se desliza). */
const GRID = {
  backgroundImage:
    "linear-gradient(rgba(94,184,56,.06) 1px,transparent 1px),linear-gradient(90deg,rgba(94,184,56,.06) 1px,transparent 1px)",
  backgroundSize: "48px 48px",
};

/** Glow radial del login del prototipo. */
const GLOW = {
  background:
    "radial-gradient(700px 420px at 50% 40%, rgba(94,184,56,.14), transparent 65%)",
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

  return (
    <div
      className="animate-grid-slide relative flex min-h-screen items-center justify-center overflow-hidden bg-night p-5"
      style={GRID}
    >
      <div className="absolute inset-0" style={GLOW} />
      <Bolt
        width={340}
        height={450}
        stroke="#5eb838"
        strokeWidth={0.5}
        className="absolute -right-[60px] bottom-[-140px] opacity-[.08]"
      />

      <div className="animate-admin-pop relative box-border w-[460px] max-w-[94vw] rounded-3xl bg-cream p-10 shadow-[0_40px_90px_rgba(0,0,0,.5)] max-[420px]:p-7">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={resolveImage("/brand/logo-black.png")}
          alt={store.brandName}
          className="mx-auto block w-[190px] max-w-[80%]"
        />
        <div className="font-display mt-4 text-center text-[22px] tracking-normal text-ink">
          Panel de administración
        </div>
        <p className="mb-0 mt-2 text-center font-sans text-[13px] text-ink/55">
          Gestioná pedidos, turnos, presupuestos y productos.
        </p>

        <form action={login}>
          <input
            type="password"
            name="pin"
            required
            inputMode="numeric"
            pattern="[0-9]*"
            minLength={6}
            maxLength={12}
            autoComplete="current-password"
            autoFocus
            placeholder="PIN de acceso"
            aria-label="PIN de acceso"
            className="mt-[22px] box-border w-full rounded-xl border-[1.5px] border-ink/15 bg-white px-4 py-[14px] text-center font-sans text-[15px] tracking-[.3em] outline-none focus:border-brand"
          />
          {message && (
            <div
              role="alert"
              className="mt-3 rounded-xl border border-danger/30 bg-danger-bg px-4 py-3 text-center font-sans text-[13px] font-semibold text-danger"
            >
              {message}
            </div>
          )}
          <button
            type="submit"
            className="mt-[14px] block w-full rounded-full bg-ink p-[15px] text-center font-sans text-sm font-bold text-cream transition-colors hover:bg-brand hover:text-night"
          >
            Entrar
          </button>
        </form>
        <div className="mt-[14px] text-center font-sans text-[11px] text-ink/40">
          Ingresá tu PIN · acceso solo para el equipo de {store.brandName}
        </div>
      </div>
    </div>
  );
}
