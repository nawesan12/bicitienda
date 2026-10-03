import Link from "next/link";
import type { ReactNode } from "react";
import { BrandLockup, Logo } from "./brand";
import { cx } from "./cx";
import { SearchInput } from "./field";
import { FOCUS, FONT, MONO, TRANSITION } from "./styles";
import { Display } from "./typography";

/* ── AdminSidebar ─────────────────────────────────────────────
   240 px, fondo #0b0a09, borde derecho #2b2824, padding 28×18, gap 4.
   Logo 40 + wordmark 22 (padding 0 8 28). Ítems padding 12, radio 6,
   700 14 px uppercase .06em, contador mono 600 12. Activo: amarillo con
   tinta; resto #cfc8bb. Abajo "Ver tienda ↗" 700 13 px #8d867a.
   Sin "Usuarios" ni bloque de usuario: el admin entra con PIN.
   ──────────────────────────────────────────────────────────── */

export type AdminSection =
  | "resumen"
  | "pedidos"
  | "turnos"
  | "presupuestos"
  | "productos"
  | "clientes"
  | "ajustes";

export const ADMIN_NAV: { key: AdminSection; label: string }[] = [
  { key: "resumen", label: "Resumen" },
  { key: "pedidos", label: "Pedidos" },
  { key: "turnos", label: "Turnos" },
  { key: "presupuestos", label: "Presupuestos" },
  { key: "productos", label: "Productos" },
  { key: "clientes", label: "Clientes" },
  { key: "ajustes", label: "Ajustes" },
];

export interface AdminSidebarProps {
  active: AdminSection;
  hrefs: Record<AdminSection, string>;
  /** Contadores a la derecha ("Pedidos 7"). Vacío = sin contador. */
  counts?: Partial<Record<AdminSection, number | string>>;
  /** Link "Ver tienda ↗" (abre en otra pestaña). */
  storeHref: string;
  homeHref?: string;
  /** Slot debajo de "Ver tienda" (ej. botón Salir). */
  footer?: ReactNode;
  className?: string;
}

export function AdminSidebar({
  active,
  hrefs,
  counts = {},
  storeHref,
  homeHref,
  footer,
  className,
}: AdminSidebarProps) {
  return (
    <aside
      className={cx(
        "box-border flex h-full w-[240px] flex-none flex-col gap-1 border-r border-line bg-ink-deep px-[18px] py-7 text-paper",
        FONT,
        className,
      )}
    >
      <BrandLockup
        href={homeHref ?? hrefs.resumen}
        logoSize={40}
        wordmarkSize="sidebar"
        gap="gap-[10px]"
        className="flex-none px-2 pb-7"
      />
      <nav aria-label="Admin" className="flex flex-col gap-1">
        {ADMIN_NAV.map((n) => {
          const on = n.key === active;
          const count = counts[n.key];
          return (
            <Link
              key={n.key}
              href={hrefs[n.key]}
              aria-current={on ? "page" : undefined}
              className={cx(
                "flex items-center justify-between rounded-btn p-3 text-[14px] font-bold uppercase tracking-[.06em]",
                on
                  ? "bg-yellow text-ink"
                  : "text-text-2 hover:bg-paper/40 hover:text-paper",
                TRANSITION,
                FOCUS,
              )}
            >
              {n.label}
              {count !== undefined && count !== "" && (
                <span className={cx("text-[12px] font-semibold tracking-normal", MONO)}>{count}</span>
              )}
            </Link>
          );
        })}
      </nav>
      <div className="flex-1" />
      <a
        href={storeHref}
        target="_blank"
        rel="noopener noreferrer"
        className={cx(
          "rounded-btn p-3 text-[13px] font-bold uppercase tracking-[.06em] text-text-3 hover:text-yellow",
          TRANSITION,
          FOCUS,
        )}
      >
        Ver tienda ↗
      </a>
      {footer}
    </aside>
  );
}

/* ── AdminTopBar ──────────────────────────────────────────────
   padding 22×40, gap 14, borde inferior #2b2824. H1 44/1 @66 %
   (con "← Productos" 600 13 px encima si hay `back`). Buscador 280 px
   y acciones a la derecha. `children` va pegado al título (ej. el
   selector de semana "‹ 5 – 10 oct 2026 ›" de Turnos).
   ──────────────────────────────────────────────────────────── */

export interface AdminTopBarProps {
  title: ReactNode;
  back?: { href: string; label: ReactNode };
  search?: { action: string; placeholder: string; name?: string; defaultValue?: string; width?: 280 | 300 };
  actions?: ReactNode;
  children?: ReactNode;
  className?: string;
}

