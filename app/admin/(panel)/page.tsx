import type { Metadata } from "next";
import { AdminTopBar, Button, Display, FilterChip, Kpi, KpiGrid, Mono } from "@/components/bt";
import { SectionHeading } from "@/components/bt/admin-d1/common";
import { TodayAppointmentCard } from "@/components/bt/admin-d1/today";
import { features } from "@/lib/features";
import { getResumen, todayTitle, type OrderRow } from "@/lib/server/screens/admin-d1";
import { OrdersTable } from "./pedidos/orders-table";
import { ResumenWelcome } from "./resumen-actions";

export const metadata: Metadata = { title: "Resumen" };

/** Chips de la tabla de 2i (sin contadores, como el prototipo). */
const CHIPS: { key: string; label: string; match: (r: OrderRow) => boolean }[] = [
  { key: "todos", label: "Todos", match: () => true },
  { key: "armar", label: "Para armar", match: (r) => r.pill === "pagado" || r.pill === "armando" },
  { key: "listos", label: "Listos", match: (r) => r.pill === "listo" },
  { key: "transf", label: "Transf. pendiente", match: (r) => r.pill === "transf_pendiente" },
];

/**
 * 2i / 4h · Resumen "Hoy": KPIs del día real (zona del local), turnos de
 * hoy y los pedidos por atender (abiertos: cobrar, armar o entregar).
 */
export default async function AdminResumenPage({ searchParams }: { searchParams: Promise<{ f?: string }> }) {
  const { f } = await searchParams;
  const data = await getResumen();
  const title = todayTitle(data.date);
  const chip = CHIPS.find((c) => c.key === f) ?? CHIPS[0];
  const orders = data.orders.filter(chip.match);
  const turnoHref = (id: string) => `/admin/turnos?semana=${data.monday}&sel=${id}`;
  const k = data.kpis;

  const kpis = [
    { label: "Pedidos hoy", value: k.ordersToday, tone: "paper" as const },
    { label: "Para retirar", value: k.readyForPickup, tone: "yellow" as const },
    { label: "Turnos hoy", value: k.appointmentsToday, tone: "paper" as const },
    { label: "Transf. a validar", value: k.transfersToValidate, tone: "red" as const },
  ];

  const appointments = features.appointments ? (
    <section className="flex flex-col gap-[14px]" aria-labelledby="turnos-hoy">
      <SectionHeading
        aside={
          <Mono size={12} uppercase className="max-lg:hidden">
            {data.today.length} {data.today.length === 1 ? "turno" : "turnos"}
          </Mono>
        }
      >
        <span id="turnos-hoy">Turnos de hoy</span>
      </SectionHeading>
      {data.today.length ? (
        <div className="flex flex-col gap-2">
          {data.today.map((a) => (
            <TodayAppointmentCard
              key={a.id}
              time={a.time}
              name={a.name}
              service={a.service}
              detail={a.detail}
              status={a.status}
              href={turnoHref(a.id)}
            />
          ))}
        </div>
      ) : (
        <p className="m-0 rounded-box border border-line p-[14px] text-[14px] text-text-3">No hay turnos para hoy.</p>
      )}
    </section>
  ) : null;

  return (
    <>
      <ResumenWelcome />

      {/* ── 2i desktop ── */}
      <div className="max-lg:hidden">
        <AdminTopBar
          className="gap-5"
          title={`Hoy · ${title.long}`}
          search={{ action: "/admin/pedidos", placeholder: "Buscar pedido o cliente", width: 300 }}
          actions={
            features.appointments ? (
              <Button variant="primary" size="md" href="/admin/turnos?nuevo=1">
                + Turno manual
              </Button>
            ) : undefined
          }
        />
        <KpiGrid columns={4} flush>
          {kpis.map((x) => (
            <Kpi key={x.label} label={x.label} value={x.value} tone={x.tone} size="lg" />
          ))}
        </KpiGrid>
        <div className="grid grid-cols-[420px_minmax(0,1fr)] items-start gap-7 px-10 pb-10 pt-7">
          {appointments ?? <span />}
          <section className="flex min-w-0 flex-col gap-[14px]" aria-labelledby="pedidos-hoy">
            <div className="flex flex-wrap items-baseline gap-5">
              <h2 id="pedidos-hoy" className="m-0 text-[28px] font-black uppercase leading-none stretch-70">
                Pedidos
              </h2>
              <nav aria-label="Filtrar pedidos" className="flex flex-wrap gap-[6px]">
                {CHIPS.map((c) => (
                  <FilterChip key={c.key} size="sm" active={c.key === chip.key} href={c.key === "todos" ? "/admin" : `/admin?f=${c.key}`}>
                    {c.label}
                  </FilterChip>
                ))}
              </nav>
            </div>
            <OrdersTable
              rows={orders}
              hrefFor={(r) => `/admin/pedidos?sel=${r.number}`}
              empty={data.orders.length ? "No hay pedidos en este filtro." : "No hay pedidos por atender."}
            />
          </section>
        </div>
      </div>

      {/* ── 4h mobile ── */}
      <div className="flex flex-col gap-[18px] px-4 pb-7 pt-[18px] lg:hidden">
        <Display size="admin" className="leading-[.88]">
          Hoy · {title.short}
        </Display>
        <KpiGrid columns={2}>
          {kpis.map((x) => (
            <Kpi key={x.label} label={x.label} value={x.value} tone={x.tone} size="md" />
          ))}
        </KpiGrid>
        {appointments}
        <Button variant="secondary" size="full" href="/admin/pedidos?f=listos" className="min-h-[50px] text-[15px]">
          Ver pedidos para retirar · {k.readyForPickup}
        </Button>
      </div>
    </>
  );
}
