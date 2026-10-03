ALTER TABLE "appointments" ADD COLUMN "customer_name" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "customer_name" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "paid_installments" integer;--> statement-breakpoint
ALTER TABLE "quote_requests" ADD COLUMN "customer_name" text;--> statement-breakpoint
-- Copy neutro de "Pedido listo" (accesorios, varios productos). Solo si
-- nadie editó la plantilla: si el texto es el original del seed.
UPDATE "whatsapp_templates" SET "body" = '¡{nombre}, tu pedido #{número} ya está listo para retirar! Pasá a buscarlo con tu DNI.', "updated_at" = now() WHERE "id" = 'pedido_listo' AND "body" = '¡{nombre}, tu {producto} ya está armada y lista! Pasá a buscarla con tu DNI y el pedido {número}.';
