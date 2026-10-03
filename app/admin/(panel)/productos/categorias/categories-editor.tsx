"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition, type ReactNode } from "react";
import {
  Button,
  CellMono,
  COMPACT_INPUT,
  cx,
  DangerTextButton,
  FOCUS,
  FormError,
  Modal,
  Panel,
  PanelTitle,
  Table,
  TRANSITION,
  type TableColumn,
} from "@/components/bt";
import { useToast } from "@/components/admin/toast";
import { createCategory, deleteCategory, moveCategory, patchCategory } from "@/lib/server/actions/categories";
import { paths } from "@/lib/paths";

export interface CategoryRow {
  slug: string;
  label: string;
  pathSlug: string;
  parentSlug: string | null;
  order: number;
  count: number;
}

/** Grupos del menú de la tienda (raíces con ítem propio en el nav). */
const NAV_GROUPS = ["bicicletas", "accesorios", "repuestos", "importados"];

const byOrder = (a: CategoryRow, b: CategoryRow) => a.order - b.order || a.slug.localeCompare(b.slug);
const productsLabel = (n: number) => `${n} ${n === 1 ? "producto" : "productos"}`;

/** "+ Nueva categoría": nace como categoría suelta (sin grupo) al final. */
export function NewCategoryButton() {
  const router = useRouter();
  const toast = useToast();
  const [pending, start] = useTransition();
  return (
    <Button
      variant="primary"
      size="md"
      disabled={pending}
      onClick={() =>
        start(async () => {
          const r = await createCategory();
          if (!r.ok) return toast(r.error);
          toast("Categoría creada: ponele nombre");
          router.refresh();
        })
      }
    >
      {pending ? "Creando…" : "+ Nueva categoría"}
    </Button>
  );
}

/**
 * Editor de categorías con la jerarquía de `parentSlug`: un panel por grupo
 * del menú con sus tipos, y abajo las categorías sueltas. El orden de cada
 * lista es el de la web; ↑/↓ mueve dentro de su lista (la action
 * `moveCategory` intercambia con la vecina del orden global, así que se
 * repite hasta pasar a la hermana visible).
 */
