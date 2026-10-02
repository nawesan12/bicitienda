"use client";

import { useState, useSyncExternalStore, useTransition } from "react";
import { lexicon } from "@/lib/data/content";
import { subscribeNewsletter } from "@/lib/server/actions/newsletter";

const STORAGE_KEY = lexicon.newsletter.storageKey;

/**
 * Banda de newsletter del prototipo. El alta va a la tabla
 * newsletter_subscribers por server action (sin duplicados);
 * localStorage solo recuerda que este navegador ya se suscribió.
 */
export function NewsletterBand({
  title,
  body,
  done: doneText,
}: {
  title: string;
  body: string;
  done: string;
}) {
  const [email, setEmail] = useState("");
  const [pending, startTransition] = useTransition();
  // Lo ya persistido se lee con useSyncExternalStore: hidratación segura.
  const stored = useSyncExternalStore(
    () => () => {},
    () => {
      try {
        return Boolean(localStorage.getItem(STORAGE_KEY));
      } catch {
        return false;
      }
    },
    () => false,
  );
  const [justDone, setJustDone] = useState(false);
  const done = stored || justDone;

  function subscribe() {
    if (!email || !email.includes("@")) return;
    startTransition(async () => {
      const res = await subscribeNewsletter(email);
      if (!res.ok) return;
      try {
        localStorage.setItem(STORAGE_KEY, email);
      } catch {
        /* sin storage alcanza con el estado visual */
      }
      setJustDone(true);
    });
  }

  return (
    <section className="bg-cream px-[clamp(16px,4vw,40px)] pb-20 pt-10">
      <div className="relative mx-auto box-content max-w-wide overflow-hidden rounded-[24px] bg-ink p-[clamp(30px,5vw,48px)] text-cream">
        <div
          aria-hidden="true"
          className="font-display pointer-events-none absolute -right-10 -top-[60px] select-none text-[220px] tracking-normal text-[rgba(94,184,56,.08)]"
        >
          ⚡
        </div>
        <div className="relative grid grid-cols-[repeat(auto-fit,minmax(min(340px,100%),1fr))] items-center gap-[26px]">
          <div>
            <h3 className="font-display m-0 text-[28px] tracking-[-.01em]">
              {title}
            </h3>
            <p className="mb-0 mt-[10px] max-w-[52ch] text-[14px] leading-[1.6] text-cream/60">
              {body}
            </p>
          </div>
          {done ? (
            <div className="flex items-center gap-[14px] rounded-2xl border border-[rgba(94,184,56,.4)] bg-[rgba(94,184,56,.12)] px-[22px] py-[18px]">
              <span className="flex h-[34px] w-[34px] flex-none items-center justify-center rounded-full bg-brand font-bold text-night">
                ✓
              </span>
              <div className="font-sans text-[14px] font-semibold">{doneText}</div>
            </div>
          ) : (
            <form
              className="flex flex-wrap gap-[10px]"
              onSubmit={(e) => {
                e.preventDefault();
                subscribe();
              }}
            >
              <input
                type="email"
                aria-label={lexicon.newsletter.placeholder}
                placeholder={lexicon.newsletter.placeholder}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="box-border min-w-[200px] flex-1 rounded-full border border-white/[.16] bg-white/[.08] px-[22px] py-[15px] text-[14px] text-cream outline-none placeholder:text-[#757575]"
              />
              <button
                type="submit"
                disabled={pending}
                className="rounded-full bg-brand px-7 py-[15px] font-sans text-[14px] font-bold text-night hover:bg-brand-hover disabled:opacity-60"
              >
                {lexicon.newsletter.submit}
              </button>
            </form>
          )}
        </div>
      </div>
    </section>
  );
}
