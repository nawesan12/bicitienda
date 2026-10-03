import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import type { ReactNode } from "react";
import {
  AppointmentPill,
  Button,
  Eyebrow,
  Mono,
  OrderPill,
  Pill,
  QuotePill,
  SegmentedControl,
  TextLink,
} from "@/components/bt";
import { AccountNav } from "@/components/bt/cliente-c/account-nav";
import { AppointmentManager } from "@/components/bt/cliente-c/appointment-manager";
import { OrderSummaryCard } from "@/components/bt/cliente-c/order-summary-card";
import { COPY } from "@/lib/data/demo/copy";
import { features } from "@/lib/features";
import { paths } from "@/lib/paths";
import { getAccountScreen, getBookingData, type AccountScreen } from "@/lib/server/screens/cliente-c";
import { NOINDEX } from "@/lib/seo";
import { LogoutButton, ProfileForm } from "./account-client";

const C = COPY.account;

export const metadata: Metadata = { title: "Mi cuenta", robots: NOINDEX };

type Tab = "turnos" | "pedidos" | "datos";

function tabHref(tab: Tab): string {
  return tab === "turnos" ? paths.account() : `${paths.account()}?tab=${tab}`;
}

function SectionTitle({
  children,
  action,
  className,
}: {
  children: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={`flex items-baseline justify-between gap-4 ${className ?? ""}`}>
      <Eyebrow tone="muted" size="md" as="h2" className="max-md:text-[12px]">
        {children}
      </Eyebrow>
      {action}
    </div>
  );
}

/**
 * 2g / 4f · Mi cuenta. Dinámica (lee la sesión). Desktop: nav vertical
 * (Mis turnos / Mis pedidos / Mis datos / Cerrar sesión); mobile: tabs.
 * "Mis turnos" muestra lo del diseño (próximo turno, anteriores, pedidos)
 * más los presupuestos; las otras vistas no tienen diseño.
 */
