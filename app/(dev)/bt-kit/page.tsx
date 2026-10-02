import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import {
  Accordion,
  AccordionGroup,
  AdminMobileHeader,
  AdminShell,
  AdminSidebar,
  AdminTopBar,
  AppointmentPill,
  BrandLockup,
  Breadcrumb,
  Button,
  CellMono,
  CellStack,
  CellThumb,
  Checkbox,
  Chip,
  ChipScroller,
  ColorSelector,
  Display,
  Divider,
  EmptyState,
  Eyebrow,
  Field,
  FilterChip,
  Footer,
  Header,
  Highlight,
  Input,
  Kpi,
  KpiGrid,
  Logo,
  MobileHeader,
  Mono,
  OptionCard,
  OptionChip,
  OrderPill,
  Pagination,
  Panel,
  PanelTitle,
  Pill,
  Price,
  PriceBox,
  ProductCard,
  ProductPill,
  QtyStepper,
  QuotePill,
  RadioCard,
  RelatedProductCard,
  RemovableChip,
  SearchInput,
  SegmentedControl,
  Select,
  SizeSelector,
  SpecList,
  StepList,
  Table,
  Tag,
  TextLink,
  Textarea,
  Tile,
  TileGrid,
  Timeline,
  Toggle,
  UploadDropzone,
  Wordmark,
  formatMoney,
  ORDER_PILL,
  ORDER_STEPS_DONE,
  QUOTE_PILL,
  APPOINTMENT_PILL,
  type OrderPillStatus,
  type QuotePillStatus,
  type AppointmentPillStatus,
} from "@/components/bt";
import { ACC, ADMIN_HREFS, BIKES, CATS, COLORS, HREFS, ORDERS, QUOTES, SIZES, SPECS, px, type DemoOrder, type DemoQuote } from "./data";

/**
 * Página de revisión visual del sistema de diseño (B2a). Solo existe en
 * desarrollo: en producción responde 404 y no se indexa. No se linkea
 * desde ningún lado.
 */
export const metadata: Metadata = {
  title: "Kit BiciTienda",
  robots: { index: false, follow: false },
};

function Section({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section id={id} className="flex flex-col gap-6 border-t border-line px-4 py-12 md:px-gutter">
      <Display size="h2" as="h2">
        {title}
      </Display>
      {children}
    </section>
  );
}

function Sub({ title, children, className }: { title: string; children: ReactNode; className?: string }) {
  return (
    <div className={`flex flex-col gap-3 ${className ?? ""}`}>
      <Eyebrow tone="yellow">{title}</Eyebrow>
      {children}
    </div>
  );
}

/** Marco de 390 px para ver las variantes mobile en desktop. */
function Phone({ children }: { children: ReactNode }) {
  return (
    <div className="w-[390px] max-w-full overflow-hidden rounded-box border border-line-strong bg-ink">{children}</div>
  );
}

