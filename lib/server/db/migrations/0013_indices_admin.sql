-- Índices del panel admin: tablero de pedidos (estado, fecha), ítems y pagos
-- por pedido, CRM por cliente, líneas de presupuesto, libro de stock por
-- producto y por pedido, y consultas por estado. Solo CREATE INDEX.
CREATE INDEX "leads_status_idx" ON "leads" USING btree ("status");--> statement-breakpoint
CREATE INDEX "order_items_order_idx" ON "order_items" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "orders_status_idx" ON "orders" USING btree ("status");--> statement-breakpoint
CREATE INDEX "orders_created_idx" ON "orders" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "orders_customer_idx" ON "orders" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "payments_order_idx" ON "payments" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "quote_lines_quote_idx" ON "quote_lines" USING btree ("quote_id");--> statement-breakpoint
CREATE INDEX "quote_requests_customer_idx" ON "quote_requests" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "stock_movements_product_idx" ON "stock_movements" USING btree ("product_slug","created_at");--> statement-breakpoint
CREATE INDEX "stock_movements_order_idx" ON "stock_movements" USING btree ("order_id");