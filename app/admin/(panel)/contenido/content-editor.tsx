"use client";

import { useState, useTransition } from "react";
import { useDebouncedSave } from "@/components/admin/autosave";
import { useConfirm } from "@/components/admin/confirm";
import { useToast } from "@/components/admin/toast";
import {
  Badge,
  btnDanger,
  btnDark,
  btnGhost,
  Card,
  CardGrid,
  CardTitle,
  Hint,
  inputCls,
  Label,
  tabPill,
} from "@/components/admin/ui";
import { FileButton, uploadSitePhoto } from "@/components/admin/upload";
import { cx as cn } from "@/components/admin/cx";
import { lexicon } from "@/lib/data/content";
import { TEXT_GROUPS, TEXTS } from "@/lib/data/texts";
import { img } from "@/lib/images";
import { patchContent, resetTexts, setText } from "@/lib/server/actions/content";
import type { HeroContent, RepairsContent, SiteContent } from "@/lib/types";
import { productPhoto } from "../productos/product-utils";

interface HeroOption {
  id: string;
  label: string;
  images: string[];
}

const TABS: [key: string, label: string][] = [
  ["hero", "Hero, cinta y reparaciones"],
  ["home", "Secciones del home"],
  ["paginas", "Páginas y generales"],
];

/**
 * Contenido: el hero (con vista previa), la cinta, los números y la
 * sección Reparaciones; y los textos sueltos de la web armados desde
 * `TEXT_GROUPS`, con badge EDITADO y "Restaurar".
 */
export function ContentEditor({
  content,
  overrides,
  products,
}: {
  content: SiteContent;
  overrides: Record<string, string>;
  products: HeroOption[];
}) {
  const [tab, setTab] = useState("hero");
  return (
    <div className="animate-fade-in">
      <div className="mb-[18px] flex flex-wrap gap-2">
        {TABS.map(([k, label]) => (
          <button key={k} type="button" onClick={() => setTab(k)} className={tabPill(tab === k)}>
            {label}
          </button>
        ))}
      </div>
      {tab === "hero" ? (
        <HeroTab content={content} products={products} />
      ) : (
        <TextsTab tab={tab} overrides={overrides} />
      )}
    </div>
  );
}

/* ── Hero, cinta y reparaciones ───────────────────────────── */

type HeroFields = Pick<HeroContent, "badge" | "l1" | "l2" | "sub">;

