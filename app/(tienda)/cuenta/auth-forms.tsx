"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { Button, EmptyState, Input, TextLink } from "@/components/bt";
import { COPY } from "@/lib/data/demo/copy";
import { paths } from "@/lib/paths";
import {
  checkResetToken,
  getMyAccount,
  loginAccount,
  registerAccount,
  requestPasswordReset,
  resetPassword,
} from "@/lib/server/actions/account";
import { AUTH_TITLE } from "./auth-title";

const A = COPY.auth;

/** `?next=` solo si es un path interno ("/turnos", no "//otro.com"). */
function nextPath(): string {
  const next = new URLSearchParams(window.location.search).get("next");
  return next && next.startsWith("/") && !next.startsWith("//") ? next : paths.account();
}

/** Con sesión abierta, /cuenta/ingresar y /cuenta/registro van a la cuenta. */
function useRedirectIfLogged() {
  const router = useRouter();
  useEffect(() => {
    let alive = true;
    getMyAccount()
      .then((a) => {
        if (alive && a) router.replace(nextPath());
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [router]);
}

function Label({ children, htmlFor }: { children: ReactNode; htmlFor: string }) {
  return (
    <label htmlFor={htmlFor} className="text-[13px] font-bold tracking-[.08em] text-text-3 uppercase">
      {children}
    </label>
  );
}

function FormError({ children }: { children: ReactNode }) {
  return (
    <p role="alert" className="m-0 text-[14px] font-semibold text-red-light">
      {children}
    </p>
  );
}

function GuestNote() {
  return (
    <p className="m-0 text-center text-[13px] leading-normal text-text-3 md:text-[14px]">
      <span className="max-md:hidden">{A.guestNote}</span>
      <span className="md:hidden">{A.guestNoteMobile}</span>
    </p>
  );
}

function EmailPassword({
  email,
  password,
  setEmail,
  setPassword,
  passwordLabel = A.fields.password,
  autoCompletePassword,
}: {
  email: string;
  password: string;
  setEmail: (v: string) => void;
  setPassword: (v: string) => void;
  passwordLabel?: string;
  autoCompletePassword: "current-password" | "new-password";
}) {
  return (
    <>
      <div className="flex flex-col gap-2">
        <Label htmlFor="auth-email">{A.fields.email}</Label>
        <Input
          id="auth-email"
          surface="page"
          size="lg"
          type="email"
          autoComplete="email"
          placeholder="vos@email.com"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="auth-password">{passwordLabel}</Label>
        <Input
          id="auth-password"
          surface="page"
          size="lg"
          type="password"
          autoComplete={autoCompletePassword}
          placeholder="••••••••"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </div>
    </>
  );
}

/* ── Ingresar (2h / 4g) ───────────────────────────────────── */

export function LoginForm() {
  const router = useRouter();
  useRedirectIfLogged();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (pending) return;
    setPending(true);
    setError(null);
    const res = await loginAccount({ email, password }).catch(() => null);
    if (!res || !res.ok) {
      setPending(false);
      setError(res && !res.ok ? res.error : "No pudimos ingresar. Probá de nuevo.");
      return;
    }
    router.replace(nextPath());
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4 md:gap-[22px]" noValidate>
      <h1 className={AUTH_TITLE}>{A.titles.login}</h1>
      <EmailPassword
        email={email}
        password={password}
        setEmail={setEmail}
        setPassword={setPassword}
        autoCompletePassword="current-password"
      />
      <TextLink href={paths.recover()} underline className="self-end max-md:py-[6px]">
        {A.forgot}
      </TextLink>
      {error && <FormError>{error}</FormError>}
      <Button type="submit" variant="primary" size="full-lg" disabled={pending}>
        {pending ? "Ingresando…" : A.ctas.login}
      </Button>
      <GuestNote />
    </form>
  );
}

/* ── Crear cuenta (2h--registro / 4g--registro) ───────────── */

export function RegisterForm() {
  const router = useRouter();
  useRedirectIfLogged();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (pending) return;
    setPending(true);
    setError(null);
    const res = await registerAccount({ name, phone, email, password }).catch(() => null);
    if (!res || !res.ok) {
      setPending(false);
      setError(res && !res.ok ? res.error : "No pudimos crear la cuenta. Probá de nuevo.");
      return;
    }
    const next = nextPath();
    router.replace(res.linked && next === paths.account() ? `${next}?vinculados=${res.linked}` : next);
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4 md:gap-[22px]" noValidate>
      <h1 className={AUTH_TITLE}>{A.titles.register}</h1>
      <div className="grid grid-cols-1 gap-[10px] md:grid-cols-2 md:gap-3">
        <Input
          surface="page"
          size="lg"
          aria-label={A.fields.name}
          placeholder={A.fields.name}
          autoComplete="name"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <Input
          surface="page"
          size="lg"
          aria-label={A.fields.whatsapp}
          placeholder={A.fields.whatsapp}
          type="tel"
          inputMode="tel"
          autoComplete="tel-national"
          required
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
        />
      </div>
      <EmailPassword
        email={email}
        password={password}
        setEmail={setEmail}
        setPassword={setPassword}
        autoCompletePassword="new-password"
      />
      {error && <FormError>{error}</FormError>}
      <Button type="submit" variant="primary" size="full-lg" disabled={pending}>
        {pending ? "Creando cuenta…" : A.ctas.register}
      </Button>
      <GuestNote />
    </form>
  );
}

/* ── Recuperar (sin diseño: propuesta del md de 2h) ───────── */

/** Paso 1 (sin token) o paso 2 (`?token=`, el link del mail de recupero). */
export function RecoverFlow() {
  const [token, setToken] = useState<string | null | undefined>(undefined);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- lectura única de la URL (página estática)
    setToken(new URLSearchParams(window.location.search).get("token"));
  }, []);
  if (token === undefined) return <h1 className={AUTH_TITLE}>Recuperá tu contraseña</h1>;
  return token ? <ResetPasswordForm token={token} /> : <RequestResetForm />;
}

