"use client";

import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { Button, cx, Display, Eyebrow, Input, NumberedSteps, OptionCard, Panel, Textarea, UploadDropzone } from "@/components/bt";
import { COPY } from "@/lib/data/demo/copy";
import { DEFAULT_QUOTE_KIND, QUOTE_KINDS } from "@/lib/data/demo/quotes";
import type { QuoteKind as DemoQuoteKind } from "@/lib/data/demo/types";
import { paths } from "@/lib/paths";
import { formatArPhone, isValidArPhone } from "@/lib/phone";
import { getMyAccount } from "@/lib/server/actions/account";
import { submitQuoteRequest } from "@/lib/server/actions/quotes";
import type { QuoteKind } from "@/lib/types";

const Q = COPY.quote;

/** Claves del demo/diseño (`repuesto`, `importado`) → claves del core (`rep`, `imp`). */
const CORE_KIND: Record<DemoQuoteKind, QuoteKind> = {
  bici: "bici",
  repuesto: "rep",
  importado: "imp",
  otro: "otro",
};

const MAX_PHOTOS = 4;
/**
 * Las server actions aceptan 1 MB por request (default de Next, sin
 * `serverActions.bodySizeLimit` en next.config): las fotos se achican en
 * el navegador para que entren las 4 juntas.
 */
const PHOTO_BUDGET = 900 * 1024;

async function shrink(file: File, maxSide: number, quality: number): Promise<File | null> {
  const bitmap = await createImageBitmap(file).catch(() => null);
  if (!bitmap) return null;
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/jpeg", quality));
  return blob ? new File([blob], file.name.replace(/\.\w+$/, "") + ".jpg", { type: "image/jpeg" }) : null;
}

/** Achica las fotos hasta que todas juntas entren en el presupuesto de bytes. */
async function shrinkAll(files: File[]): Promise<File[] | null> {
  for (const [side, q] of [
    [1600, 0.8],
    [1280, 0.72],
    [1024, 0.68],
    [800, 0.62],
  ] as const) {
    const out = await Promise.all(files.map((f) => shrink(f, side, q)));
    if (out.some((f) => !f)) return null;
    const ok = out as File[];
    if (ok.reduce((n, f) => n + f.size, 0) <= PHOTO_BUDGET) return ok;
  }
  return null;
}

type Errors = Partial<Record<"detail" | "name" | "phone" | "email" | "photos", string>>;

function ErrorText({ children }: { children?: string }) {
  return children ? <span className="text-[13px] font-semibold text-red-light">{children}</span> : null;
}

function LabelText({ children, mobileHidden }: { children: ReactNode; mobileHidden?: boolean }) {
  return (
    <span
      className={cx(
        "text-[12px] font-bold tracking-[.08em] text-text-3 uppercase",
        mobileHidden && "max-md:sr-only",
      )}
    >
      {children}
    </span>
  );
}

/**
 * 5a / 5d · Pedir presupuesto. Isla cliente sobre una página estática:
 * radios nativos (`OptionCard`), placeholder según el tipo, fotos
 * achicadas en el navegador y `submitQuoteRequest` (que las sube a
 * Cloudinary con `savePrivateUpload`). Con sesión, prellena los datos.
 */
