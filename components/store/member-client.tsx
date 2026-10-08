"use client";

import Link from "next/link";
import { useSyncExternalStore, type ReactNode } from "react";
import { cx } from "@/components/bt/cx";
import { FOCUS, FONT, MONO, TRANSITION } from "@/components/bt/styles";
import { useMemberState } from "@/lib/member-store";
import { MEMBERS_COPY } from "./members-copy";

const DISMISS_KEY = "bt:member-bar-closed";

/**
 * Barra amarilla arriba del header (todo el sitio): invita a crear la
 * cuenta. No aparece con sesión ni en /cuenta/*; la cruz la cierra hasta
 * que se cierra la pestaña (sessionStorage), así vuelve en la próxima visita.
 */
const dismissListeners = new Set<() => void>();

function readDismissed(): boolean {
  try {
    return sessionStorage.getItem(DISMISS_KEY) === "1";
  } catch {
    return false; // storage bloqueado: la barra queda visible
  }
}

function dismissBar() {
  try {
    sessionStorage.setItem(DISMISS_KEY, "1");
  } catch {
    /* sin storage: no se puede recordar */
  }
  hiddenThisView = true;
  for (const l of dismissListeners) l();
}

let hiddenThisView = false;

function subscribeDismiss(l: () => void) {
  dismissListeners.add(l);
  return () => {
    dismissListeners.delete(l);
  };
}

export function MemberPromoBar({ href, hidden }: { href: string; hidden?: boolean }) {
  const member = useMemberState();
  const closed = useSyncExternalStore(
    subscribeDismiss,
    () => hiddenThisView || readDismissed(),
    () => false,
  );

  if (hidden || closed || member === "member") return null;

  const close = dismissBar;

  const C = MEMBERS_COPY.bar;
  return (
    <div className={cx("relative bg-yellow text-ink", FONT)}>
      <Link
        href={href}
        className={cx(
          "group flex min-h-[44px] items-center justify-center gap-x-3 gap-y-1 py-2 pr-12 pl-4 text-center lg:px-14",
          FOCUS,
          "focus-visible:-outline-offset-4 focus-visible:outline-ink",
        )}
      >
        <span className="flex-none rounded-[3px] bg-red px-[7px] py-[3px] text-[10px] font-extrabold tracking-[.08em] text-white uppercase md:text-[11px]">
          {C.tag}
        </span>
        <span className="text-[13px] leading-[1.2] font-bold md:text-[15px]">
          <span className="md:hidden">{C.textMobile}</span>
          <span className="max-md:hidden">{C.text}</span>
        </span>
        <span
          className={cx(
            "flex-none text-[13px] font-extrabold tracking-[.06em] uppercase underline decoration-[1.5px] underline-offset-4 group-hover:decoration-transparent max-sm:hidden md:text-[14px]",
            TRANSITION,
          )}
        >
          {C.cta} →
        </span>
      </Link>
      <button
        type="button"
        onClick={close}
        aria-label={C.close}
        className={cx(
          "absolute top-1/2 right-1 grid size-10 -translate-y-1/2 place-items-center rounded-[4px] text-ink/70 hover:bg-ink/8 hover:text-ink lg:right-4",
          TRANSITION,
          FOCUS,
          "focus-visible:outline-ink",
        )}
      >
        <svg viewBox="0 0 16 16" className="size-4" fill="none" stroke="currentColor" strokeWidth={2.2} aria-hidden>
          <path d="M3.5 3.5l9 9M12.5 3.5l-9 9" strokeLinecap="square" />
        </svg>
      </button>
    </div>
  );
}

/** Oculta su contenido si el visitante ya tiene cuenta (páginas ISR: la sesión se sabe en el cliente). */
export function HideForMembers({ children }: { children: ReactNode }) {
  const member = useMemberState();
  if (member === "member") return null;
  return <>{children}</>;
}

/** Checkout sin sesión: tarjeta chica que invita a registrarse (el carrito queda guardado). */
export function MemberNudge({ href, className }: { href: string; className?: string }) {
  const C = MEMBERS_COPY.nudge;
  return (
    <Link
      href={href}
      className={cx(
        "group flex items-center gap-3 rounded-box border-[1.5px] border-dashed border-yellow/60 bg-yellow/6 p-3 text-paper hover:border-yellow md:gap-4 md:p-4",
        FONT,
        TRANSITION,
        FOCUS,
        className,
      )}
    >
      <span className="grid size-10 flex-none place-items-center rounded-[6px] bg-yellow text-ink">
        <StarIcon className="size-5" />
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-[2px]">
        <span className="text-[15px] leading-[1.1] font-extrabold uppercase stretch-80 md:text-[17px]">{C.title}</span>
        <span className="text-[13px] leading-[1.35] text-text-2 md:text-[14px]">{C.text}</span>
      </span>
      <span className={cx("flex-none text-[12px] font-semibold text-yellow uppercase max-sm:hidden", MONO)}>
        {C.cta} →
      </span>
    </Link>
  );
}

export function StarIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" className={className} fill="currentColor" aria-hidden>
      <path d="M10 1.5l2.6 5.5 6 .7-4.5 4.1 1.2 5.9L10 14.8l-5.3 2.9 1.2-5.9L1.4 7.7l6-.7z" />
    </svg>
  );
}
