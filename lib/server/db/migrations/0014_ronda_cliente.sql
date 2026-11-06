-- Ronda de cambios del cliente: precio por talle, método "Link de pago" y
-- turnos cada una hora (sin duración visible).
ALTER TABLE "appointment_services" ALTER COLUMN "duration_min" SET DEFAULT 60;--> statement-breakpoint
ALTER TABLE "settings" ALTER COLUMN "slot_minutes" SET DEFAULT 60;--> statement-breakpoint
ALTER TABLE "product_variants" ADD COLUMN "price" integer;--> statement-breakpoint
ALTER TABLE "settings" ADD COLUMN "payment_link_enabled" boolean DEFAULT true NOT NULL;--> statement-breakpoint
UPDATE "settings" SET "slot_minutes" = 60 WHERE "id" = 'main';--> statement-breakpoint
UPDATE "appointment_services" SET "duration_min" = 60;
