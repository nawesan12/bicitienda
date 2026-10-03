-- Taller al frente: sale la prueba de bici, entra "Reparación / service".
-- Idempotente y sin borrar nada: la fila "prueba" queda inactiva porque los
-- turnos viejos la referencian por FK. Las columnas products.test_ride y
-- appointment_services.allows_product quedan en el schema sin uso.
UPDATE "appointment_services" SET "active" = false WHERE "id" = 'prueba';--> statement-breakpoint
INSERT INTO "appointment_services" ("id", "name", "description", "duration_min", "price_note", "allows_product", "active", "order")
VALUES ('reparacion', 'Reparación / service', 'Traés la bici, la revisamos y te pasamos el presupuesto por WhatsApp.', 15, 'Presupuesto por WhatsApp', false, true, 0)
ON CONFLICT ("id") DO NOTHING;--> statement-breakpoint
UPDATE "appointment_services" SET "order" = 1 WHERE "id" = 'asesoramiento' AND "order" < 1;--> statement-breakpoint
UPDATE "appointment_services" SET "order" = 2 WHERE "id" = 'prueba' AND "order" < 2;--> statement-breakpoint
UPDATE "appointment_services" SET "allows_product" = false WHERE "allows_product" = true;--> statement-breakpoint
UPDATE "products" SET "test_ride" = false WHERE "test_ride" = true;--> statement-breakpoint
-- Contenido del taller: solo si sigue el texto original del seed (no pisa
-- lo que el local haya editado).
UPDATE "settings"
SET "content" = jsonb_set("content", '{rep}', '{"title":"Tu bici, en manos del taller","body":"Traela al local, la revisamos y te pasamos el presupuesto por WhatsApp antes de tocar nada.","services":["Service completo","Ajuste de cambios y frenos","Parche y cámara","Centrado de rueda","Cambio de cadena y piñón","Armado y puesta a punto"]}'::jsonb, true), "updated_at" = now()
WHERE "id" = 'main' AND ("content"->'rep' IS NULL OR "content"->'rep'->>'title' = 'Service y garantía');
