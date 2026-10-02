"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useTransition } from "react";
import { useConfirm } from "@/components/admin/confirm";
import {
  ADMIN_SECTIONS,
  sectionFor,
  type NavBadge,
} from "@/components/admin/sections";
import { Bolt } from "@/components/store/bolt";
import { store } from "@/lib/config";
import { cx as cn } from "@/components/admin/cx";
import { resolveImage } from "@/lib/images";
import { logout } from "@/lib/server/actions/session";

export type NavCounts = Record<NavBadge, number>;

/** Grilla verde del sidebar (42px, quieta). */
const SIDEBAR_GRID = {
  backgroundImage:
    "linear-gradient(rgba(94,184,56,.05) 1px,transparent 1px),linear-gradient(90deg,rgba(94,184,56,.05) 1px,transparent 1px)",
  backgroundSize: "42px 42px",
};

const LOGOUT = "__logout";

/**
 * Navegación del panel, fiel al prototipo: en desktop, sidebar night
 * sticky de 240px con scroll interno, contadores, "Ver la web ↗" y cerrar
 * sesión; por debajo de 860px, topbar sticky con logo, select de sección
 * ("Consultas (3)") y "Web ↗".
 */
export function AdminNav({ counts }: { counts: NavCounts }) {
  const pathname = usePathname();
  const router = useRouter();
  const confirm = useConfirm();
  const [, startTransition] = useTransition();
  const current = sectionFor(pathname);

  async function askLogout() {
    const ok = await confirm({
      icon: "→",
      title: "Cerrar sesión",
      message: "Salís del panel de administración. Los cambios ya quedaron guardados.",
      label: "Cerrar sesión",
    });
    if (ok) startTransition(() => logout());
  }

  const badge = (key?: NavBadge) => (key && counts[key] ? String(counts[key]) : "");

  return (
    <>
      {/* Topbar mobile */}
      <header className="sticky top-0 z-50 box-border flex w-full items-center gap-3 bg-night px-4 py-3 min-[860px]:hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={resolveImage("/brand/logo-white.png")}
          alt={store.brandName}
          className="block w-[110px] flex-none"
        />
        <select
          value={current.href}
          aria-label="Sección"
          onChange={(e) => {
            if (e.target.value === LOGOUT) {
              e.target.value = current.href;
              void askLogout();
            } else {
              router.push(e.target.value);
              window.scrollTo(0, 0);
            }
          }}
          className="min-h-11 min-w-0 flex-1 rounded-[10px] border border-brand/40 bg-white/8 px-3 py-[10px] font-sans text-[13px] font-bold text-cream outline-none"
        >
          {ADMIN_SECTIONS.map((s) => (
            <option key={s.href} value={s.href} className="text-ink">
              {s.label}
              {badge(s.badge) ? ` (${badge(s.badge)})` : ""}
            </option>
          ))}
          <option value={LOGOUT} className="text-ink">
            Cerrar sesión
          </option>
        </select>
        <a
          href="/"
          target="_blank"
          rel="noreferrer"
          className="inline-flex min-h-11 flex-none items-center rounded-full bg-brand px-[14px] py-[10px] font-sans text-xs font-bold text-night"
        >
          Web ↗
        </a>
      </header>

      {/* Sidebar desktop */}
      <aside
        className="no-scrollbar sticky top-0 box-border hidden h-screen w-[240px] flex-none flex-col self-start overflow-y-auto bg-night px-[18px] py-[26px] text-cream min-[860px]:flex"
        style={SIDEBAR_GRID}
      >
        <Bolt
          width={180}
          height={240}
          stroke="#5eb838"
          strokeWidth={0.6}
          className="pointer-events-none absolute -right-10 bottom-[60px] opacity-[.07]"
        />
        <Link href="/admin" className="relative mx-auto mb-2 block w-[170px]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={resolveImage("/brand/logo-white.png")}
            alt={store.brandName}
            className="block w-[170px]"
          />
        </Link>
        <div className="relative mb-6 text-center font-sans text-[10px] font-semibold tracking-[.3em] text-brand">
          PANEL DE ADMIN
        </div>
        <nav className="relative flex flex-col gap-1">
          {ADMIN_SECTIONS.map((s) => {
            const on = s.href === current.href;
            return (
              <Link
                key={s.href}
                href={s.href}
                className={cn(
                  "flex items-center justify-between gap-[10px] rounded-xl border px-[14px] py-[9px] font-sans text-[13.5px] font-bold transition-colors hover:bg-brand/14 hover:text-brand",
                  on
                    ? "border-brand/40 bg-brand/14 text-brand"
                    : "border-transparent text-cream/75",
                )}
              >
                <span>{s.label}</span>
                <span className="font-sans text-[11px] font-semibold text-cream/40">
                  {badge(s.badge)}
                </span>
              </Link>
            );
          })}
        </nav>
        <span className="flex-1" />
        <a
          href="/"
          target="_blank"
          rel="noreferrer"
          className="relative mt-5 rounded-full bg-brand p-[13px] text-center font-sans text-[13px] font-bold text-night transition-colors hover:bg-brand-hover"
        >
          Ver la web ↗
        </a>
        <button
          type="button"
          onClick={askLogout}
          className="relative p-3 text-center font-sans text-xs font-semibold text-cream/50 transition-colors hover:text-cream"
        >
          Cerrar sesión
        </button>
      </aside>
    </>
  );
}

/** Encabezado de cada sección: kicker + título + "Guardado automático activo". */
export function AdminHeader() {
  const pathname = usePathname();
  const s = sectionFor(pathname);
  return (
    <div className="mb-[26px] flex flex-wrap items-center justify-between gap-[14px]">
      <div>
        <div className="font-sans text-[11px] font-bold tracking-[.26em] text-brand-deep">
          {s.kicker}
        </div>
        <h1 className="font-display m-0 mt-1 text-[clamp(26px,3vw,38px)] text-ink">
          {s.label}
        </h1>
      </div>
      <div className="flex items-center gap-2 rounded-full border border-brand/35 bg-brand-pastel px-4 py-2 font-sans text-xs font-semibold text-brand-deeper">
        <span className="inline-block h-2 w-2 rounded-full bg-brand-deep" />
        Guardado automático activo
      </div>
    </div>
  );
}
