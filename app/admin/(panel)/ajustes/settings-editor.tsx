"use client";

import { useEffect, useState, useTransition } from "react";
import {
  AutoField,
  parseMoney,
  parsePct,
  useDebouncedSave,
} from "@/components/admin/autosave";
import { useToast } from "@/components/admin/toast";
import {
  btnDanger,
  btnDark,
  Card,
  CardGrid,
  CardTitle,
  Hint,
  inputCls,
  Label,
  ToggleRow,
} from "@/components/admin/ui";
import { cx as cn } from "@/components/admin/cx";
import { formatARS, formatDateTime, formatNumber } from "@/lib/format";
import { patchSettings, type SettingsPatch } from "@/lib/server/actions/settings";

/* Rutas del OAuth de Instagram (iguales a las de lib/server/instagram.ts, que
   es server-only y no se puede importar desde este componente). */
const INSTAGRAM_CONNECT_PATH = "/api/auth/instagram/start";
const INSTAGRAM_DISCONNECT_PATH = "/api/auth/instagram/disconnect";

interface Settings {
  whatsapp: string;
  address: string;
  hours: string;
  showPrices: boolean;
  ventaOnline: boolean;
  r3: number;
  r6: number;
  transferDiscount: number;
  instagram: string;
  tiktok: string;
  mapsUrl: string;
  transferAlias: string;
  depositPct: number;
  depositMinTotal: number;
  reservationHours: number;
  localShippingCost: number;
}

/** Estado de la conexión con Instagram (OAuth) que arma la página. */
interface InstagramState {
  connected: boolean;
  source: "oauth" | "env" | null;
  username: string | null;
  /** ISO; null si el token no vence o vino del env. */
  expiresAt: string | null;
  /** IG_APP_ID, IG_APP_SECRET e IG_REDIRECT_URI están cargadas. */
  canConnect: boolean;
  /** `?ig=` con el que volvió el OAuth: ok | error | desconectado. */
  result: string | null;
  reason: string | null;
}

/** Motivos de `?ig=error&motivo=` del callback, en criollo. */
const IG_ERRORS: Record<string, string> = {
  cancelado: "Cancelaste la conexión en Instagram",
  sesion: "La sesión del panel venció: ingresá de nuevo y reintentá",
  estado: "El pedido de conexión venció: reintentá",
  config: "Faltan las credenciales de la app de Meta en el servidor",
  token: "Instagram rechazó el código: reintentá",
  "token-largo": "No se pudo obtener el token de larga duración",
  perfil: "No se pudo leer el perfil de la cuenta",
  db: "No se pudo guardar la conexión",
};

/** Monto del ejemplo de financiación del prototipo. */
const EXAMPLE = 3_000_000;

/**
 * Ajustes, fiel al prototipo: contacto, comportamiento de la web (precios y
 * venta online), financiación Payway (Plan MiPyME) con ejemplo en vivo y
 * redes. Abajo, los ajustes del e-commerce del core (alias, seña, reserva,
 * envío). Todo se guarda solo.
 */