export function CategoriesEditor({ categories }: { categories: CategoryRow[] }) {
  const router = useRouter();
  const toast = useToast();
  const [pending, start] = useTransition();
  const [ask, setAsk] = useState<CategoryRow | null>(null);
  const [error, setError] = useState<string | null>(null);

  const all = [...categories].sort(byOrder);
  const childrenOf = (slug: string) => all.filter((c) => c.parentSlug === slug);
  const groups = NAV_GROUPS.map((g) => all.find((c) => c.slug === g && !c.parentSlug)).filter(
    (c): c is CategoryRow => Boolean(c),
  );
  const known = new Set(all.map((c) => c.slug));
  // Raíces que no son grupos del menú, y tipos cuyo grupo no existe.
  const loose = all.filter(
    (c) =>
      (!c.parentSlug && !NAV_GROUPS.includes(c.slug) && childrenOf(c.slug).length === 0) ||
      (c.parentSlug && !known.has(c.parentSlug)),
  );
  const otherRoots = all.filter((c) => !c.parentSlug && !NAV_GROUPS.includes(c.slug) && childrenOf(c.slug).length > 0);

  function move(list: CategoryRow[], c: CategoryRow, dir: -1 | 1) {
    const i = list.indexOf(c);
    const sibling = list[i + dir];
    if (!sibling) return;
    const steps = Math.abs(all.indexOf(sibling) - all.indexOf(c));
    start(async () => {
      for (let k = 0; k < steps; k++) {
        const r = await moveCategory(c.slug, dir);
        if (!r.ok) {
          toast(r.error);
          break;
        }
      }
      router.refresh();
    });
  }

  function rename(c: CategoryRow, value: string) {
    const label = value.trim();
    if (!label || label === c.label) return;
    start(async () => {
      const r = await patchCategory(c.slug, { label });
      toast(r.ok ? `Guardado: ${label}` : r.error);
      router.refresh();
    });
  }

  function confirmDelete() {
    if (!ask) return;
    const c = ask;
    setError(null);
    start(async () => {
      const r = await deleteCategory(c.slug);
      if (!r.ok) return setError(r.error);
      setAsk(null);
      toast(`Categoría eliminada: ${c.label}`);
      router.refresh();
    });
  }

  /** Por qué no se puede borrar (vacío = se puede). */
  const blocked = (c: CategoryRow): string => {
    if (NAV_GROUPS.includes(c.slug) && !c.parentSlug) return "Es un grupo del menú de la tienda";
    if (childrenOf(c.slug).length > 0) return "Primero mové o eliminá sus tipos";
    if (c.count > 0) return `Tiene ${productsLabel(c.count)}: primero movelos a otra categoría`;
    return "";
  };

  const groupOptions = groups.map((g) => ({ value: g.slug, label: g.label }));

  const list = (rows: CategoryRow[], opts: { showGroup: boolean }) => {
    const columns: TableColumn<CategoryRow>[] = [
      {
        key: "order",
        header: "Orden",
        width: "112px",
        cell: (c) => <OrderControls index={rows.indexOf(c)} total={rows.length} disabled={pending} onMove={(d) => move(rows, c, d)} label={c.label} />,
      },
      {
        key: "name",
        header: "Nombre",
        width: "minmax(0,1fr)",
        cell: (c) => <NameInput key={`${c.slug}:${c.label}`} row={c} disabled={pending} onSave={(v) => rename(c, v)} />,
      },
      {
        key: "slug",
        header: "Slug",
        width: "minmax(0,220px)",
        cell: (c) => (
          <CellMono size={12} tone="muted">
            {paths.catalog(c.pathSlug)}
          </CellMono>
        ),
      },
      ...(opts.showGroup
        ? [
            {
              key: "group",
              header: "Grupo",
              width: "150px",
              cell: (c: CategoryRow) => <GroupSelect row={c} options={groupOptions} />,
            },
          ]
        : []),
      {
        key: "count",
        header: "Productos",
        width: "96px",
        align: "right",
        cell: (c) => <span className={cx("font-mono text-[13px] font-semibold", c.count ? "text-paper" : "text-text-3")}>{c.count}</span>,
      },
      {
        key: "delete",
        header: "",
        width: "104px",
        align: "right",
        cell: (c) => (
          <DangerTextButton disabled={pending || Boolean(blocked(c))} title={blocked(c) || undefined} onClick={() => setAsk(c)}>
            Eliminar
          </DangerTextButton>
        ),
      },
    ];
    return (
      <>
        <Table className="max-lg:hidden" columns={columns} rows={rows} getRowKey={(c) => c.slug} density="compact" gap={12} />
        <ul className="m-0 flex list-none flex-col overflow-hidden rounded-box border border-line p-0 lg:hidden">
          {rows.map((c, i) => (
            <li key={c.slug} className="flex flex-col gap-3 border-t border-line p-4 first:border-t-0">
              <NameInput key={`${c.slug}:${c.label}`} row={c} disabled={pending} onSave={(v) => rename(c, v)} />
              <div className="flex items-center justify-between gap-3">
                <span className="min-w-0">
                  <CellMono size={12} tone="muted">
                    {paths.catalog(c.pathSlug)}
                  </CellMono>
                </span>
                <span className="flex-none text-[13px] text-text-2">{productsLabel(c.count)}</span>
              </div>
              {opts.showGroup && <GroupSelect row={c} options={groupOptions} />}
              <div className="flex items-center justify-between gap-3">
                <OrderControls index={i} total={rows.length} disabled={pending} onMove={(d) => move(rows, c, d)} label={c.label} />
                <DangerTextButton disabled={pending || Boolean(blocked(c))} onClick={() => setAsk(c)}>
                  Eliminar
                </DangerTextButton>
              </div>
              {blocked(c) && <p className="m-0 text-[12px] text-text-3">{blocked(c)}</p>}
            </li>
          ))}
        </ul>
      </>
    );
  };

  return (
    <div className="flex flex-col gap-5 px-4 pt-5 pb-10 lg:gap-6 lg:px-10 lg:pt-6">
      <p className="m-0 max-w-[720px] text-[14px] leading-[1.5] text-text-2">
        Los grupos son los del menú de la tienda; los tipos de cada grupo arman los filtros del catálogo. El orden de cada
        lista es el de la web. Una categoría con productos no se puede eliminar.
      </p>

      <Panel surface="surface" padding="lg" gap="md">
        <PanelTitle>Grupos del menú</PanelTitle>
        {list(groups, { showGroup: false })}
      </Panel>

      {[...groups, ...otherRoots].map((g) => {
        const types = childrenOf(g.slug);
        const total = g.count + types.reduce((n, t) => n + t.count, 0);
        return (
          <Panel key={g.slug} surface="surface" padding="lg" gap="md" as="section">
            <PanelTitle action={<span className="font-mono text-[12px] font-semibold text-text-3 uppercase">{productsLabel(total)}</span>}>
              {g.label}
            </PanelTitle>
            {types.length ? (
              list(types, { showGroup: true })
            ) : (
              <p className="m-0 text-[14px] text-text-3">Este grupo todavía no tiene tipos.</p>
            )}
          </Panel>
        );
      })}

      {loose.length > 0 && (
        <Panel surface="surface" padding="lg" gap="md" as="section">
          <PanelTitle>Sin grupo</PanelTitle>
          <p className="m-0 text-[14px] leading-[1.5] text-text-2">
            Las categorías nuevas nacen acá. Todavía no se pueden pasar a un grupo desde el panel.
          </p>
          {list(loose, { showGroup: true })}
        </Panel>
      )}

      <Modal
        open={ask !== null}
        onClose={() => {
          setAsk(null);
          setError(null);
        }}
        title="Eliminar categoría"
        width={420}
        footer={
          <>
            <Button variant="secondary" size="md" onClick={() => setAsk(null)}>
              Cancelar
            </Button>
            <Button variant="danger" size="md" disabled={pending} onClick={confirmDelete}>
              {pending ? "Eliminando…" : "Sí, eliminar"}
            </Button>
          </>
        }
      >
        <p className="m-0 text-[15px] leading-[1.5] text-text-2">
          “{ask?.label}” sale de los filtros del catálogo y su URL ({ask ? paths.catalog(ask.pathSlug) : ""}) deja de existir.
        </p>
        <FormError>{error}</FormError>
      </Modal>
    </div>
  );
}