export function AdminTopBar({ title, back, search, actions, children, className }: AdminTopBarProps) {
  return (
    <div
      className={cx(
        "flex items-center gap-[14px] border-b border-line px-10 py-[22px] text-paper",
        FONT,
        className,
      )}
    >
      <div className="flex min-w-0 flex-col gap-1">
        {back && (
          <Link
            href={back.href}
            className={cx("self-start rounded-[2px] text-[13px] font-semibold text-text-3 hover:text-paper", TRANSITION, FOCUS)}
          >
            ← {back.label}
          </Link>
        )}
        <Display size="admin" className="truncate">
          {title}
        </Display>
      </div>
      {children}
      <div className="flex-1" />
      {search && (
        <SearchInput
          action={search.action}
          name={search.name}
          placeholder={search.placeholder}
          defaultValue={search.defaultValue}
          className={search.width === 300 ? "w-[300px] shrink" : "w-[280px] shrink"}
        />
      )}
      {actions && <div className="flex flex-none items-center gap-[14px]">{actions}</div>}
    </div>
  );
}

/* ── AdminMobileHeader (4h / 4i) ──────────────────────────────
   Fondo #0b0a09, padding 12×16, gap 10: logo 36, "Admin · Mostrador"
   900 18/1 @72 % (Mostrador amarillo), botón "Menú" 44 alto con borde
   #3a362f, 800 13 px uppercase.
   ──────────────────────────────────────────────────────────── */

export function AdminMobileHeader({
  label = "Mostrador",
  homeHref,
  menuHref,
  menu,
  className,
}: {
  label?: string;
  homeHref?: string;
  /** Link del botón "Menú". */
  menuHref?: string;
  /** Reemplaza el botón "Menú" (ej. un drawer cliente). */
  menu?: ReactNode;
  className?: string;
}) {
  const title = (
    <span className="text-[18px] font-black uppercase leading-none stretch-72">
      Admin · <span className="text-yellow">{label}</span>
    </span>
  );
  return (
    <header
      className={cx(
        "flex items-center gap-[10px] border-b border-line bg-ink-deep px-4 py-3 text-paper",
        FONT,
        className,
      )}
    >
      {homeHref ? (
        <Link href={homeHref} className={cx("flex min-w-0 flex-1 items-center gap-[10px] rounded-[2px]", FOCUS)}>
          <Logo size={36} decorative />
          {title}
        </Link>
      ) : (
        <span className="flex min-w-0 flex-1 items-center gap-[10px]">
          <Logo size={36} decorative />
          {title}
        </span>
      )}
      {menu ??
        (menuHref && (
          <Link
            href={menuHref}
            className={cx(
              "flex h-11 flex-none items-center rounded-btn border border-line-strong px-[14px] text-[13px] font-extrabold uppercase hover:border-text-4",
              TRANSITION,
              FOCUS,
            )}
          >
            Menú
          </Link>
        ))}
    </header>
  );
}

/** Layout del admin desktop: grilla 240 | 1fr, min-h 980 (del handoff). */
export function AdminShell({
  sidebar,
  children,
  className,
}: {
  sidebar: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cx(
        "grid min-h-[980px] grid-cols-[240px_minmax(0,1fr)] bg-ink text-paper",
        FONT,
        className,
      )}
    >
      {sidebar}
      <div className="flex min-w-0 flex-col">{children}</div>
    </div>
  );
}

/**
 * Barra superior de las pantallas del admin que también se usan en el
 * celular. Desde `lg` es el `AdminTopBar` del handoff tal cual; debajo
 * (no está dibujado) se apila: "← Volver" 600 13 px, título Archivo 900
 * 40/.9 @66 % uppercase, buscador a ancho completo y las acciones en una
 * grilla de dos columnas (`mobileActions`, o las mismas `actions`).
 */
export function ResponsiveTopBar({
  mobileActions,
  ...props
}: AdminTopBarProps & { mobileActions?: ReactNode | null }) {
  const { title, back, search, actions, children } = props;
  const mActions = mobileActions !== undefined ? mobileActions : actions;
  return (
    <>
      <AdminTopBar {...props} className={cx("max-lg:hidden", props.className)} />
      <div className={cx("flex flex-col gap-3 border-b border-line px-4 pt-5 pb-4 text-paper lg:hidden", FONT)}>
        {back && (
          <Link
            href={back.href}
            className={cx("self-start rounded-[2px] text-[13px] font-semibold text-text-3 hover:text-paper", TRANSITION, FOCUS)}
          >
            ← {back.label}
          </Link>
        )}
        <h1 className="m-0 text-[40px] font-black uppercase leading-[.9] stretch-66 [overflow-wrap:anywhere]">
          {title}
        </h1>
        {children}
        {search && (
          <SearchInput
            action={search.action}
            name={search.name}
            placeholder={search.placeholder}
            defaultValue={search.defaultValue}
            size="lg"
          />
        )}
        {mActions && <div className="grid grid-cols-2 gap-[10px] *:w-full">{mActions}</div>}
      </div>
    </>
  );
}