export function SettingsEditor({
  settings: s,
  instagram: ig,
}: {
  settings: Settings;
  instagram: InstagramState;
}) {
  const toast = useToast();

  // Vuelta del OAuth de Instagram: avisa y limpia el ?ig= de la URL.
  useEffect(() => {
    if (!ig.result) return;
    if (ig.result === "ok") toast("Instagram conectado: el feed aparece en el inicio");
    else if (ig.result === "desconectado") toast("Instagram desconectado");
    else toast(IG_ERRORS[ig.reason ?? ""] ?? "No se pudo conectar Instagram");
    window.history.replaceState(null, "", window.location.pathname);
  }, [ig.result, ig.reason, toast]);
  const [, startTransition] = useTransition();
  const [showPrices, setShowPrices] = useState(s.showPrices);
  const [ventaOnline, setVentaOnline] = useState(s.ventaOnline);
  const [rates, setRates] = useState({
    r3: String(s.r3),
    r6: String(s.r6),
    dto: String(s.transferDiscount),
  });
  const ratesSave = useDebouncedSave<SettingsPatch>((v) => patchSettings(v));
  const save = (patch: SettingsPatch) => patchSettings(patch);
  const field = inputCls();

  const r3 = parsePct(rates.r3);
  const r6 = parsePct(rates.r6);
  const dto = parsePct(rates.dto);
  const finEx = `3 × ${formatARS((EXAMPLE * (1 + r3 / 100)) / 3)} · 6 × ${formatARS(
    (EXAMPLE * (1 + r6 / 100)) / 6,
  )} · transferencia ${formatARS(EXAMPLE * (1 - dto / 100))}`;

  function setRate(key: "r3" | "r6" | "dto", raw: string) {
    const clean = raw.replace(/[^\d.,]/g, "");
    const next = { ...rates, [key]: clean };
    setRates(next);
    ratesSave.schedule({
      r3: parsePct(next.r3),
      r6: parsePct(next.r6),
      transferDiscount: parsePct(next.dto),
    });
  }

  function toggle(key: "showPrices" | "ventaOnline", on: boolean, msg: string) {
    if (key === "showPrices") setShowPrices(on);
    else setVentaOnline(on);
    startTransition(async () => {
      const res = await save({ [key]: on });
      toast(res.ok ? msg : res.error);
    });
  }

  const rateInput = (key: "r3" | "r6" | "dto", label: string, ph: string) => (
    <div className="flex flex-col justify-between">
      <Label>{label}</Label>
      <input
        value={rates[key]}
        inputMode="decimal"
        placeholder={ph}
        aria-label={label}
        onChange={(e) => setRate(key, e.target.value)}
        onBlur={() => void ratesSave.flush()}
        className={cn(field, "mt-[6px] w-full text-center text-[15px] font-bold")}
      />
    </div>
  );

  return (
    <CardGrid className="animate-fade-in">
      <Card>
        <CardTitle>Contacto y links</CardTitle>
        <Label>WHATSAPP (SOLO NÚMEROS, CON 54)</Label>
        <AutoField
          initial={s.whatsapp}
          inputMode="tel"
          transform={(v) => v.replace(/\D/g, "")}
          onSave={(v) => save({ whatsapp: v })}
          onSaved={() => toast("WhatsApp actualizado en toda la web")}
          className={field}
        />
        <Label>DIRECCIÓN</Label>
        <AutoField initial={s.address} onSave={(v) => save({ address: v })} className={field} />
        <Label>HORARIOS</Label>
        <AutoField initial={s.hours} onSave={(v) => save({ hours: v })} className={field} />
      </Card>

      <Card className="gap-[14px]">
        <CardTitle>Comportamiento de la web</CardTitle>
        <ToggleRow
          label="Mostrar precios en la web"
          on={showPrices}
          onClick={() =>
            toggle(
              "showPrices",
              !showPrices,
              showPrices ? "Precios ocultos: todo deriva a WhatsApp" : "Precios visibles en la web",
            )
          }
        />
        <ToggleRow
          label="Venta online"
          on={ventaOnline}
          onClick={() =>
            toggle(
              "ventaOnline",
              !ventaOnline,
              ventaOnline
                ? "Venta online apagada: todo deriva a WhatsApp"
                : "Venta online activada",
            )
          }
        />
        <Hint>
          Con los precios ocultos, todos los modelos muestran “Consultar” y derivan a
          WhatsApp. Con la venta online apagada la web no muestra el carrito ni
          “Comprar”: es 100% WhatsApp.
        </Hint>
      </Card>

      <Card>
        <div className="flex flex-wrap items-center justify-between gap-[10px]">
          <CardTitle>Financiación</CardTitle>
          <span className="rounded-full bg-night px-[10px] py-1 font-sans text-[9.5px] font-bold tracking-[.14em] text-brand">
            PAYWAY · PLAN MIPYME
          </span>
        </div>
        <div className="font-sans text-[12.5px] leading-[1.6] text-ink/55">
          La web calcula sola las cuotas de cada modelo. Cargá el recargo de cada plan
          (0 = sin recargo).
        </div>
        <div className="grid grid-cols-3 gap-[10px]">
          {rateInput("r3", "3 CUOTAS (%)", "0")}
          {rateInput("r6", "6 CUOTAS (%)", "0")}
          {rateInput("dto", "DTO. TRANSF. (%)", "5")}
        </div>
        <div className="rounded-xl bg-cream px-4 py-[14px] font-sans text-[12.5px] font-medium leading-[1.7]">
          <span className="text-ink/50">Ej. sobre {formatARS(EXAMPLE)} →</span> {finEx}
        </div>
      </Card>

      <Card>
        <CardTitle>Redes y mapa</CardTitle>
        <Label>INSTAGRAM</Label>
        <AutoField
          initial={s.instagram ? `https://www.instagram.com/${s.instagram}/` : ""}
          onSave={(v) => save({ instagram: v })}
          className={field}
        />
        <InstagramFeed ig={ig} />
        <Label>TIKTOK</Label>
        <AutoField
          initial={s.tiktok ? `https://www.tiktok.com/@${s.tiktok}` : ""}
          onSave={(v) => save({ tiktok: v })}
          className={field}
        />
        <Label>LINK DE GOOGLE MAPS (“CÓMO LLEGAR”)</Label>
        <AutoField initial={s.mapsUrl} onSave={(v) => save({ mapsUrl: v })} className={field} />
      </Card>

      <Card>
        <div className="flex flex-wrap items-center justify-between gap-[10px]">
          <CardTitle>Venta online</CardTitle>
          <span className="rounded-full bg-brand-pastel px-[10px] py-1 font-sans text-[9.5px] font-bold tracking-[.14em] text-brand-deeper">
            CARRITO Y CHECKOUT
          </span>
        </div>
        <div className="font-sans text-[12.5px] leading-[1.6] text-ink/55">
          Cómo se cobran los pedidos de la web: transferencia con descuento, reserva
          con seña y envío dentro de la ciudad.
        </div>
        <Label>ALIAS PARA TRANSFERENCIAS</Label>
        <AutoField
          initial={s.transferAlias}
          onSave={(v) => save({ transferAlias: v })}
          className={cn(field, "font-bold tracking-[.06em]")}
        />
        <div className="grid grid-cols-2 gap-[10px] [&>div]:flex [&>div]:flex-col [&>div]:justify-between">
          <div>
            <Label>SEÑA (%)</Label>
            <AutoField<number>
              initial={String(s.depositPct)}
              inputMode="decimal"
              transform={parsePct}
              onSave={(v) => save({ depositPct: v })}
              className={cn(field, "mt-[6px] w-full text-center text-[15px] font-bold")}
            />
          </div>
          <div>
            <Label>SEÑA DESDE ($)</Label>
            <AutoField<number>
              initial={formatNumber(s.depositMinTotal)}
              inputMode="numeric"
              transform={(v) => parseMoney(v) ?? 0}
              onSave={(v) => save({ depositMinTotal: v })}
              className={cn(field, "mt-[6px] w-full text-center text-[15px] font-bold")}
            />
          </div>
          <div>
            <Label>RESERVA SIN PAGO (HS)</Label>
            <AutoField<number>
              initial={String(s.reservationHours)}
              inputMode="numeric"
              transform={(v) => parseMoney(v) ?? 1}
              onSave={(v) => save({ reservationHours: Math.max(1, v) })}
              className={cn(field, "mt-[6px] w-full text-center text-[15px] font-bold")}
            />
          </div>
          <div>
            <Label>ENVÍO EN LA CIUDAD ($)</Label>
            <AutoField<number>
              initial={formatNumber(s.localShippingCost)}
              inputMode="numeric"
              transform={(v) => parseMoney(v) ?? 0}
              onSave={(v) => save({ localShippingCost: v })}
              className={cn(field, "mt-[6px] w-full text-center text-[15px] font-bold")}
            />
          </div>
        </div>
        <Hint>
          La seña se ofrece en pedidos desde ese total y se cobra online. Una reserva por
          transferencia o efectivo se cancela sola si no se acredita en ese plazo.
        </Hint>
      </Card>
    </CardGrid>
  );
}

