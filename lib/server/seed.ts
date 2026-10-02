import { eq, notInArray } from "drizzle-orm";
import { store } from "@/lib/config";
import { brands, categories, products } from "@/lib/data/catalog";
import { agendaEvents, articles, content } from "@/lib/data/content";
import { resolveImage } from "@/lib/images";
import type { Db } from "@/lib/server/db";
import * as schema from "@/lib/server/db/schema";
import { applyStockMovement, getStockMatrix } from "@/lib/server/stock";

/**
 * Carga los valores originales de la capa por-tienda (lib/config.ts,
 * lib/data/*) en la base. La usan el script `pnpm db:seed` y el botón
 * "Restablecer" del admin. Idempotente: upserts sobre los ids del seed.
 *
 * Con `reset: true` además borra lo que el admin haya creado por fuera del
 * seed (productos, categorías, notas y rodadas nuevas, textos editados y
 * consultas) — es el "volver a los valores originales". El acceso al
 * admin es un PIN en env (ADMIN_PIN_HASH): el seed no crea usuarios.
 */

/**
 * Sucursales: upsertea las de la capa por-tienda y reconcilia el
 * placeholder 'local' que puede haber dejado la migración 0004 en bases
 * que ya existían (si la config usa otros ids, su stock y movimientos se
 * mudan a la principal de la config y el placeholder desaparece).
 */
async function seedLocations(db: Db) {
  const configIds = store.locations.map((l) => l.id);
  const principal = store.locations[0];

  const [placeholder] = configIds.includes("local")
    ? []
    : await db
        .select()
        .from(schema.locations)
        .where(eq(schema.locations.id, "local"));

  for (const [i, l] of store.locations.entries()) {
    const row = {
      id: l.id,
      name: l.name,
      shortName: l.shortName,
      address: l.address,
      hours: l.hours,
      mapsUrl: l.mapsUrl,
      order: l.order ?? i,
      active: l.active ?? true,
    };
    await db
      .insert(schema.locations)
      .values(row)
      .onConflictDoUpdate({ target: schema.locations.id, set: row });
  }

  // La tienda tiene UNA sola sucursal (la de la config): cualquier otra que
  // haya quedado de pruebas se desactiva (no se borra: tiene historial).
  await db
    .update(schema.locations)
    .set({ active: false })
    .where(notInArray(schema.locations.id, configIds));

  if (placeholder) {
    await db
      .update(schema.productStock)
      .set({ locationId: principal.id })
      .where(eq(schema.productStock.locationId, "local"));
    await db
      .update(schema.stockMovements)
      .set({ locationId: principal.id })
      .where(eq(schema.stockMovements.locationId, "local"));
    await db.delete(schema.locations).where(eq(schema.locations.id, "local"));
  }
}

/**
 * Stock inicial: el del catálogo seed va entero a la sucursal principal.
 * En una corrida normal solo completa productos SIN filas de stock (no
 * pisa inventario vivo); con `reset` vuelve todo al valor del seed.
 */
async function seedStock(db: Db, opts: { reset: boolean }) {
  const principal = store.locations[0].id;
  const matrix = await getStockMatrix(db);

  for (const p of products) {
    const existing = matrix.get(p.slug);
    if (!opts.reset && existing && existing.size > 0) continue;

    if (opts.reset && existing) {
      // Todas las sucursales a cero primero (queda asentado en el libro).
      for (const [locationId, qty] of existing) {
        if (qty !== 0)
          await applyStockMovement(db, {
            productSlug: p.slug,
            locationId,
            delta: -qty,
            reason: "seed",
          });
      }
    }
    if (p.stock > 0)
      await applyStockMovement(db, {
        productSlug: p.slug,
        locationId: principal,
        delta: p.stock,
        reason: "seed",
      });
  }
}

