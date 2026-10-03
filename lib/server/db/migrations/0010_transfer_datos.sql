ALTER TABLE "settings" ADD COLUMN "transfer_cbu" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "settings" ADD COLUMN "transfer_holder" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "settings" ADD COLUMN "transfer_bank" text DEFAULT '' NOT NULL;--> statement-breakpoint
-- La fila de settings existente queda con los placeholders del prototipo
-- hasta que el local pase sus datos (Ajustes → Pagos).
UPDATE "settings" SET "transfer_cbu" = '[CBU a confirmar]', "transfer_holder" = '[Titular a confirmar]', "transfer_bank" = '[Banco a confirmar]';