export default async function AccountPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; vinculados?: string }>;
}) {
  if (!features.accounts) notFound();
  const [screen, booking, sp] = await Promise.all([getAccountScreen(), getBookingData(), searchParams]);
  if (!screen) redirect(paths.login());
  const tab: Tab = sp.tab === "pedidos" || sp.tab === "datos" ? sp.tab : "turnos";
  const linked = Number(sp.vinculados) || 0;
  const agenda = { timeZone: booking.timeZone, maxDaysAhead: booking.maxDaysAhead, minNoticeMin: booking.minNoticeMin };

  return (
    <div className="grid grid-cols-1 items-start gap-5 px-4 pt-5 pb-7 md:px-14 md:pt-10 md:pb-20 lg:grid-cols-[260px_minmax(0,1fr)] lg:gap-12">
      <aside className="flex flex-col gap-5 lg:gap-1">
        <h1 className="m-0 font-sans text-[56px] leading-[.88] font-black uppercase stretch-66 lg:mb-5 lg:text-[40px] lg:leading-[.9]">
          {C.hello}
          <br className="max-lg:hidden" /> {screen.account.firstName}
        </h1>
        <AccountNav
          className="max-lg:hidden"
          items={[
            { label: C.nav.appointments, href: tabHref("turnos"), active: tab === "turnos" },
            { label: C.nav.orders, href: tabHref("pedidos"), active: tab === "pedidos" },
            { label: C.nav.data, href: tabHref("datos"), active: tab === "datos" },
          ]}
          footer={<LogoutButton />}
        />
        <SegmentedControl
          className="lg:hidden"
          ariaLabel="Mi cuenta"
          items={[
            { label: C.navMobile.appointments, href: tabHref("turnos"), active: tab === "turnos" },
            { label: C.navMobile.orders, href: tabHref("pedidos"), active: tab === "pedidos" },
            { label: C.navMobile.data, href: tabHref("datos"), active: tab === "datos" },
          ]}
        />
      </aside>

      <div className="flex min-w-0 flex-col gap-5 md:gap-10">
        {linked > 0 && (
          <p role="status" className="m-0 rounded-box border border-yellow px-4 py-3 text-[15px] text-paper">
            Sumamos a tu cuenta {linked} {linked === 1 ? "pedido o turno anterior" : "pedidos y turnos anteriores"} hechos con
            tu email o WhatsApp.
          </p>
        )}
        {tab === "turnos" && (
          <>
            <AppointmentsSection screen={screen} agenda={agenda} />
            <OrdersSection screen={screen} />
            {screen.quotes.length > 0 && <QuotesSection screen={screen} />}
          </>
        )}
        {tab === "pedidos" && (
          <>
            <OrdersSection screen={screen} />
            <QuotesSection screen={screen} />
          </>
        )}
        {tab === "datos" && (
          <section className="flex flex-col gap-4">
            <SectionTitle>{C.nav.data}</SectionTitle>
            <ProfileForm name={screen.account.name} phone={screen.account.phone} email={screen.account.email} />
            <div className="border-t border-line pt-5 lg:hidden">
              <LogoutButton variant="button" />
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

function AppointmentsSection({
  screen,
  agenda,
}: {
  screen: AccountScreen;
  agenda: { timeZone: string; maxDaysAhead: number; minNoticeMin: number };
}) {
  const { next, upcoming, past } = screen;
  return (
    <>
      <section className="flex flex-col gap-4">
        {/* 4f no muestra el rótulo arriba de la card */}
        <SectionTitle className={next ? "max-md:sr-only" : undefined}>{C.nextAppointment}</SectionTitle>
        {next ? (
          <AppointmentManager appointment={next} appointmentRef={{ id: next.id }} agenda={agenda} mode="account" />
        ) : (
          <div className="flex flex-col items-start gap-3 rounded-card border-[1.5px] border-dashed border-line-strong p-5 md:flex-row md:items-center md:justify-between md:p-6">
            <div className="flex flex-col gap-1">
              <p className="m-0 text-[22px] leading-[.95] font-black uppercase stretch-70 md:text-[26px]">
                No tenés turnos reservados
              </p>
              <p className="m-0 text-[14px] text-text-2">Reservá una prueba de bici o un asesoramiento en el local.</p>
            </div>
            <Button href={paths.appointments()} variant="primary" size="md" className="max-md:w-full">
              Sacar turno
            </Button>
          </div>
        )}
        {upcoming.length > 0 && (
          <ul className="m-0 flex list-none flex-col border-t border-line p-0">
            {upcoming.map((u) => (
              <li
                key={u.id}
                className="flex items-center justify-between gap-3 border-b border-line py-3 text-[15px] md:grid md:grid-cols-[180px_1fr_160px] md:gap-5 md:py-4"
              >
                <Mono size={13} tone="soft" className="max-md:hidden">
                  {`${u.day} ${u.month} · ${u.time}`.toUpperCase()}
                </Mono>
                <span>
                  <strong>{u.serviceName}</strong>
                  <span className="md:hidden"> · {u.day} {u.month} {u.time}</span>
                </span>
                <span className="justify-self-end">
                  <AppointmentPill status={u.status} size="md" />
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {(past.length > 0 || next) && (
        <section className="flex flex-col gap-4 max-md:gap-0">
          <SectionTitle
            action={
              <TextLink href={paths.appointments()} className="max-md:text-[13px]">
                {C.newAppointment}
              </TextLink>
            }
          >
            {C.pastAppointments}
          </SectionTitle>
          {past.length ? (
            <ul className="m-0 flex list-none flex-col p-0 max-md:mt-2 md:border-t md:border-line">
              {past.map((p) => (
                <li
                  key={p.id}
                  className="flex items-center justify-between gap-[10px] border-t border-line py-3 text-[15px] md:grid md:grid-cols-[180px_1fr_160px] md:gap-5 md:border-t-0 md:border-b md:py-4"
                >
                  <Mono size={13} tone="soft" className="max-md:hidden">
                    {p.dateLabel}
                  </Mono>
                  <span className="flex min-w-0 flex-col gap-[2px] md:block">
                    <strong className="max-md:font-extrabold">{p.serviceName}</strong>
                    {p.detail && <span className="max-md:hidden"> · {p.detail}</span>}
                    <Mono size={11} className="md:hidden">
                      {p.dateLabel}
                    </Mono>
                  </span>
                  <span className="justify-self-end">
                    <AppointmentPill status={p.status} size="md" className="md:text-[12px]" />
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="m-0 text-[14px] text-text-3 max-md:mt-2">Todavía no tenés turnos anteriores.</p>
          )}
        </section>
      )}
    </>
  );
}

function OrdersSection({ screen }: { screen: AccountScreen }) {
  return (
    <section className="flex flex-col gap-4 max-md:gap-[10px]">
      <SectionTitle>{C.ordersTitle}</SectionTitle>
      {screen.orders.length ? (
        <div className="grid grid-cols-1 gap-[10px] md:grid-cols-2 md:gap-4">
          {screen.orders.map((o) => (
            <OrderSummaryCard
              key={o.number}
              href={o.href}
              number={`#${o.number}`}
              pill={
                o.pill ? (
                  <OrderPill status={o.pill} size="sm" className="md:px-[10px] md:text-[12px]" />
                ) : (
                  <Pill tone="red" size="sm" className="md:px-[10px] md:text-[12px]">
                    Pago pendiente
                  </Pill>
                )
              }
              title={o.itemsLabel}
              meta={o.meta}
              image={o.image}
            />
          ))}
        </div>
      ) : (
        <p className="m-0 text-[15px] text-text-2">
          Todavía no hiciste pedidos.{" "}
          <TextLink href={paths.catalog()} underline>
            Ver el catálogo
          </TextLink>
        </p>
      )}
    </section>
  );
}

function QuotesSection({ screen }: { screen: AccountScreen }) {
  return (
    <section className="flex flex-col gap-4 max-md:gap-[10px]">
      <SectionTitle
        action={
          <TextLink href={paths.quote()} className="max-md:text-[13px]">
            + Pedir presupuesto
          </TextLink>
        }
      >
        Mis presupuestos
      </SectionTitle>
      {screen.quotes.length ? (
        <div className="grid grid-cols-1 gap-[10px] md:grid-cols-2 md:gap-4">
          {screen.quotes.map((q) => (
            <OrderSummaryCard
              key={q.number}
              number={`#${q.number} · ${q.kind.toUpperCase()}`}
              pill={<QuotePill status={q.status} size="sm" className="md:px-[10px] md:text-[12px]" />}
              title={q.title}
              meta={q.meta}
              image={false}
            />
          ))}
        </div>
      ) : (
        <p className="m-0 text-[15px] text-text-2">No pediste presupuestos todavía.</p>
      )}
    </section>
  );
}