export function QuoteForm({ contact }: { contact: { whatsappLabel: string; whatsappHref: string | null } }) {
  const [kind, setKind] = useState<DemoQuoteKind>(DEFAULT_QUOTE_KIND);
  const [detail, setDetail] = useState("");
  const [forBike, setForBike] = useState("");
  const [budget, setBudget] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [photos, setPhotos] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [sent, setSent] = useState<string | null>(null);

  // Con sesión: prellenar (siguen editables).
  useEffect(() => {
    let alive = true;
    getMyAccount()
      .then((a) => {
        if (!alive || !a) return;
        setName((v) => v || a.name);
        setPhone((v) => v || formatArPhone(a.phone));
        setEmail((v) => v || a.email);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    const urls = photos.map((f) => URL.createObjectURL(f));
    // eslint-disable-next-line react-hooks/set-state-in-effect -- object URLs atados al ciclo de vida de las fotos
    setPreviews(urls);
    return () => urls.forEach((u) => URL.revokeObjectURL(u));
  }, [photos]);

  const current = QUOTE_KINDS.find((k) => k.key === kind) ?? QUOTE_KINDS[0];

  function addPhotos(list: FileList | null) {
    if (!list) return;
    const picked = [...list].filter((f) => f.type.startsWith("image/"));
    const next = [...photos, ...picked];
    setErrors((e) => ({ ...e, photos: next.length > MAX_PHOTOS ? `Hasta ${MAX_PHOTOS} fotos.` : undefined }));
    setPhotos(next.slice(0, MAX_PHOTOS));
  }

  function validate(): boolean {
    const e: Errors = {};
    if (detail.trim().length < 10) e.detail = "Contanos un poco más (al menos 10 caracteres).";
    if (name.trim().length < 2) e.name = "Completá tu nombre.";
    if (!isValidArPhone(phone)) e.phone = "Revisá el WhatsApp: 10 dígitos con la característica (ej. 223 555-0182).";
    if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) e.email = "Revisá el email.";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function submit(ev: FormEvent) {
    ev.preventDefault();
    if (pending) return;
    setFormError(null);
    if (!validate()) return;
    setPending(true);
    const fd = new FormData();
    fd.set("kind", CORE_KIND[kind]);
    fd.set("detail", detail);
    fd.set("forBike", forBike);
    fd.set("budget", budget);
    fd.set("name", name);
    fd.set("phone", phone);
    fd.set("email", email);
    if (photos.length) {
      const small = await shrinkAll(photos);
      if (!small) {
        setPending(false);
        setErrors((e) => ({ ...e, photos: "No pudimos preparar las fotos. Probá con menos o mandalas por WhatsApp." }));
        return;
      }
      small.forEach((f) => fd.append("photos", f));
    }
    const res = await submitQuoteRequest(fd).catch(() => null);
    setPending(false);
    if (!res || !res.ok) {
      setFormError(res && !res.ok ? res.error : "No pudimos enviar el pedido. Probá de nuevo.");
      return;
    }
    setSent(res.number);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function reset() {
    setSent(null);
    setDetail("");
    setForBike("");
    setBudget("");
    setPhotos([]);
    setErrors({});
  }

  const aside = (
    <aside className="flex flex-col gap-4 max-lg:hidden">
      <Panel surface="surface" padding="lg" gap="none" className="gap-1">
        <h2 className="m-0 pb-3 text-[30px] leading-none font-black uppercase stretch-70">{Q.howTitle}</h2>
        <NumberedSteps items={Q.how.map((h) => ({ n: h.n, title: h.title, text: h.text }))} />
      </Panel>
      <Panel surface="outline" padding="md" gap="md">
        <p className="m-0 text-[16px] font-extrabold">{Q.directTitle}</p>
        {contact.whatsappHref ? (
          <Button href={contact.whatsappHref} external variant="secondary" size="full" className="min-h-[50px]">
            {Q.directCta}
          </Button>
        ) : (
          <Button variant="secondary" size="full" disabled className="min-h-[50px]">
            {Q.directCta}
          </Button>
        )}
        <p className="m-0 text-[13px] text-text-3">{contact.whatsappLabel}</p>
      </Panel>
    </aside>
  );

  if (sent) {
    return (
      <div className="grid grid-cols-1 items-start gap-10 lg:grid-cols-[minmax(0,1fr)_400px]">
        <Panel
          surface="surface"
          padding="xl"
          gap="lg"
          className="max-md:border-0 max-md:bg-transparent max-md:p-0"
        >
          <div role="status" className="flex flex-col gap-4">
            <Eyebrow tone="yellow" size="lg" className="max-md:text-[12px]">
              Pedido #{sent}
            </Eyebrow>
            <Display size="section" as="h2">
              ¡Lo recibimos!
            </Display>
            <p className="m-0 max-w-[560px] text-[16px] leading-normal text-text-2 md:text-[18px]">
              Lo revisamos en el local y {Q.ctaNote.charAt(0).toLowerCase() + Q.ctaNote.slice(1)} Guardá el número por
              si nos escribís.
            </p>
            <div className="flex flex-wrap gap-3 pt-1">
              <Button href={paths.catalog()} variant="primary" size="lg" className="max-md:w-full">
                Seguir mirando
              </Button>
              <Button variant="secondary" size="lg" onClick={reset} className="max-md:w-full">
                Pedir otro presupuesto
              </Button>
            </div>
          </div>
        </Panel>
        {aside}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 items-start gap-10 lg:grid-cols-[minmax(0,1fr)_400px]">
      <Panel
        surface="surface"
        padding="xl"
        gap="none"
        className="max-md:border-0 max-md:bg-transparent max-md:p-0"
      >
        <form onSubmit={submit} noValidate className="flex flex-col gap-[22px] md:gap-[30px]">
          {/* 1 · Qué necesitás */}
          <fieldset className="m-0 flex min-w-0 flex-col gap-[10px] border-0 p-0 md:gap-3">
            <Eyebrow tone="muted" size="sm" as="legend" className="mb-[10px] md:mb-3">
              {Q.step1}
            </Eyebrow>
            <div className="grid grid-cols-2 gap-2 md:grid-cols-4 md:gap-[10px]">
              {QUOTE_KINDS.map((k) => (
                <OptionCard
                  key={k.key}
                  name="kind"
                  value={k.key}
                  checked={kind === k.key}
                  onChange={() => setKind(k.key)}
                  title={k.label}
                  description={<span className="max-md:hidden">{k.description}</span>}
                  selectedStyle="fill"
                  titleStyle="display"
                  surface="transparent"
                  padding="md"
                  radius={8}
                  className="max-md:min-h-16 max-md:justify-end max-md:gap-0"
                />
              ))}
            </div>
          </fieldset>

          {/* 2 · Detalle */}
          <div className="flex flex-col gap-[10px] md:gap-3">
            <Eyebrow tone="muted" size="sm" as="label" htmlFor="quote-detail">
              <span className="max-md:hidden">{Q.step2}</span>
              <span className="md:hidden">{Q.step2Mobile}</span>
            </Eyebrow>
            <Textarea
              id="quote-detail"
              surface="panel"
              size="md"
              className="max-md:bg-surface"
              placeholder={current.placeholder}
              value={detail}
              invalid={!!errors.detail}
              onChange={(e) => setDetail(e.target.value)}
            />
            <ErrorText>{errors.detail}</ErrorText>
            <div className="grid grid-cols-2 gap-3 max-md:hidden">
              <label className="flex flex-col gap-2">
                <LabelText>{Q.forBike.label}</LabelText>
                <Input
                  surface="panel"
                  size="md"
                  placeholder={Q.forBike.placeholder}
                  value={forBike}
                  onChange={(e) => setForBike(e.target.value)}
                />
              </label>
              <label className="flex flex-col gap-2">
                <LabelText>{Q.budget.label}</LabelText>
                <Input
                  surface="panel"
                  size="md"
                  placeholder={Q.budget.placeholder}
                  value={budget}
                  onChange={(e) => setBudget(e.target.value)}
                />
              </label>
            </div>
            <UploadDropzone
              variant="bar"
              accept="image/*"
              multiple
              disabled={photos.length >= MAX_PHOTOS}
              label={
                <>
                  <span className="max-md:hidden">{Q.upload.replace(/^\+ /, "")}</span>
                  <span className="md:hidden">Agregar foto</span>
                </>
              }
              hint={photos.length ? `(${photos.length} de ${MAX_PHOTOS})` : Q.uploadOptional}
              onChange={(e) => {
                addPhotos(e.target.files);
                e.target.value = "";
              }}
            />
            {photos.length > 0 && (
              <ul className="m-0 flex list-none flex-wrap gap-2 p-0">
                {photos.map((f, i) => (
                  <li key={`${f.name}-${i}`} className="relative">
                    {previews[i] && (
                      // eslint-disable-next-line @next/next/no-img-element -- vista previa local (blob:)
                      <img src={previews[i]} alt={f.name} className="size-16 rounded-btn object-cover" />
                    )}
                    <button
                      type="button"
                      onClick={() => setPhotos((p) => p.filter((_, j) => j !== i))}
                      aria-label={`Quitar ${f.name}`}
                      className="absolute -top-2 -right-2 flex size-6 items-center justify-center rounded-full bg-paper text-[13px] font-bold text-ink"
                    >
                      ×
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <ErrorText>{errors.photos}</ErrorText>
          </div>

          {/* 3 · Tus datos */}
          <div className="flex flex-col gap-[10px] md:gap-3">
            <Eyebrow tone="muted" size="sm" as="h2">
              {Q.step3}
            </Eyebrow>
            <div className="grid grid-cols-1 gap-[10px] md:grid-cols-3 md:gap-3">
              <label className="flex flex-col gap-2">
                <LabelText mobileHidden>{Q.fields.name.label}</LabelText>
                <Input
                  surface="panel"
                  size="md"
                  className="max-md:bg-surface"
                  placeholder={Q.fields.name.placeholder}
                  autoComplete="name"
                  value={name}
                  invalid={!!errors.name}
                  onChange={(e) => setName(e.target.value)}
                />
                <ErrorText>{errors.name}</ErrorText>
              </label>
              <label className="flex flex-col gap-2">
                <LabelText mobileHidden>{Q.fields.whatsapp.label}</LabelText>
                <Input
                  surface="panel"
                  size="md"
                  className="max-md:bg-surface"
                  placeholder={Q.fields.whatsapp.placeholder}
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel-national"
                  value={phone}
                  invalid={!!errors.phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
                <ErrorText>{errors.phone}</ErrorText>
              </label>
              <label className="flex flex-col gap-2 max-md:hidden">
                <LabelText>{Q.fields.email.label}</LabelText>
                <Input
                  surface="panel"
                  size="md"
                  placeholder={Q.fields.email.placeholder}
                  type="email"
                  autoComplete="email"
                  value={email}
                  invalid={!!errors.email}
                  onChange={(e) => setEmail(e.target.value)}
                />
                <ErrorText>{errors.email}</ErrorText>
              </label>
            </div>
          </div>

          {/* Pie */}
          <div className="flex flex-col gap-[10px] md:flex-row md:items-center md:gap-5 md:border-t md:border-line md:pt-[6px]">
            {formError && (
              <p role="alert" className="m-0 text-[14px] font-semibold text-red-light md:hidden">
                {formError}
              </p>
            )}
            <Button
              type="submit"
              variant="primary"
              size="lg"
              disabled={pending}
              className="max-md:w-full md:mt-[18px] md:px-[30px] md:py-[18px]"
            >
              {pending ? "Enviando…" : (
                <>
                  <span className="max-md:hidden">{Q.cta}</span>
                  <span className="md:hidden">{Q.ctaMobile}</span>
                </>
              )}
            </Button>
            <p className="m-0 text-center text-[13px] text-text-3 md:mt-[18px] md:text-left md:text-[14px]">
              <span className="max-md:hidden">{formError ? <span className="font-semibold text-red-light">{formError}</span> : Q.ctaNote}</span>
              <span className="md:hidden">{Q.ctaNoteMobile}</span>
            </p>
          </div>
        </form>
      </Panel>
      {aside}
    </div>
  );
}
