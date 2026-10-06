-- relation_unique_key already exists in databases created from 0003; pg_trgm powers the name search index.
CREATE EXTENSION IF NOT EXISTS pg_trgm;--> statement-breakpoint
CREATE UNIQUE INDEX "citation_unique_key" ON "kg"."citation" USING btree ("subject_table","subject_id","source_id",coalesce("locator", ''));--> statement-breakpoint
CREATE INDEX "external_id_node_idx" ON "kg"."external_id" USING btree ("node_id");--> statement-breakpoint
CREATE INDEX "name_node_idx" ON "kg"."name" USING btree ("node_id");--> statement-breakpoint
CREATE INDEX "name_normalized_trgm_idx" ON "kg"."name" USING gin ("name_normalized" gin_trgm_ops);--> statement-breakpoint
CREATE INDEX "node_kind_live_idx" ON "kg"."node" USING btree ("kind") WHERE "kg"."node"."deleted_at" is null;--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "relation_unique_key" ON "kg"."relation" USING btree ("type","from_id","to_id",coalesce("variant", ''));--> statement-breakpoint
ALTER TABLE "kg"."citation" ADD CONSTRAINT "citation_confidence_check" CHECK ("kg"."citation"."confidence" between 1 and 5);--> statement-breakpoint
ALTER TABLE "kg"."source" ADD CONSTRAINT "source_reliability_check" CHECK ("kg"."source"."reliability" between 1 and 5);