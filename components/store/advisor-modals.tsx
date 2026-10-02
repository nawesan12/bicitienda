"use client";

import Link from "next/link";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { WaLink } from "@/components/store/wa-link";
import { recommend, TEST_QUESTIONS } from "@/lib/advisor";
import { lexicon } from "@/lib/data/content";
import { formatARS } from "@/lib/format";
import { img } from "@/lib/images";
import { paths } from "@/lib/paths";
import { cuota3, cuota6, transferPrice, type PricingRates } from "@/lib/pricing";
import { priceView, type CardProduct } from "@/lib/product-view";
import type { TestPick } from "@/lib/types";
import { wa } from "@/lib/whatsapp";

/**
 * Los dos modales del asesor del prototipo — Test "¿Cuál es para mí?" y
 * Calculadora de cuotas — montados una sola vez en el StoreShell y abiertos
 * desde cualquier parte con useAdvisor()/AdvisorTrigger.
 */

type AdvisorModal = "test" | "cuotas";

const AdvisorContext = createContext<{ open: (modal: AdvisorModal) => void }>({
  open: () => {},
});

export function useAdvisor() {
  return useContext(AdvisorContext);
}

/** Botón que abre uno de los modales (para usar desde server components). */
export function AdvisorTrigger({
  modal,
  className,
  children,
}: {
  modal: AdvisorModal;
  className?: string;
  children: React.ReactNode;
}) {
  const { open } = useAdvisor();
  return (
    <button type="button" onClick={() => open(modal)} className={className}>
      {children}
    </button>
  );
}

export function AdvisorProvider({
  products,
  picks,
  rates,
  whatsapp,
  cuotasDefault,
  children,
}: {
  /** Catálogo visible (vista de tarjeta), lo provee el StoreShell. */
  products: CardProduct[];
  /** Recomendación por perfil del test (`content.test`). */
  picks: Record<string, TestPick>;
  rates: PricingRates;
  whatsapp: string;
  /** Modelo que la calculadora muestra al abrirse. */
  cuotasDefault: string;
  children: React.ReactNode;
}) {
  const [modal, setModal] = useState<AdvisorModal | null>(null);
  const open = useCallback((m: AdvisorModal) => setModal(m), []);
  const close = useCallback(() => setModal(null), []);

  useEffect(() => {
    if (!modal) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [modal, close]);

  return (
    <AdvisorContext.Provider value={{ open }}>
      {children}
      {modal === "test" && (
        <TestModal
          products={products}
          picks={picks}
          rates={rates}
          onClose={close}
        />
      )}
      {modal === "cuotas" && (
        <CuotasModal
          products={products}
          rates={rates}
          whatsapp={whatsapp}
          initial={cuotasDefault}
          onClose={close}
        />
      )}
    </AdvisorContext.Provider>
  );
}

function ModalFrame({
  onClose,
  label,
  dark,
  className,
  children,
}: {
  onClose: () => void;
  label: string;
  dark: boolean;
  className: string;
  children: React.ReactNode;
}) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={label}
      className="fixed inset-0 z-[110] flex items-center justify-center p-5"
    >
      <button
        type="button"
        aria-label="Cerrar"
        onClick={onClose}
        className="animate-backdrop absolute inset-0 cursor-default bg-[rgba(12,14,11,.7)] backdrop-blur-[4px]"
      />
      <div
        className={`animate-pop-in relative box-content rounded-[24px] p-[38px] ${className}`}
      >
        <button
          type="button"
          aria-label="Cerrar"
          onClick={onClose}
          className={`absolute right-[22px] top-[18px] font-sans text-[14px] font-bold ${
            dark
              ? "text-cream/50 hover:text-cream"
              : "text-ink/40 hover:text-ink"
          }`}
        >
          ✕
        </button>
        {children}
      </div>
    </div>
  );
}

/* ── Test "¿Cuál es para mí?" ─────────────────────────────── */