function HeroTab({ content, products }: { content: SiteContent; products: HeroOption[] }) {
  const toast = useToast();
  const confirm = useConfirm();
  const [hero, setHero] = useState<HeroFields>({
    badge: content.badge,
    l1: content.l1,
    l2: content.l2,
    sub: content.sub,
  });
  const [heroProd, setHeroProd] = useState(content.heroProd);
  const [heroPhoto, setHeroPhoto] = useState(content.heroPhoto);
  const [marquee, setMarquee] = useState(content.marquee.join("\n"));
  const [stats, setStats] = useState(
    [0, 1, 2].map((i) => content.stats[i] ?? { num: "", label: "" }),
  );
  const [rep, setRep] = useState(content.rep);
  const [services, setServices] = useState(content.rep.services.join("\n"));

  const heroSave = useDebouncedSave<HeroFields>((v) => patchContent(v));
  const marqueeSave = useDebouncedSave<string[]>((v) => patchContent({ marquee: v }));
  const statsSave = useDebouncedSave<typeof stats>((v) =>
    patchContent({ stats: v.filter((s) => s.num.trim() || s.label.trim()) }),
  );
  const repSave = useDebouncedSave<RepairsContent>((v) => patchContent({ rep: v }));
  const [, startTransition] = useTransition();

  const setH = (patch: Partial<HeroFields>) => {
    const next = { ...hero, ...patch };
    setHero(next);
    heroSave.schedule(next);
  };
  const setR = (patch: Partial<RepairsContent>) => {
    const next = { ...rep, ...patch };
    setRep(next);
    repSave.schedule(next);
  };

  const hasHeroPhoto = !!heroPhoto && heroPhoto.prodId === heroProd;
  const prod = products.find((p) => p.id === heroProd) ?? products[0];
  const previewImg = hasHeroPhoto
    ? img(heroPhoto.url, { w: 700 })
    : prod
      ? productPhoto(prod.images, 700)
      : "";

  async function askRemovePhoto() {
    const ok = await confirm({
      icon: "↺",
      title: "Usar la foto del catálogo",
      message: "El hero deja de usar la foto HD subida y muestra la del catálogo del modelo.",
      label: "Sí, usar la del catálogo",
      destructive: true,
    });
    if (!ok) return;
    setHeroPhoto(null);
    const res = await patchContent({ heroPhoto: null });
    toast(res.ok ? "El hero usa la foto del catálogo" : res.error);
  }

  const field = inputCls();
  const flushHero = () => void heroSave.flush();

  return (
    <CardGrid>
      <Card>
        <CardTitle>Hero del home</CardTitle>
        <Label>BADGE SUPERIOR</Label>
        <input
          value={hero.badge}
          aria-label="Badge superior"
          onChange={(e) => setH({ badge: e.target.value })}
          onBlur={flushHero}
          className={field}
        />
        <Label>TÍTULO — LÍNEA 1 (RELLENA)</Label>
        <input
          value={hero.l1}
          aria-label="Título línea 1"
          onChange={(e) => setH({ l1: e.target.value })}
          onBlur={flushHero}
          className={cn(field, "font-display text-[17px]")}
        />
        <Label>TÍTULO — LÍNEA 2 (CONTORNO VERDE)</Label>
        <input
          value={hero.l2}
          aria-label="Título línea 2"
          onChange={(e) => setH({ l2: e.target.value })}
          onBlur={flushHero}
          className={cn(field, "font-display text-[17px]")}
        />
        <Label>BAJADA</Label>
        <textarea
          rows={3}
          value={hero.sub}
          aria-label="Bajada"
          onChange={(e) => setH({ sub: e.target.value })}
          onBlur={flushHero}
          className={cn(field, "resize-y text-[13px] leading-[1.6]")}
        />
        <Label>{lexicon.admin.heroProduct}</Label>
        <select
          value={heroProd}
          aria-label={lexicon.admin.heroProduct}
          onChange={(e) => {
            const id = e.target.value;
            setHeroProd(id);
            startTransition(async () => {
              const res = await patchContent({ heroProd: id });
              toast(res.ok ? lexicon.admin.heroProductUpdated : res.error);
            });
          }}
          className={cn(field, "font-semibold")}
        >
          {products.map((p) => (
            <option key={p.id} value={p.id}>
              {p.label}
            </option>
          ))}
        </select>

        <div
          className="mt-[6px] grid grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] items-center gap-3 overflow-hidden rounded-[14px] border border-ink/12 bg-white p-[18px]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(21,23,15,.045) 1px,transparent 1px),linear-gradient(90deg,rgba(21,23,15,.045) 1px,transparent 1px)",
            backgroundSize: "24px 24px",
          }}
        >
          <div>
            <div className="inline-block rounded-full border border-brand-deep/45 bg-white px-[9px] py-1 font-sans text-[8.5px] font-semibold tracking-[.22em] text-brand-deeper">
              {hero.badge}
            </div>
            <div className="mt-[10px] font-display text-[22px] leading-none text-ink">
              {hero.l1}
              <br />
              <span className="text-brand-deep">{hero.l2}</span>
            </div>
            <div className="mt-2 text-[10.5px] leading-[1.5] text-ink/60">{hero.sub}</div>
          </div>
          {previewImg && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={previewImg} alt="Vista previa del hero" className="block w-full mix-blend-multiply" />
          )}
        </div>
        <div className="flex flex-wrap items-center gap-[10px]">
          <FileButton
            label={hasHeroPhoto ? "Cambiar foto HD" : "Subir foto HD del hero"}
            className={cn(btnDark, "px-5 py-[11px] text-[12.5px]")}
            onFile={async (file) => {
              const res = await uploadSitePhoto(file, "hero");
              if (!res.ok) return toast(res.error);
              const next = { url: res.url, prodId: heroProd };
              setHeroPhoto(next);
              const saved = await patchContent({ heroPhoto: next });
              toast(saved.ok ? "Foto HD del hero actualizada" : saved.error);
            }}
          />
          {hasHeroPhoto && (
            <button type="button" onClick={askRemovePhoto} className={cn(btnDanger, "px-4 py-[10px] text-xs")}>
              Usar la del catálogo
            </button>
          )}
        </div>
        <Hint>{lexicon.admin.heroPhotoHint}</Hint>
      </Card>

      <div className="flex flex-col gap-[18px]">
        <Card>
          <CardTitle>Cinta verde (marquee)</CardTitle>
          <Label>UN MENSAJE POR LÍNEA</Label>
          <textarea
            rows={6}
            value={marquee}
            aria-label="Mensajes de la cinta"
            onChange={(e) => {
              setMarquee(e.target.value);
              marqueeSave.schedule(e.target.value.split("\n").map((s) => s.trim()).filter(Boolean));
            }}
            onBlur={() => void marqueeSave.flush()}
            className={cn(field, "resize-y text-[13px] leading-[1.7]")}
          />
        </Card>
        <Card>
          <CardTitle>Números del hero</CardTitle>
          {stats.map((s, i) => (
            <div key={i} className="flex gap-[10px]">
              <input
                value={s.num}
                placeholder="+40"
                aria-label={`Número ${i + 1}`}
                onChange={(e) => {
                  const next = stats.map((x, j) => (j === i ? { ...x, num: e.target.value } : x));
                  setStats(next);
                  statsSave.schedule(next);
                }}
                onBlur={() => void statsSave.flush()}
                className={cn(field, "w-[90px] px-3 py-[11px] text-center font-display text-[15px] font-extrabold")}
              />
              <input
                value={s.label}
                placeholder="MODELOS 2026"
                aria-label={`Etiqueta ${i + 1}`}
                onChange={(e) => {
                  const next = stats.map((x, j) => (j === i ? { ...x, label: e.target.value } : x));
                  setStats(next);
                  statsSave.schedule(next);
                }}
                onBlur={() => void statsSave.flush()}
                className={cn(field, "flex-1 px-3 py-[11px] text-[12.5px] tracking-[.08em]")}
              />
            </div>
          ))}
        </Card>
        <Card>
          <CardTitle>Sección Reparaciones</CardTitle>
          <Label>TÍTULO</Label>
          <input
            value={rep.title}
            aria-label="Título de reparaciones"
            onChange={(e) => setR({ title: e.target.value })}
            onBlur={() => void repSave.flush()}
            className={field}
          />
          <Label>TEXTO</Label>
          <textarea
            rows={3}
            value={rep.body}
            aria-label="Texto de reparaciones"
            onChange={(e) => setR({ body: e.target.value })}
            onBlur={() => void repSave.flush()}
            className={cn(field, "resize-y text-[13px] leading-[1.6]")}
          />
          <Label>SERVICIOS — UNO POR LÍNEA</Label>
          <textarea
            rows={6}
            value={services}
            aria-label="Servicios"
            onChange={(e) => {
              setServices(e.target.value);
              setR({ services: e.target.value.split("\n").map((s) => s.trim()).filter(Boolean) });
            }}
            onBlur={() => void repSave.flush()}
            className={cn(field, "resize-y text-[13px] leading-[1.7]")}
          />
        </Card>
      </div>
    </CardGrid>
  );
}

