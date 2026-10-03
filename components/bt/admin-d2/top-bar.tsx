import Link from "next/link";
import type { ReactNode } from "react";
import { AdminTopBar, type AdminTopBarProps } from "../admin";
import { cx } from "../cx";
import { SearchInput } from "../field";
import { FOCUS, FONT, TRANSITION } from "../styles";

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