function TestModal({
  products,
  picks,
  rates,
  onClose,
}: {
  products: CardProduct[];
  picks: Record<string, TestPick>;
  rates: PricingRates;
  onClose: () => void;
}) {
  const [answers, setAnswers] = useState<string[]>([]);
  const total = TEST_QUESTIONS.length;
  const done = answers.length === total;
  const step = Math.min(answers.length, total - 1);
  const question = TEST_QUESTIONS[step];
  const result = done ? recommend(products, picks, answers) : null;

  return (
    <ModalFrame
      onClose={onClose}
      dark
      label={lexicon.nav.test}
      className="w-[560px] max-w-[94vw] border border-[rgba(94,184,56,.35)] bg-night text-cream"
    >
      {!done ? (
        <>
          <div className="font-sans text-[11px] font-semibold tracking-[.26em] text-brand">
            {lexicon.test.step(step + 1, total)}
          </div>
          <h3 className="font-display mt-3 mb-0 text-[26px] tracking-[-.01em]">
            {question.q}
          </h3>
          <div className="mt-6 flex flex-col gap-[10px]">
            {question.opts.map((o) => (
              <button
                key={o.value}
                type="button"
                onClick={() => setAnswers([...answers, o.value])}
                className="rounded-[14px] border-[1.5px] border-white/[.18] px-5 py-[15px] text-left font-sans text-[14.5px] font-semibold text-cream hover:border-brand hover:bg-[rgba(94,184,56,.08)] hover:text-brand"
              >
                {o.label}
              </button>
            ))}
          </div>
        </>
      ) : result ? (
        <>
          <div className="font-sans text-[11px] font-semibold tracking-[.26em] text-brand">
            {lexicon.test.match}
          </div>
          <div className="mt-[18px] flex flex-wrap items-center gap-[22px]">
            <div className="box-border flex h-[150px] w-[170px] flex-none items-center justify-center rounded-2xl bg-cream p-3">
              {result.product.image && (
                // eslint-disable-next-line @next/next/no-img-element -- Cloudinary transforma (img())
                <img
                  src={img(result.product.image, { w: 340 })}
                  alt={result.product.name}
                  className="max-h-full max-w-full object-contain mix-blend-multiply"
                />
              )}
            </div>
            <div className="min-w-[200px] flex-1">
              <h3 className="font-display m-0 text-[26px] tracking-normal">
                {result.product.name}
              </h3>
              <div className="font-display mt-[6px] text-[18px] font-bold tracking-normal text-brand">
                {priceView(rates, result.product).priceF}
              </div>
              <div className="mt-[6px] font-sans text-[13px] leading-[1.5] text-cream/60">
                {result.why}
              </div>
            </div>
          </div>
          <div className="mt-[26px] flex gap-[10px]">
            <Link
              href={paths.catalog(result.product.slug)}
              onClick={onClose}
              className="flex-1 rounded-full bg-brand p-[14px] text-center font-sans text-[14px] font-bold text-night hover:bg-brand-hover"
            >
              {lexicon.test.seeModel}
            </Link>
            <button
              type="button"
              onClick={() => setAnswers([])}
              className="box-border flex-1 rounded-full border-[1.5px] border-cream/30 p-[14px] text-center font-sans text-[14px] font-bold text-cream hover:border-brand hover:text-brand"
            >
              {lexicon.test.restart}
            </button>
          </div>
        </>
      ) : null}
    </ModalFrame>
  );
}

/* ── Calculadora de cuotas ────────────────────────────────── */

function CuotasModal({
  products,
  rates,
  whatsapp,
  initial,
  onClose,
}: {
  products: CardProduct[];
  rates: PricingRates;
  whatsapp: string;
  initial: string;
  onClose: () => void;
}) {
  // Como el prototipo: todos los modelos con precio cargado, aunque la
  // tienda oculte precios o el modelo esté sin stock.
  const priced = products.filter((p) => p.price != null);
  const [slug, setSlug] = useState(initial);
  const product = priced.find((p) => p.slug === slug) ?? priced[0];
  const fmt = (n: number | undefined) => (n == null ? "—" : formatARS(n));
  const price = product?.price ?? undefined;

  return (
    <ModalFrame
      onClose={onClose}
      dark={false}
      label={lexicon.financing.modalTitle}
      className="w-[520px] max-w-[94vw] bg-white text-ink"
    >
      <h3 className="font-display m-0 text-[26px] tracking-[-.01em]">
        {lexicon.financing.modalTitle}
      </h3>
      <p className="mt-2 mb-0 font-sans text-[13.5px] text-ink/55">
        {lexicon.financing.modalSub}
      </p>
      <select
        value={product?.slug ?? ""}
        onChange={(e) => setSlug(e.target.value)}
        className="mt-[18px] box-border w-full rounded-xl border-[1.5px] border-ink/[.18] bg-cream-3 px-[14px] py-[13px] font-sans text-[14px] font-semibold outline-none"
      >
        {priced.map((p) => (
          <option key={p.slug} value={p.slug}>
            {p.name} — {formatARS(p.price!)}
          </option>
        ))}
      </select>
      <div className="mt-5 flex flex-col gap-[10px]">
        <div className="flex items-center justify-between rounded-[14px] bg-night px-5 py-4 text-cream">
          <span className="font-sans text-[13px] font-semibold text-cream/70">
            {lexicon.financing.modal6}
          </span>
          <span className="font-display text-[22px] font-extrabold tracking-normal text-brand">
            {fmt(price && cuota6(rates, price))}
          </span>
        </div>
        <div className="flex items-center justify-between rounded-[14px] bg-chip px-5 py-4">
          <span className="font-sans text-[13px] font-semibold text-ink/60">
            {lexicon.financing.modal3}
          </span>
          <span className="font-display text-[19px] font-extrabold tracking-normal">
            {fmt(price && cuota3(rates, price))}
          </span>
        </div>
        <div className="flex items-center justify-between rounded-[14px] bg-brand-pastel px-5 py-4">
          <span className="font-sans text-[13px] font-semibold text-brand-deeper">
            {lexicon.financing.modalTransfer(rates.transferDiscount)}
          </span>
          <span className="font-display text-[19px] font-extrabold tracking-normal text-brand-deeper">
            {fmt(price && transferPrice(rates, price))}
          </span>
        </div>
      </div>
      <WaLink
        whatsapp={whatsapp}
        {...wa.financing(product?.name ?? null)}
        className="mt-4 block rounded-full bg-ink p-[14px] text-center font-sans text-[14px] font-bold text-cream hover:bg-brand hover:text-night"
      >
        {lexicon.financing.modalCta}
      </WaLink>
      <div className="mt-[14px] font-sans text-[11px] text-ink/45">
        {lexicon.financing.modalNote}
      </div>
    </ModalFrame>
  );
}
