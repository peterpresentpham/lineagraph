CREATE TABLE "history"."event" (
	"id" uuid PRIMARY KEY NOT NULL,
	"event_type" text NOT NULL,
	"start_id" uuid,
	"end_id" uuid,
	"place_id" uuid,
	"parent_event_id" uuid,
	"summary" text,
	"outcome" text
);
--> statement-breakpoint
CREATE TABLE "history"."event_participant" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_id" uuid NOT NULL,
	"node_id" uuid NOT NULL,
	"role" text NOT NULL,
	"side" smallint,
	"note" text,
	"sort_order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "history"."event_type" (
	"code" text PRIMARY KEY NOT NULL
);
--> statement-breakpoint
CREATE TABLE "history"."participant_role" (
	"code" text PRIMARY KEY NOT NULL
);
--> statement-breakpoint
ALTER TABLE "history"."place" ADD COLUMN "place_type" text;--> statement-breakpoint
ALTER TABLE "history"."tenure" ADD COLUMN "confidence" smallint;--> statement-breakpoint
ALTER TABLE "history"."tenure" ADD COLUMN "note" text;--> statement-breakpoint
ALTER TABLE "history"."tenure" ADD COLUMN "state" text DEFAULT 'accepted' NOT NULL;--> statement-breakpoint
ALTER TABLE "kg"."citation" ADD COLUMN "stance" text DEFAULT 'supports' NOT NULL;--> statement-breakpoint
ALTER TABLE "kg"."relation" ADD COLUMN "dispute_note" text;--> statement-breakpoint
ALTER TABLE "kg"."relation" ADD COLUMN "confidence" smallint;--> statement-breakpoint
ALTER TABLE "history"."event" ADD CONSTRAINT "event_id_node_id_fk" FOREIGN KEY ("id") REFERENCES "kg"."node"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "history"."event" ADD CONSTRAINT "event_event_type_event_type_code_fk" FOREIGN KEY ("event_type") REFERENCES "history"."event_type"("code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "history"."event" ADD CONSTRAINT "event_start_id_fuzzy_date_id_fk" FOREIGN KEY ("start_id") REFERENCES "kg"."fuzzy_date"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "history"."event" ADD CONSTRAINT "event_end_id_fuzzy_date_id_fk" FOREIGN KEY ("end_id") REFERENCES "kg"."fuzzy_date"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "history"."event" ADD CONSTRAINT "event_place_id_place_id_fk" FOREIGN KEY ("place_id") REFERENCES "history"."place"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "history"."event" ADD CONSTRAINT "event_parent_event_id_event_id_fk" FOREIGN KEY ("parent_event_id") REFERENCES "history"."event"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "history"."event_participant" ADD CONSTRAINT "event_participant_event_id_event_id_fk" FOREIGN KEY ("event_id") REFERENCES "history"."event"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "history"."event_participant" ADD CONSTRAINT "event_participant_node_id_node_id_fk" FOREIGN KEY ("node_id") REFERENCES "kg"."node"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "history"."event_participant" ADD CONSTRAINT "event_participant_role_participant_role_code_fk" FOREIGN KEY ("role") REFERENCES "history"."participant_role"("code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "event_type_idx" ON "history"."event" USING btree ("event_type");--> statement-breakpoint
CREATE INDEX "event_parent_idx" ON "history"."event" USING btree ("parent_event_id");--> statement-breakpoint
CREATE INDEX "event_place_idx" ON "history"."event" USING btree ("place_id");--> statement-breakpoint
CREATE UNIQUE INDEX "event_participant_key" ON "history"."event_participant" USING btree ("event_id","node_id","role");--> statement-breakpoint
CREATE INDEX "event_participant_node_idx" ON "history"."event_participant" USING btree ("node_id");--> statement-breakpoint
ALTER TABLE "history"."tenure" ADD CONSTRAINT "tenure_confidence_check" CHECK ("history"."tenure"."confidence" between 1 and 5);--> statement-breakpoint
ALTER TABLE "history"."tenure" ADD CONSTRAINT "tenure_state_check" CHECK ("history"."tenure"."state" in ('accepted', 'alternative'));--> statement-breakpoint
ALTER TABLE "kg"."citation" ADD CONSTRAINT "citation_stance_check" CHECK ("kg"."citation"."stance" in ('supports', 'disputes', 'mentions'));--> statement-breakpoint
ALTER TABLE "kg"."relation" ADD CONSTRAINT "relation_confidence_check" CHECK ("kg"."relation"."confidence" between 1 and 5);