/* ── Textos (TEXT_GROUPS) ─────────────────────────────────── */

function TextsTab({ tab, overrides }: { tab: string; overrides: Record<string, string> }) {
  const toast = useToast();
  const confirm = useConfirm();
  const [, startTransition] = useTransition();
  const [revision, setRevision] = useState(0);

  async function askReset() {
    const ok = await confirm({
      icon: "↺",
      title: "Restaurar textos",
      message:
        "Todos los textos de secciones y páginas vuelven a los originales. Hero, cinta y reparaciones no se tocan.",
      label: "Sí, restaurar",
      destructive: true,
    });
    if (!ok) return;
    startTransition(async () => {
      await resetTexts();
      setRevision((r) => r + 1);
      toast("Textos restaurados");
    });
  }

  return (
    <>
      <CardGrid key={`${tab}-${revision}`}>
        {TEXT_GROUPS.filter((g) => g.tab === tab).map((g) => (
          <Card key={g.title}>
            <CardTitle>{g.title}</CardTitle>
            {g.fields.map(([key, label, kind]) => (
              <TextField
                key={key}
                textKey={key}
                label={label}
                kind={kind}
                initial={revision ? TEXTS[key] : (overrides[key] ?? TEXTS[key] ?? "")}
              />
            ))}
          </Card>
        ))}
      </CardGrid>
      <div className="mt-[18px] flex flex-wrap items-center justify-between gap-3">
        <div className="font-sans text-[12.5px] text-ink/50">
          En los títulos, un salto de línea (Enter) corta la línea en la web.
        </div>
        <button type="button" onClick={askReset} className={btnGhost}>
          ↺ Restaurar textos originales
        </button>
      </div>
    </>
  );
}

function TextField({
  textKey,
  label,
  kind,
  initial,
}: {
  textKey: string;
  label: string;
  kind: 1 | 2 | 3;
  initial: string;
}) {
  const [value, setValue] = useState(initial);
  const { schedule, flush } = useDebouncedSave<string>((v) => setText(textKey, v));
  const edited = value !== (TEXTS[textKey] ?? "");
  const field = inputCls();

  return (
    <div className="flex flex-col gap-[6px]">
      <div className="flex items-center justify-between gap-2">
        <Label>{label.toUpperCase()}</Label>
        {edited && <Badge>EDITADO</Badge>}
      </div>
      {kind === 1 ? (
        <input
          value={value}
          aria-label={label}
          onChange={(e) => {
            setValue(e.target.value);
            schedule(e.target.value);
          }}
          onBlur={() => void flush()}
          className={field}
        />
      ) : (
        <textarea
          rows={kind === 3 ? 6 : 3}
          value={value}
          aria-label={label}
          onChange={(e) => {
            setValue(e.target.value);
            schedule(e.target.value);
          }}
          onBlur={() => void flush()}
          className={cn(field, "resize-y text-[13px] leading-[1.6]")}
        />
      )}
    </div>
  );
}