/** Nombre editable: guarda al salir del campo o con Enter (Esc descarta). */
function NameInput({ row, disabled, onSave }: { row: CategoryRow; disabled: boolean; onSave: (v: string) => void }) {
  const [value, setValue] = useState(row.label);
  return (
    <input
      aria-label={`Nombre de ${row.label}`}
      value={value}
      disabled={disabled}
      maxLength={60}
      onChange={(e) => setValue(e.target.value)}
      onBlur={() => (value.trim() ? onSave(value) : setValue(row.label))}
      onKeyDown={(e) => {
        if (e.key === "Enter") e.currentTarget.blur();
        if (e.key === "Escape") {
          setValue(row.label);
          e.currentTarget.blur();
        }
      }}
      className={cx(COMPACT_INPUT, "text-[14px] font-bold")}
    />
  );
}

/** Grupo de un tipo: se muestra, pero falta la action para cambiarlo (parentSlug). */
function GroupSelect({ row, options }: { row: CategoryRow; options: { value: string; label: string }[] }) {
  return (
    <select
      aria-label={`Grupo de ${row.label}`}
      value={row.parentSlug ?? ""}
      disabled
      title="Todavía no se puede cambiar el grupo desde el panel"
      className={cx(COMPACT_INPUT, "cursor-not-allowed appearance-none")}
    >
      <option value="">Sin grupo</option>
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

function OrderControls({
  index,
  total,
  disabled,
  onMove,
  label,
}: {
  index: number;
  total: number;
  disabled: boolean;
  onMove: (dir: -1 | 1) => void;
  label: ReactNode;
}) {
  const btn = cx(
    "flex size-9 items-center justify-center rounded-btn border border-line-strong text-[15px] font-bold text-text-2 hover:border-text-4 hover:text-paper disabled:cursor-default disabled:opacity-40 max-md:size-11",
    TRANSITION,
    FOCUS,
  );
  return (
    <span className="flex items-center gap-[6px]">
      <span className="w-6 font-mono text-[13px] font-semibold text-text-3">{index + 1}</span>
      <button type="button" className={btn} disabled={disabled || index === 0} onClick={() => onMove(-1)} aria-label={`Subir ${String(label)}`}>
        ↑
      </button>
      <button type="button" className={btn} disabled={disabled || index === total - 1} onClick={() => onMove(1)} aria-label={`Bajar ${String(label)}`}>
        ↓
      </button>
    </span>
  );
}