export default function BtKitPage() {
  if (process.env.NODE_ENV === "production") notFound();

  const featured = [BIKES[0], BIKES[5], BIKES[8], ACC[0]];

  return (
    <div className="min-h-screen bg-ink font-sans text-paper">
      <div className="flex flex-col gap-2 px-4 py-10 md:px-gutter">
        <Mono size={12}>B2A · SISTEMA DE DISEÑO · SOLO DESARROLLO</Mono>
        <Display size="page">
          Kit <Highlight>BiciTienda.</Highlight>
        </Display>
        <p className="m-0 max-w-[680px] text-[18px] leading-[1.5] text-text-2">
          Todos los componentes de <code className="font-mono text-[15px]">components/bt</code> con datos de ejemplo
          del handoff. Comparalos con el canvas del prototipo.
        </p>
        <nav className="mt-4 flex flex-wrap gap-2">
          {["marca", "tipografia", "botones", "estados", "chips", "seleccion", "formularios", "datos", "navegacion", "cards", "chrome", "admin"].map(
            (s) => (
              <FilterChip key={s} href={`#${s}`}>
                {s}
              </FilterChip>
            ),
          )}
        </nav>
      </div>

      {/* ── Marca ─────────────────────────────────────────── */}
      <Section id="marca" title="Marca">
        <div className="flex flex-wrap items-end gap-10">
          <Sub title="Wordmark header 30">
            <Wordmark size="header" />
          </Sub>
          <Sub title="footer 26">
            <Wordmark size="footer" />
          </Sub>
          <Sub title="sidebar 22">
            <Wordmark size="sidebar" />
          </Sub>
          <Sub title="mobile 19 @68">
            <Wordmark size="mobile" />
          </Sub>
        </div>
        <div className="flex flex-wrap items-end gap-6">
          {([56, 52, 44, 40, 36] as const).map((s) => (
            <Sub key={s} title={`Logo ${s}`}>
              <Logo size={s} />
            </Sub>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-10">
          <BrandLockup href="#marca" logoSize={52} wordmarkSize="header" />
          <BrandLockup href="#marca" logoSize={36} wordmarkSize="mobile" gap="gap-2" />
        </div>
      </Section>

      {/* ── Tipografía ────────────────────────────────────── */}
      <Section id="tipografia" title="Tipografía">
        <Display size="hero">
          Salí a rodar por <Highlight>La Feliz.</Highlight>
        </Display>
        <Display size="page" as="p">
          ¿Qué estás buscando?
        </Display>
        <Display size="section" as="p">
          Lo más pedido en el mostrador
        </Display>
        <Display size="h2" as="p">
          Especificaciones
        </Display>
        <div className="flex flex-wrap items-baseline gap-10">
          <Display size="admin" as="p">
            Pedidos
          </Display>
          <Display size="detail" as="p">
            Juan Pérez
          </Display>
          <Display size="card" as="p">
            Cómo sigue
          </Display>
          <Display size="panel" as="p">
            Variantes y stock
          </Display>
        </div>
        <div className="flex flex-wrap items-center gap-8">
          <Eyebrow tone="yellow" size="lg">
            Presupuesto sin cargo
          </Eyebrow>
          <Eyebrow>1 · Qué necesitás</Eyebrow>
          <Eyebrow size="md">Talle</Eyebrow>
          <Mono size={13}>PEDIDO #BT-10482 · 1 DE OCTUBRE 2026</Mono>
          <Mono size={11} uppercase>
            48 modelos
          </Mono>
        </div>
        <div className="flex flex-wrap items-end gap-8">
          <Price amount={489900} size="product" />
          <Price amount={544800} size="total" tone="yellow" />
          <Price amount={887000} size="panel" tone="yellow" />
          <Price amount={489900} size="card" />
          <Price amount={24900} size="card-sm" />
          <Price amount={1249900} size="inline" />
        </div>
        <div className="max-w-[480px]">
          <PriceBox price={489900} />
        </div>
      </Section>

      {/* ── Botones ───────────────────────────────────────── */}
      <Section id="botones" title="Botones">
        <Sub title="Variantes · lg">
          <div className="flex flex-wrap items-center gap-3">
            <Button href="#botones">Ver bicicletas</Button>
            <Button variant="secondary">Seguir comprando</Button>
            <Button variant="outline-paper">Reservar una prueba</Button>
            <Button variant="danger">Cancelar pedido</Button>
            <Button disabled>Deshabilitado</Button>
          </div>
        </Sub>
        <Sub title="Tamaños">
          <div className="flex flex-wrap items-center gap-3">
            <Button size="header">Carrito · 2</Button>
            <Button size="md">+ Turno manual</Button>
            <Button size="md" variant="secondary">
              Exportar
            </Button>
            <Button size="sm" variant="secondary">
              WhatsApp
            </Button>
            <Button size="sm" variant="danger">
              Rechazar
            </Button>
          </div>
          <div className="grid max-w-[480px] gap-[10px]">
            <Button size="full">Enviar presupuesto por WhatsApp</Button>
            <Button size="full" variant="secondary">
              Avisar por WhatsApp
            </Button>
            <Button size="full-lg">Pagar con Mercado Pago</Button>
            <Button size="full-lg" variant="outline-paper">
              Reservar una prueba de esta bici
            </Button>
          </div>
        </Sub>
        <Sub title="Sobre panel amarillo">
          <Panel surface="yellow" padding="md" className="max-w-[400px]">
            <Eyebrow tone="inherit">Tu turno</Eyebrow>
            <Display size="card" as="p">
              Prueba de bici
            </Display>
            <Button variant="ink" size="full-lg">
              Confirmar turno
            </Button>
            <div className="grid grid-cols-2 gap-2">
              <Button variant="ink" size="md">
                Reprogramar
              </Button>
              <Button variant="ink-outline" size="md">
                Cancelar
              </Button>
            </div>
          </Panel>
        </Sub>
        <Sub title="Links de texto">
          <div className="flex flex-wrap gap-8">
            <TextLink href="#botones">Ver catálogo →</TextLink>
            <TextLink href="#botones" underline>
              ¿No sabés tu talle? Te asesoramos
            </TextLink>
            <TextLink href="#botones" tone="muted">
              ← Seguir comprando
            </TextLink>
          </div>
        </Sub>
      </Section>

      {/* ── Estados ───────────────────────────────────────── */}
      <Section id="estados" title="Pills y tags">
        <Sub title="Pedidos (incluye Cancelado, nueva)">
          <div className="flex flex-wrap gap-2">
            {(Object.keys(ORDER_PILL) as OrderPillStatus[]).map((s) => (
              <OrderPill key={s} status={s} />
            ))}
          </div>
        </Sub>
        <Sub title="Presupuestos">
          <div className="flex flex-wrap gap-2">
            {(Object.keys(QUOTE_PILL) as QuotePillStatus[]).map((s) => (
              <QuotePill key={s} status={s} />
            ))}
          </div>
        </Sub>
        <Sub title="Productos · Turnos · Mercado Pago">
          <div className="flex flex-wrap gap-2">
            <ProductPill status="publicado" />
            <ProductPill status="sin_stock" />
            <ProductPill status="borrador" />
            {(Object.keys(APPOINTMENT_PILL) as AppointmentPillStatus[]).map((s) => (
              <AppointmentPill key={s} status={s} size="lg" />
            ))}
            <Pill tone="yellow" size="lg">
              Conectado
            </Pill>
          </div>
        </Sub>
        <Sub title="Tamaños sm / md / lg">
          <div className="flex flex-wrap items-center gap-2">
            <OrderPill status="armando" size="sm" />
            <OrderPill status="armando" size="md" />
            <OrderPill status="armando" size="lg" />
          </div>
        </Sub>
        <Sub title="Tags">
          <div className="flex flex-wrap items-start gap-3">
            <Tag size="hero">Temporada de rodar</Tag>
            <Tag flush size="lg">
              Más vendida
            </Tag>
            <Tag flush>Oferta</Tag>
            <Tag flush>Nuevo</Tag>
            <Tag flush size="xs">
              Oferta
            </Tag>
          </div>
        </Sub>
      </Section>

      {/* ── Chips ─────────────────────────────────────────── */}
      <Section id="chips" title="Chips y filtros">
        <Sub title="Categorías (mobile, scroll)">
          <Phone>
            <ChipScroller className="px-4 py-2">
              {CATS.map((c, i) => (
                <Chip key={c} href="#chips" active={i === 0}>
                  {c}
                </Chip>
              ))}
            </ChipScroller>
          </Phone>
        </Sub>
        <Sub title="Filtros del admin">
          <div className="flex flex-wrap gap-2">
            <FilterChip active count={7}>
              Todos
            </FilterChip>
            <FilterChip count={1}>Transf. pendiente</FilterChip>
            <FilterChip count={2}>Para armar</FilterChip>
            <FilterChip count={2}>Listos</FilterChip>
            <FilterChip size="sm">Retirados</FilterChip>
          </div>
        </Sub>
        <Sub title="Filtros activos">
          <div className="flex flex-wrap items-center gap-[10px]">
            <RemovableChip href="#chips">MTB</RemovableChip>
            <RemovableChip href="#chips">Rodado 29</RemovableChip>
            <RemovableChip href="#chips" tone="paper">
              Talle M
            </RemovableChip>
          </div>
        </Sub>
        <div className="grid max-w-[280px] gap-7">
          <Sub title="Tipo">
            <Checkbox label="MTB" count={18} name="tipo" value="mtb" defaultChecked />
            <Checkbox label="Ruta / Gravel" count={9} name="tipo" value="ruta" />
            <Checkbox label="Urbana" count={14} name="tipo" value="urbana" />
            <Checkbox label="Infantil" count={7} name="tipo" value="infantil" />
          </Sub>
          <Sub title="Rodado">
            <div className="flex flex-wrap gap-2">
              {["12", "16", "20", "24", "26", "27.5", "28", "29"].map((r) => (
                <OptionChip key={r} label={r} name="rodado" value={r} defaultChecked={r === "29"} />
              ))}
            </div>
          </Sub>
          <Sub title="Talle">
            <div className="flex gap-2">
              {["S", "M", "L", "XL"].map((t) => (
                <OptionChip key={t} wide type="radio" label={t} name="talle-filtro" value={t} defaultChecked={t === "M"} />
              ))}
            </div>
          </Sub>
          <Panel padding="none" gap="sm" className="p-[18px]">
            <Toggle label="Se puede probar en el local" defaultChecked />
            <span className="text-[14px] leading-[1.45] text-text-2">
              Mostramos solo las bicis disponibles para reservar una prueba.
            </span>
          </Panel>
        </div>
      </Section>

      {/* ── Selección ─────────────────────────────────────── */}
      <Section id="seleccion" title="Selección">
        <Sub title="OptionCard fill · tipo de presupuesto (5a)">
          <div className="grid grid-cols-2 gap-[10px] md:grid-cols-4">
            {[
              ["bici", "Bicicleta", "Te recomendamos modelo y talle."],
              ["rep", "Repuesto", "Para tu bici, nuevo u original."],
              ["imp", "Producto importado", "Lo traemos aunque no esté en la tienda."],
              ["otro", "Otra consulta", "Contanos y lo vemos."],
            ].map(([v, t, d]) => (
              <OptionCard key={v} name="kind" value={v} title={t} description={d} selectedStyle="fill" defaultChecked={v === "imp"} />
            ))}
          </div>
        </Sub>
        <Sub title="OptionCard fill · servicio del turno (2f)">
          <div className="grid gap-3 md:grid-cols-2">
            <OptionCard
              name="svc"
              value="prueba"
              title="Prueba de bici"
              meta="30 MIN"
              description="Elegís el modelo y salís a dar una vuelta con ella."
              selectedStyle="fill"
              titleStyle="display-lg"
              surface="surface"
              padding="lg"
              radius={10}
              defaultChecked
            />
            <OptionCard
              name="svc"
              value="asesor"
              title="Asesoramiento"
              meta="30 MIN"
              description="Te ayudamos con talle, rodado, uso y presupuesto."
              selectedStyle="fill"
              titleStyle="display-lg"
              surface="surface"
              padding="lg"
              radius={10}
            />
          </div>
        </Sub>
        <Sub title="OptionCard tint">
          <div className="grid max-w-[480px] gap-3">
            <OptionCard name="tint" value="a" title="Retiro en el local · sin cargo" titleStyle="text" description="[Dirección a confirmar]" defaultChecked />
            <OptionCard name="tint" value="b" title="Otra opción" titleStyle="text" description="Sin seleccionar" />
          </div>
        </Sub>
        <Sub title="RadioCard · Cómo pagás (2d)">
          <Panel padding="lg" className="max-w-[480px]" gap="md">
            <Eyebrow size="md">1 · Cómo pagás</Eyebrow>
            <RadioCard name="pay" value="mp" defaultChecked title="Mercado Pago" description="Tarjeta de crédito, débito o dinero en cuenta. Hasta 6 cuotas sin interés." />
            <RadioCard name="pay" value="transf" title="Transferencia · 10% off" description="Te pasamos el CBU al confirmar. Reservamos el stock 24 hs." />
            <RadioCard name="pay" value="cash" title="Efectivo en el local" description="Reservás online y pagás cuando la retirás." />
          </Panel>
        </Sub>
        <div className="grid gap-10 md:grid-cols-2">
          <Sub title="Toggles (3d)">
            <Panel gap="md">
              <PanelTitle>Visibilidad</PanelTitle>
              <Toggle label="Publicado en la tienda" defaultChecked />
              <Toggle label="Destacado en el home" defaultChecked />
              <Toggle label="Disponible para prueba" defaultChecked />
              <Toggle label="Ocultar si no hay stock" />
              <Toggle label="Prueba de bici" description="30 min · se paga en el local" defaultChecked />
              <div className="flex items-center gap-3">
                <Toggle aria-label="Prueba disponible" defaultChecked />
                <Toggle aria-label="Prueba no disponible" />
                <Toggle aria-label="Deshabilitado" disabled />
              </div>
            </Panel>
          </Sub>
          <Sub title="QtyStepper">
            <div className="grid grid-cols-[140px_1fr] gap-[10px]">
              <QtyStepper size="lg" />
              <Button size="full-lg">Agregar al carrito</Button>
            </div>
            <div className="w-[150px]">
              <QtyStepper size="md" defaultValue={2} />
            </div>
            <div className="w-fit">
              <QtyStepper size="sm" />
            </div>
            <div className="w-[120px]">
              <QtyStepper size="admin" min={0} defaultValue={0} highlightZero label="Stock talle XL" />
            </div>
          </Sub>
        </div>
        <div className="grid gap-10 md:grid-cols-2">
          <Sub title="Talle + color (desktop)">
            <SizeSelector
              name="talle"
              options={SIZES}
              defaultValue="M"
              help={{ href: "#seleccion", label: "¿No sabés tu talle? Te asesoramos" }}
            />
            <ColorSelector name="color" options={COLORS} defaultValue="negro-amarillo" selectedLabel="Negro / amarillo" />
            <ColorSelector name="color-unico" options={[COLORS[0]]} />
            <Mono>↑ con un solo color no se muestra nada</Mono>
          </Sub>
          <Sub title="Talle (mobile)">
            <Phone>
              <div className="p-4">
                <SizeSelector name="talle-m" options={SIZES} defaultValue="M" help={{ href: "#seleccion", label: "¿Cuál es mi talle?" }} />
              </div>
            </Phone>
          </Sub>
        </div>
      </Section>

      {/* ── Formularios ───────────────────────────────────── */}
      <Section id="formularios" title="Formularios">
        <Panel padding="xl" gap="2xl" className="max-w-[900px]">
          <div className="flex flex-col gap-3">
            <Eyebrow>2 · Contanos el detalle</Eyebrow>
            <Textarea placeholder="Ej: rodillo smart compatible con Zwift, para eje pasante 12 mm. Si lo viste en otra web, pegá el link." />
            <div className="grid gap-3 md:grid-cols-2">
              <Field label="Para qué bici" optional>
                <Input placeholder="Marca, modelo o rodado" />
              </Field>
              <Field label="Presupuesto aproximado" optional>
                <Input placeholder="Ej: hasta $ 300.000" />
              </Field>
            </div>
            <UploadDropzone name="foto" accept="image/*" />
          </div>
          <div className="flex flex-col gap-3">
            <Eyebrow>3 · Tus datos</Eyebrow>
            <div className="grid gap-3 md:grid-cols-3">
              <Field label="Nombre">
                <Input placeholder="Nombre y apellido" />
              </Field>
              <Field label="WhatsApp" error="Poné el número con característica: 223…">
                <Input placeholder="223 …" invalid defaultValue="555" />
              </Field>
              <Field label="Email" optional hint="Te mandamos el comprobante.">
                <Input type="email" placeholder="tu@email.com" />
              </Field>
            </div>
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            <Field label="Categoría">
              <Select defaultValue="mtb">
                <option value="mtb">MTB</option>
                <option value="ruta">Ruta / Gravel</option>
                <option value="rep">Repuestos</option>
                <option value="imp">Importados</option>
              </Select>
            </Field>
            <Field label="Demora">
              <Input size="sm" defaultValue="30 a 45 días" />
            </Field>
            <Field label="Con transferencia (auto)">
              <Input size="sm" readOnly value="$ 440.910 · −10%" className="border-dashed bg-transparent! font-extrabold text-red-light" />
            </Field>
          </div>
        </Panel>
        <div className="grid max-w-[900px] gap-10 md:grid-cols-2">
          <Sub title="Sobre la página (login, turno)">
            <Field label="Email" size="md">
              <Input surface="page" size="lg" placeholder="vos@email.com" />
            </Field>
            <Field label="Contraseña" size="md">
              <Input surface="page" size="lg" type="password" placeholder="••••••••" />
            </Field>
          </Sub>
          <Sub title="Buscadores">
            <SearchInput action="#formularios" placeholder="Buscar bici, accesorio, repuesto…" className="w-[360px] max-w-full" />
            <SearchInput action="#formularios" placeholder="Buscar pedido, cliente o DNI" className="w-[280px]" />
            <SearchInput action="#formularios" placeholder="Buscar bici, casco, repuesto…" size="lg" />
          </Sub>
        </div>
        <Sub title="Fotos del producto (3d)">
          <div className="grid max-w-[600px] grid-cols-5 gap-[10px]">
            {[31581017, 7635132, 5807803, 5807792].map((id, i) => (
              <div key={id} className={`relative aspect-square overflow-hidden rounded-box border-2 ${i === 0 ? "border-yellow" : "border-transparent"}`}>
                {/* eslint-disable-next-line @next/next/no-img-element -- demo */}
                <img src={px(id, 300)} alt="" className="absolute inset-0 h-full w-full object-cover" />
                {i === 0 && (
                  <span className="absolute top-[6px] left-[6px] rounded-[3px] bg-yellow px-[6px] py-[3px] text-[10px] font-extrabold uppercase tracking-[.06em] text-ink">
                    Portada
                  </span>
                )}
              </div>
            ))}
            <UploadDropzone variant="tile" name="fotos" accept="image/*" multiple label="Subir fotos" />
          </div>
        </Sub>
      </Section>

      {/* ── Datos ─────────────────────────────────────────── */}
      <Section id="datos" title="Tablas, KPIs y timeline">
        <KpiGrid flush className="border-t">
          <Kpi label="Pedidos hoy" value="7" />
          <Kpi label="Para retirar" value="3" tone="yellow" />
          <Kpi label="Turnos hoy" value="6" />
          <Kpi label="Transf. a validar" value="1" tone="red" />
        </KpiGrid>
        <div className="flex flex-wrap gap-10">
          <Phone>
            <div className="p-4">
              <KpiGrid columns={2}>
                <Kpi size="md" label="Pedidos hoy" value="7" />
                <Kpi size="md" label="Para retirar" value="3" tone="yellow" />
                <Kpi size="md" label="Turnos hoy" value="6" />
                <Kpi size="md" label="Transf. a validar" value="1" tone="red" />
              </KpiGrid>
            </div>
          </Phone>
          <div className="w-[312px]">
            <KpiGrid columns={3}>
              <Kpi size="sm" label="Pedidos" value="3" />
              <Kpi size="sm" label="Turnos" value="3" />
              <Kpi size="sm" label="Gastado" value={formatMoney(569700)} tone="yellow" className="[&>span:last-child]:text-[24px] [&>span:last-child]:leading-[1.1]" />
            </KpiGrid>
          </div>
        </div>

        <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
          <Table<DemoOrder>
            caption="Pedidos"
            rows={ORDERS}
            getRowKey={(o) => o.id}
            selectedKey="#BT-10481"
            rowHref={(o) => `?sel=${encodeURIComponent(o.id)}#datos`}
            rowLabel={(o) => `Pedido ${o.id} de ${o.client}`}
            columns={[
              { key: "id", header: "Pedido", width: "96px", cell: (o) => <CellMono>{o.id}</CellMono> },
              { key: "cli", header: "Cliente y productos", width: "minmax(0,1fr)", cell: (o) => <CellStack primary={o.client} secondary={o.items} /> },
              { key: "st", header: "Estado", width: "168px", cell: (o) => <OrderPill status={o.status} /> },
              { key: "tot", header: "Total", width: "104px", align: "right", cell: (o) => <span className="text-[15px] font-extrabold">{formatMoney(o.total)}</span> },
            ]}
          />
          <Panel gap="lg" className="gap-5">
            <div className="flex items-center justify-between">
              <Mono size={13}>#BT-10481 · 1 oct · 12:05</Mono>
              <OrderPill status="transf_pendiente" />
            </div>
            <div className="flex items-end justify-between">
              <div className="flex flex-col gap-1">
                <Display size="detail" as="p">
                  Lucía Gómez
                </Display>
                <span className="text-[14px] text-text-2">WhatsApp 223 555-0144</span>
              </div>
              <TextLink href="#datos" className="text-[13px] tracking-[.06em]">
                Escribir →
              </TextLink>
            </div>
            <div className="flex items-center justify-between rounded-box border-[1.5px] border-dashed border-red p-[14px]">
              <div className="flex flex-col gap-[2px]">
                <span className="text-[14px] font-extrabold">Comprobante adjunto</span>
                <Mono size={12} className="font-normal">
                  comprobante_10481.pdf
                </Mono>
              </div>
              <TextLink href="#datos" className="text-[13px] tracking-[.06em]">
                Ver
              </TextLink>
            </div>
            <Timeline done={ORDER_STEPS_DONE.transf_pendiente} />
            <Button size="full" className="text-[15px]">
              Validar transferencia
            </Button>
            <div className="flex gap-[10px]">
              <Button variant="secondary" size="sm" className="flex-1">
                Avisar por WhatsApp
              </Button>
              <Button variant="danger" size="sm" className="flex-1">
                Cancelar pedido
              </Button>
            </div>
          </Panel>
        </div>

        <div className="flex flex-wrap gap-10">
          <Sub title="Timeline · listo / retirado / cancelado">
            <div className="flex gap-10">
              <Timeline done={ORDER_STEPS_DONE.listo} />
              <Timeline done={ORDER_STEPS_DONE.retirado} />
              <Timeline done={1} cancelled />
            </div>
          </Sub>
          <Sub title="StepList · confirmación (2e)" className="w-[560px] max-w-full">
            <StepList
              done={1}
              steps={[
                { title: "Pago aprobado", description: "Mercado Pago · hoy 14:32" },
                { title: "Armado y ajuste", description: "Lo hacemos en el taller del local" },
                { title: "Lista para retirar", description: "Te avisamos por WhatsApp" },
                { title: "Retirás en el local", description: "Con DNI y número de pedido" },
              ]}
            />
          </Sub>
        </div>

        <Table<DemoQuote>
          caption="Presupuestos"
          rows={QUOTES}
          getRowKey={(q) => q.id}
          selectedKey="#P-0213"
          gap={20}
          rowHref={(q) => `?q=${encodeURIComponent(q.id)}#datos`}
          columns={[
            {
              key: "n",
              header: "Número",
              width: "110px",
              cell: (q) => (
                <div className="flex flex-col gap-[3px]">
                  <CellMono size={12}>{q.id}</CellMono>
                  <span className="whitespace-nowrap text-[12px] text-text-3">{q.date}</span>
                </div>
              ),
            },
            { key: "t", header: "Qué pide / cliente", width: "minmax(0,1fr)", cell: (q) => <CellStack primary={q.title} secondary={q.name} secondarySize={12} /> },
            { key: "k", header: "Tipo", width: "150px", cell: (q) => <span className="text-text-2">{q.kind}</span> },
            { key: "s", header: "Estado", width: "130px", cell: (q) => <QuotePill status={q.status} /> },
          ]}
        />

        <Sub title="Tabla compacta · variantes (3d)">
          <Table
            density="compact"
            rows={SIZES.map((s, i) => ({ ...s, stock: [1, 3, 2, 0][i] }))}
            getRowKey={(v) => v.value}
            columns={[
              { key: "t", header: "Talle", width: "100px", cell: (v) => <span className="text-[20px] font-black stretch-75">{v.label}</span> },
              { key: "h", header: "Altura sugerida", width: "1fr", cell: (v) => <span className="text-text-2">{v.height?.replace("–", " – ")} m</span> },
              { key: "sku", header: "SKU", width: "1fr", cell: (v) => <CellMono size={12} tone="muted">{`BT-MTB29-21-${v.value}`}</CellMono> },
              { key: "st", header: "Stock", width: "120px", cell: (v) => <QtyStepper size="admin" min={0} defaultValue={v.stock} highlightZero label={`Stock talle ${v.label}`} /> },
            ]}
          />
        </Sub>

        <Sub title="Productos (3c)">
          <Table
            rows={BIKES.slice(0, 4)}
            getRowKey={(p) => p.name}
            columns={[
              { key: "img", header: "", width: "64px", cell: (p) => <CellThumb src={px(p.img, 200)} /> },
              { key: "p", header: "Producto", width: "minmax(0,1fr)", cell: (p) => <CellStack primary={p.name} secondary={<CellMono size={12} tone="muted">BT-MTB-1040</CellMono>} /> },
              { key: "c", header: "Categoría", width: "110px", cell: (p) => <span className="text-text-2">{p.category}</span> },
              { key: "pr", header: "Precio", width: "110px", cell: (p) => <span className="font-extrabold">{formatMoney(p.price)}</span> },
              { key: "s", header: "Stock por talle", width: "190px", cell: () => <CellMono size={12} tone="soft">S 1 · M 3 · L 2 · XL 0</CellMono> },
              { key: "t", header: "Prueba", width: "64px", cell: (p) => <Toggle aria-label={`Prueba ${p.name}`} defaultChecked={p.category === "MTB"} /> },
              { key: "e", header: "Estado", width: "112px", cell: () => <ProductPill status="publicado" /> },
            ]}
          />
        </Sub>
      </Section>

      {/* ── Navegación ────────────────────────────────────── */}
      <Section id="navegacion" title="Navegación y contenido">
        <Breadcrumb
          items={[
            { label: "Inicio", href: "#navegacion" },
            { label: "Bicicletas", href: "#navegacion" },
            { label: "MTB", href: "#navegacion" },
            { label: "MTB rodado 29 · 21 vel." },
          ]}
        />
        <Pagination page={1} totalPages={3} hrefFor={(p) => `?page=${p}#navegacion`} />
        <Pagination page={6} totalPages={12} hrefFor={(p) => `?page=${p}#navegacion`} />
        <div className="flex flex-wrap items-start gap-10">
          <div className="w-[440px] max-w-full">
            <SegmentedControl ariaLabel="Ingresar o crear cuenta" items={[{ label: "Ingresar", active: true, href: "#navegacion" }, { label: "Crear cuenta", href: "#navegacion" }]} />
          </div>
          <SegmentedControl tone="paper" items={[{ label: "Semana", active: true, href: "#navegacion" }, { label: "Día", href: "#navegacion" }]} />
          <Phone>
            <div className="p-4">
              <SegmentedControl items={[{ label: "Turnos", active: true, href: "#navegacion" }, { label: "Pedidos", href: "#navegacion" }, { label: "Datos", href: "#navegacion" }]} />
            </div>
          </Phone>
        </div>
        <div className="grid gap-10 md:grid-cols-2">
          <Phone>
            <div className="p-4">
              <AccordionGroup>
                <Accordion title="Especificaciones" defaultOpen>
                  <SpecList variant="mobile" items={SPECS} />
                </Accordion>
                <Accordion title="Para quién es">
                  <p className="m-0 pt-2 text-[15px] leading-[1.6] text-text-2">
                    Una MTB rodado 29 para arrancar en serio: firme en la Ruta 11 o en los caminos de tierra de Sierra de los Padres.
                  </p>
                </Accordion>
              </AccordionGroup>
            </div>
          </Phone>
          <div className="flex flex-col gap-4">
            <Display size="h2" as="p">
              Especificaciones
            </Display>
            <SpecList items={SPECS} />
          </div>
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          <EmptyState
            eyebrow="Catálogo"
            title="No encontramos bicis con esos filtros"
            description="Probá sacando algún filtro o pedinos un presupuesto: si no está en la tienda, lo traemos."
            action={
              <>
                <Button size="md" href="#navegacion">
                  Limpiar filtros
                </Button>
                <Button size="md" variant="secondary" href="#navegacion">
                  Pedir presupuesto
                </Button>
              </>
            }
          />
          <Panel>
            <PanelTitle>Historial</PanelTitle>
            <EmptyState size="sm" title="Sin movimientos" description="Todavía no hay pedidos ni turnos de este cliente." />
          </Panel>
        </div>
        <TileGrid columns={7}>
          {CATS.map((c, i) => (
            <Tile key={c} className="gap-[6px] px-[18px] py-[22px]">
              <Mono size={12}>{String(i + 1).padStart(2, "0")}</Mono>
              <span className="text-[20px] font-extrabold uppercase stretch-80">{c}</span>
            </Tile>
          ))}
        </TileGrid>
        <TileGrid columns={2} className="max-w-[560px]">
          <Tile>
            <span className="text-[15px] font-extrabold">Retiro en el local</span>
            <span className="text-[14px] text-text-2">Armada y ajustada a tu altura</span>
          </Tile>
          <Tile>
            <span className="text-[15px] font-extrabold">Stock en el local</span>
            <span className="text-[14px] text-text-2">Quedan 3 en talle M</span>
          </Tile>
        </TileGrid>
        <Divider variant="dashed" />
      </Section>

      {/* ── Cards ─────────────────────────────────────────── */}
      <Section id="cards" title="Product cards">
        <Sub title="Desktop · 4 columnas (2a)">
          <div className="grid grid-cols-4 gap-4">
            {featured.map((p) => (
              <ProductCard key={p.name} layout="desktop" href="#cards" name={p.name} category={p.category} brand="Marca" image={{ src: px(p.img) }} price={p.price} tag={p.tag ? { label: p.tag } : undefined} />
            ))}
          </div>
        </Sub>
        <Sub title="Catálogo · 3 columnas responsive (2b → 4b)">
          <div className="grid grid-cols-2 gap-[10px] md:grid-cols-3 md:gap-4">
            {BIKES.slice(0, 6).map((p) => (
              <ProductCard key={p.name} href="#cards" name={p.name} category={p.category} brand="Marca" image={{ src: px(p.img) }} price={p.price} tag={p.tag ? { label: p.tag } : undefined} />
            ))}
          </div>
        </Sub>
        <div className="flex flex-wrap gap-10">
          <Sub title="Mobile · 2 columnas (4a)">
            <Phone>
              <div className="grid grid-cols-2 gap-[10px] p-4">
                {featured.map((p) => (
                  <ProductCard key={p.name} layout="mobile" href="#cards" name={p.name} category={p.category} brand="Marca" image={{ src: px(p.img, 400) }} price={p.price} tag={p.tag ? { label: p.tag } : undefined} />
                ))}
              </div>
            </Phone>
          </Sub>
          <Sub title="Preview del admin (3d)" className="w-[360px]">
            <ProductCard layout="desktop" hideAdd href="#cards" name={BIKES[0].name} category="MTB" brand="Marca" image={{ src: px(BIKES[0].img, 600) }} price={BIKES[0].price} tag={{ label: "Más vendida" }} />
          </Sub>
        </div>
        <Sub title="Relacionados (2c)">
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {ACC.map((p) => (
              <RelatedProductCard key={p.name} href="#cards" name={p.name} image={{ src: px(p.img, 600) }} price={p.price} />
            ))}
          </div>
        </Sub>
      </Section>

      {/* ── Chrome de la tienda ───────────────────────────── */}
      <Section id="chrome" title="Header, menú y footer">
        <Sub title="Header desktop · active=bicicletas">
          <div className="overflow-x-auto rounded-box border border-line-strong">
            <div className="min-w-[1200px]">
              <Header hrefs={HREFS} active="bicicletas" cart={2} />
            </div>
          </div>
        </Sub>
        <Sub title="Header desktop · cuenta logueada, active=turnos">
          <div className="overflow-x-auto rounded-box border border-line-strong">
            <div className="min-w-[1200px]">
              <Header hrefs={HREFS} active="turnos" cart={0} account="Juan" />
            </div>
          </div>
        </Sub>
        <div className="flex flex-wrap items-start gap-10">
          <Sub title="MobileHeader · cerrado + búsqueda">
            <Phone>
              <MobileHeader hrefs={HREFS} cart={2} />
            </Phone>
          </Sub>
          <Sub title="MobileHeader · abierto (5c)">
            <Phone>
              <MobileHeader
                hrefs={HREFS}
                cart={2}
                defaultOpen
                menuMode="inline"
                lockScroll={false}
                menuInfo="WhatsApp [a confirmar] · [Horarios a confirmar]"
              />
            </Phone>
          </Sub>
        </div>
        <Sub title="Footer (desktop ≥ lg / mobile debajo)">
          <div className="overflow-hidden rounded-box border border-line-strong">
            <Footer homeHref="#chrome" address="[Dirección a confirmar]" hours="[Horarios a confirmar]" whatsapp="[Número a confirmar]" />
          </div>
        </Sub>
      </Section>

      {/* ── Admin ─────────────────────────────────────────── */}
      <Section id="admin" title="Admin">
        <div className="overflow-x-auto rounded-box border border-line-strong">
          <AdminShell
            className="min-h-[640px] min-w-[1200px]"
            sidebar={
              <AdminSidebar
                active="pedidos"
                hrefs={ADMIN_HREFS}
                counts={{ pedidos: 7, turnos: 14, presupuestos: 2, productos: 124 }}
                storeHref="/"
              />
            }
          >
            <AdminTopBar
              title="Pedidos"
              search={{ action: "#admin", placeholder: "Buscar pedido, cliente o DNI" }}
              actions={
                <Button variant="secondary" size="md">
                  Exportar
                </Button>
              }
            />
            <div className="flex items-center gap-2 px-gutter-admin pt-[18px]">
              <FilterChip active count={7}>
                Todos
              </FilterChip>
              <FilterChip count={1}>Transf. pendiente</FilterChip>
              <FilterChip count={2}>Para armar</FilterChip>
            </div>
            <AdminTopBar
              className="mt-8 border-t"
              title="MTB rodado 29 · 21 vel."
              back={{ href: "#admin", label: "Productos" }}
              actions={
                <>
                  <Button variant="secondary" size="md">
                    Ver en la tienda
                  </Button>
                  <Button size="md">Guardar cambios</Button>
                </>
              }
            />
            <AdminTopBar title="Turnos" actions={<Button size="md">+ Turno manual</Button>}>
              <span className="ml-4 text-[16px] font-extrabold uppercase tracking-[.04em]">‹ 5 – 10 oct 2026 ›</span>
            </AdminTopBar>
          </AdminShell>
        </div>
        <Sub title="Admin mobile (4h)">
          <Phone>
            <AdminMobileHeader homeHref="#admin" menuHref="#admin" />
            <div className="flex flex-col gap-4 p-4">
              <Display size="admin" as="p">
                Hoy · jue 1 oct
              </Display>
              <Button variant="secondary" size="full" href="#admin">
                Ver pedidos para retirar · 3
              </Button>
            </div>
          </Phone>
        </Sub>
      </Section>
      <Divider />
      <p className="m-0 px-4 py-8 text-center text-[13px] text-text-3 md:px-gutter">
        Solo desarrollo · no se indexa · <Mono size={12}>app/(dev)/bt-kit</Mono>
      </p>
    </div>
  );
}
