ALTER TABLE "settings" ADD COLUMN "tienda_nube_url" text;--> statement-breakpoint
ALTER TABLE "settings" ADD COLUMN "link_tienda" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "settings" ADD COLUMN "address" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "settings" ADD COLUMN "hours" text DEFAULT '' NOT NULL;