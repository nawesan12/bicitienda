-- (editado a mano) Fase 2: PIN del admin y pasarela agnóstica (Payway/MP).
-- El acceso al admin pasa a ser un PIN en env: la tabla de usuarios sobra.
DROP TABLE "admin_users" CASCADE;--> statement-breakpoint
-- Renombres (no drop+add) para no perder la idempotencia de pagos viejos.
ALTER TABLE "payments" RENAME COLUMN "mp_payment_id" TO "provider_payment_id";--> statement-breakpoint
ALTER TABLE "payments" RENAME CONSTRAINT "payments_mp_payment_id_unique" TO "payments_provider_payment_id_unique";--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN "provider" text;--> statement-breakpoint
-- Los pagos online previos a esta migración son todos de Mercado Pago.
UPDATE "payments" SET "provider" = 'mp' WHERE "provider_payment_id" IS NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" RENAME COLUMN "mp_preference_id" TO "provider_checkout_id";--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "installments" integer DEFAULT 1 NOT NULL;