/** Conexión del feed de Instagram (OAuth) dentro de "Redes y mapa". */
function InstagramFeed({ ig }: { ig: InstagramState }) {
  if (ig.connected) {
    return (
      <div className="flex flex-wrap items-center justify-between gap-[10px] rounded-xl bg-cream px-4 py-3">
        <div className="font-sans text-[12.5px] leading-[1.6]">
          <span className="font-bold text-brand-deep">● Feed conectado</span>
          {ig.username ? ` como @${ig.username}` : " (token del servidor)"}
          {ig.expiresAt && (
            <span className="text-ink/50">
              {" "}
              · se renueva solo · vence {formatDateTime(new Date(ig.expiresAt))}
            </span>
          )}
        </div>
        {ig.source === "oauth" && (
          <form action={INSTAGRAM_DISCONNECT_PATH} method="post">
            <button type="submit" className={btnDanger}>
              Desconectar
            </button>
          </form>
        )}
      </div>
    );
  }
  if (!ig.canConnect) {
    return (
      <Hint>
        El feed del inicio usa fotos de ejemplo. Para mostrar el real faltan
        IG_APP_ID, IG_APP_SECRET e IG_REDIRECT_URI en el servidor.
      </Hint>
    );
  }
  return (
    <div className="flex flex-wrap items-center justify-between gap-[10px] rounded-xl bg-cream px-4 py-3">
      <Hint>Conectá la cuenta para mostrar las últimas publicaciones en el inicio.</Hint>
      {/* <a> y no <Link>: es una redirección del servidor a Instagram. */}
      <a href={INSTAGRAM_CONNECT_PATH} className={btnDark}>
        Conectar Instagram
      </a>
    </div>
  );
}
