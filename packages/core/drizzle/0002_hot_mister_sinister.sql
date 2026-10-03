CREATE TABLE "kg"."attribute" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"node_id" uuid NOT NULL,
	"type" text NOT NULL,
	"value" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "kg"."attribute_type" (
	"code" text PRIMARY KEY NOT NULL
);
--> statement-breakpoint
ALTER TABLE "kg"."node" ADD COLUMN "body" text;--> statement-breakpoint
ALTER TABLE "kg"."relation" ADD COLUMN "variant" text;--> statement-breakpoint
ALTER TABLE "kg"."relation" ADD COLUMN "label" text;--> statement-breakpoint
ALTER TABLE "kg"."relation" ADD COLUMN "note" text;--> statement-breakpoint
ALTER TABLE "kg"."relation" ADD COLUMN "disputed" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "kg"."relation" ADD COLUMN "created_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "kg"."relation_type" ADD COLUMN "is_primary" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "kg"."relation_type" ADD COLUMN "is_acyclic" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "kg"."attribute" ADD CONSTRAINT "attribute_node_id_node_id_fk" FOREIGN KEY ("node_id") REFERENCES "kg"."node"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kg"."attribute" ADD CONSTRAINT "attribute_type_attribute_type_code_fk" FOREIGN KEY ("type") REFERENCES "kg"."attribute_type"("code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "attribute_node_idx" ON "kg"."attribute" USING btree ("node_id","sort_order");--> statement-breakpoint
ALTER TABLE "kg"."relation" ADD CONSTRAINT "relation_not_self_check" CHECK ("kg"."relation"."from_id" <> "kg"."relation"."to_id");