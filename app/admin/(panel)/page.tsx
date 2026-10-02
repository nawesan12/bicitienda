import { lexicon } from "@/lib/data/content";
import { getAdminStats, getTopConsulted } from "@/lib/server/admin-queries";
import { ResumenActions } from "./resumen-actions";

/**
 * Resumen: las 8 métricas con número fantasma, acciones rápidas,
 * newsletter (con su CSV), "Más consultados" y "Restablecer todo".
 */
export default async function AdminResumenPage() {
  const [stats, top] = await Promise.all([getAdminStats(), getTopConsulted()]);

  const cards = [
    { val: stats.products, label: `${lexicon.unitPlural.toUpperCase()} EN CATÁLOGO`, color: "text-ink" },
    { val: stats.published, label: "PUBLICADOS EN LA WEB", color: "text-brand-deep" },
    { val: stats.hidden, label: "OCULTOS", color: stats.hidden ? "text-danger" : "text-ink" },
    { val: stats.noPrice, label: "CON PRECIO A CONSULTAR", color: "text-ink" },
    { val: stats.articles, label: "NOTAS PUBLICADAS", color: "text-ink" },
    { val: stats.agenda, label: lexicon.admin.eventsStat, color: "text-ink" },
    { val: stats.newLeads, label: "CONSULTAS NUEVAS", color: stats.newLeads ? "text-brand-deep" : "text-ink" },
    { val: stats.subscribers, label: "SUSCRIPTOS AL NEWSLETTER", color: "text-ink" },
  ];

  const newsInfo = stats.subscribers
    ? `${stats.subscribers} ${stats.subscribers === 1 ? "suscripto" : "suscriptos"} · último: ${stats.lastSubscriber}`
    : "Todavía no hay suscriptos desde la web (probá el formulario del pie).";

  const mx = top[0]?.n ?? 1;

  return (
    <div className="animate-fade-in">
      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(200px,100%),1fr))] gap-[14px]">
        {cards.map((c) => (
          <div
            key={c.label}
            className="relative overflow-hidden rounded-[18px] border border-ink/10 bg-white p-[22px] transition-[transform,box-shadow,border-color] hover:-translate-y-[3px] hover:border-brand hover:shadow-[0_14px_30px_rgba(21,23,15,.1)]"
          >
            <div className="pointer-events-none absolute -top-4 right-[-10px] select-none font-display text-[84px] leading-none text-brand/[.07]">
              {c.val}
            </div>
            <div className={`relative font-display text-[32px] leading-tight tracking-normal ${c.color}`}>
              {c.val}
            </div>
            <div className="relative mt-[6px] font-sans text-[11.5px] font-semibold tracking-[.12em] text-ink/50">
              {c.label}
            </div>
          </div>
        ))}
      </div>

      <ResumenActions
        newLeads={stats.newLeads}
        newsInfo={newsInfo}
        hasSubscribers={stats.subscribers > 0}
        top={top.map((t) => ({ ...t, pct: Math.round((t.n / mx) * 100) }))}
      />
    </div>
  );
}