export async function runSeed(
  db: Db,
  opts: {
    reset?: boolean;
    /**
     * Con `reset`: no tocar los datos operativos (pedidos, pagos, clientes,
     * consultas, suscriptos, avisos ni inventario). Es el "Restablecer
     * todo" del admin; sin esto el reset es total (`pnpm db:seed`).
     */
    keepOperational?: boolean;
  } = {},
) {
  for (const c of categories) {
    const row = {
      slug: c.slug,
      label: c.label,
      single: c.single,
      sub: c.sub,
      home: c.home,
      imgProductId: c.imgProductId,
      pathSlug: c.pathSlug,
      order: c.order,
    };
    await db
      .insert(schema.categories)
      .values(row)
      .onConflictDoUpdate({ target: schema.categories.slug, set: row });
  }

  for (const b of brands) {
    await db
      .insert(schema.brands)
      .values(b)
      .onConflictDoUpdate({ target: schema.brands.id, set: { name: b.name } });
  }

  for (const p of products) {
    const row = {
      id: p.id,
      slug: p.slug,
      name: p.name,
      brandId: p.brandId,
      category: p.category,
      price: p.price,
      priceApprox: p.priceApprox,
      oldPrice: p.oldPrice,
      tag: p.tag,
      chips: p.chips,
      specs: p.specs,
      // Con `pnpm seed:images` corrido, las fotos del seed ya están en
      // Cloudinary: la base guarda esa URL (sin manifest, el path local).
      images: p.images.map(resolveImage),
      hidden: p.hidden,
      featured: p.featured,
      stockOverride: p.stockOverride,
      custom: p.custom,
      description: p.description,
      createdAt: p.createdAt,
    };
    await db
      .insert(schema.products)
      .values(row)
      .onConflictDoUpdate({ target: schema.products.id, set: row });
  }

  for (const a of articles) {
    const row = {
      id: a.id,
      slug: a.slug,
      tag: a.tag,
      date: a.date,
      readMinutes: a.readMinutes,
      title: a.title,
      excerpt: a.excerpt,
      paras: a.paras,
      ctaTitle: a.ctaTitle,
      ctaLabel: a.ctaLabel,
      ctaKind: a.ctaKind,
      ctaMsg: a.ctaMsg,
      published: a.published,
      order: a.order,
    };
    await db
      .insert(schema.articles)
      .values(row)
      .onConflictDoUpdate({ target: schema.articles.id, set: row });
  }

  for (const ev of agendaEvents) {
    const row = {
      id: ev.id,
      date: ev.date,
      day: ev.day,
      month: ev.month,
      title: ev.title,
      meta: ev.meta,
      published: ev.published,
    };
    await db
      .insert(schema.agendaEvents)
      .values(row)
      .onConflictDoUpdate({ target: schema.agendaEvents.id, set: row });
  }

  await seedLocations(db);

  if (opts.reset && opts.keepOperational) {
    // Contenido y catálogo al seed; lo creado desde el admin desaparece
    // junto con su inventario (no tiene seed al que volver).
    const productIds = products.map((p) => p.id);
    const stray = await db
      .select({ slug: schema.products.slug })
      .from(schema.products)
      .where(notInArray(schema.products.id, productIds));
    for (const p of stray) {
      await db.delete(schema.productStock).where(eq(schema.productStock.productSlug, p.slug));
      await db.delete(schema.stockAlerts).where(eq(schema.stockAlerts.productSlug, p.slug));
    }
    await db.delete(schema.texts);
    await db.delete(schema.products).where(notInArray(schema.products.id, productIds));
    await db
      .delete(schema.categories)
      .where(notInArray(schema.categories.slug, categories.map((c) => c.slug)));
    await db
      .delete(schema.articles)
      .where(notInArray(schema.articles.id, articles.map((a) => a.id)));
    await db
      .delete(schema.agendaEvents)
      .where(notInArray(schema.agendaEvents.id, agendaEvents.map((ev) => ev.id)));
  } else if (opts.reset) {
    // Lo creado desde el admin por fuera del seed vuelve a no existir,
    // y los pedidos de prueba también (con sus pagos y clientes). El
    // inventario y su libro arrancan de cero: seedStock los reconstruye.
    const productIds = products.map((p) => p.id);
    const categorySlugs = categories.map((c) => c.slug);
    const articleIds = articles.map((a) => a.id);
    const eventIds = agendaEvents.map((ev) => ev.id);
    await db.delete(schema.payments);
    await db.delete(schema.orderItems);
    await db.delete(schema.orders);
    await db.delete(schema.customers);
    await db.delete(schema.stockAlerts);
    await db.delete(schema.newsletterSubscribers);
    await db.delete(schema.leads);
    await db.delete(schema.texts);
    await db.delete(schema.stockMovements);
    await db.delete(schema.productStock);
    await db
      .delete(schema.products)
      .where(notInArray(schema.products.id, productIds));
    await db
      .delete(schema.categories)
      .where(notInArray(schema.categories.slug, categorySlugs));
    await db
      .delete(schema.articles)
      .where(notInArray(schema.articles.id, articleIds));
    await db
      .delete(schema.agendaEvents)
      .where(notInArray(schema.agendaEvents.id, eventIds));
  }

  await seedStock(db, { reset: !!opts.reset && !opts.keepOperational });

  // Numeración de pedidos: arranca en 1041 (el contador guarda el último).
  await db
    .insert(schema.counters)
    .values({ id: "order_number", value: 1040 })
    .onConflictDoNothing({ target: schema.counters.id });

  const settingsRow = {
    id: "main",
    whatsapp: store.whatsapp,
    whatsappGroupUrl: store.whatsappGroupUrl,
    instagram: store.instagram,
    tiktok: store.tiktok,
    address: store.address,
    hours: store.hours,
    mapsUrl: store.mapsUrl,
    transferAlias: store.transferAlias,
    transferDiscount: store.transferDiscount,
    r3: store.r3,
    r6: store.r6,
    depositRate: store.depositRate,
    depositMinTotal: store.depositMinTotal,
    reservationHours: store.reservationHours,
    localShippingCost: store.localShippingCost,
    showPrices: store.showPrices,
    ventaOnline: store.ventaOnline,
    content: {
      ...content,
      heroPhoto: content.heroPhoto
        ? { ...content.heroPhoto, url: resolveImage(content.heroPhoto.url) }
        : content.heroPhoto,
    },
  };
  await db
    .insert(schema.settings)
    .values(settingsRow)
    .onConflictDoUpdate({ target: schema.settings.id, set: settingsRow });

  return {
    products: products.length,
    articles: articles.length,
    events: agendaEvents.length,
  };
}