function RequestResetForm() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (pending) return;
    setPending(true);
    setError(null);
    const res = await requestPasswordReset({ email }).catch(() => null);
    setPending(false);
    if (!res || !res.ok) {
      setError(res && !res.ok ? res.error : "No pudimos mandar el link. Probá de nuevo.");
      return;
    }
    setSent(true);
  }

  if (sent) {
    return (
      <div className="flex flex-col gap-4 md:gap-[22px]" role="status">
        <h1 className={AUTH_TITLE}>Revisá tu email</h1>
        <p className="m-0 text-[15px] leading-normal text-text-2">
          Si hay una cuenta con <strong className="text-paper">{email}</strong>, te mandamos un link para elegir una
          contraseña nueva. Vence en 60 minutos. Si no llega, mirá en spam.
        </p>
        <Button href={paths.login()} variant="primary" size="full-lg">
          Volver a ingresar
        </Button>
        <button
          type="button"
          onClick={() => setSent(false)}
          className="self-center text-[14px] font-semibold text-yellow underline underline-offset-2"
        >
          Usar otro email
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4 md:gap-[22px]" noValidate>
      <h1 className={AUTH_TITLE}>Recuperá tu contraseña</h1>
      <p className="m-0 text-[15px] leading-normal text-text-2">
        Poné el email de tu cuenta y te mandamos un link para elegir una contraseña nueva.
      </p>
      <div className="flex flex-col gap-2">
        <Label htmlFor="recover-email">{A.fields.email}</Label>
        <Input
          id="recover-email"
          surface="page"
          size="lg"
          type="email"
          autoComplete="email"
          placeholder="vos@email.com"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>
      {error && <FormError>{error}</FormError>}
      <Button type="submit" variant="primary" size="full-lg" disabled={pending}>
        {pending ? "Mandando…" : "Mandame el link"}
      </Button>
      <TextLink href={paths.login()} underline className="self-center">
        ← Volver a ingresar
      </TextLink>
    </form>
  );
}

function ResetPasswordForm({ token }: { token: string }) {
  const router = useRouter();
  const [valid, setValid] = useState<boolean | null>(null);
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    let alive = true;
    checkResetToken(token)
      .then((r) => alive && setValid(r.valid))
      .catch(() => alive && setValid(false));
    return () => {
      alive = false;
    };
  }, [token]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (pending) return;
    setPending(true);
    setError(null);
    const res = await resetPassword({ token, password }).catch(() => null);
    if (!res || !res.ok) {
      setPending(false);
      setError(res && !res.ok ? res.error : "No pudimos cambiar la contraseña. Probá de nuevo.");
      return;
    }
    router.replace(paths.account());
    router.refresh();
  }

  if (valid === null) {
    return (
      <div className="flex flex-col gap-4 md:gap-[22px]">
        <h1 className={AUTH_TITLE}>Contraseña nueva</h1>
        <p className="m-0 text-[15px] text-text-3">Revisando el link…</p>
      </div>
    );
  }

  if (!valid) {
    return (
      <EmptyState
        eyebrow="Recuperar contraseña"
        title="El link venció"
        description="Los links sirven una sola vez y duran 60 minutos. Pedí uno nuevo y usalo apenas te llegue."
        action={
          <Button href={paths.recover()} variant="primary" size="lg">
            Pedir otro link
          </Button>
        }
      />
    );
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4 md:gap-[22px]" noValidate>
      <h1 className={AUTH_TITLE}>Contraseña nueva</h1>
      <p className="m-0 text-[15px] leading-normal text-text-2">
        Elegí una contraseña de al menos 8 caracteres. Al guardarla entrás a tu cuenta y se cierran las otras sesiones.
      </p>
      <div className="flex flex-col gap-2">
        <Label htmlFor="reset-password">Contraseña nueva</Label>
        <Input
          id="reset-password"
          surface="page"
          size="lg"
          type="password"
          autoComplete="new-password"
          placeholder="••••••••"
          minLength={8}
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </div>
      {error && <FormError>{error}</FormError>}
      <Button type="submit" variant="primary" size="full-lg" disabled={pending}>
        {pending ? "Guardando…" : "Guardar e ingresar"}
      </Button>
    </form>
  );
}
