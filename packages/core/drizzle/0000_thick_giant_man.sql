CREATE SCHEMA "history";
--> statement-breakpoint
CREATE SCHEMA "kg";
--> statement-breakpoint
CREATE SCHEMA "learning";
--> statement-breakpoint
CREATE TABLE "history"."office_type" (
	"code" text PRIMARY KEY NOT NULL,
	"category" text DEFAULT 'other' NOT NULL,
	"is_sovereign" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "history"."parentage" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"parent_id" uuid NOT NULL,
	"child_id" uuid NOT NULL,
	"kind" text NOT NULL,
	"union_id" uuid,
	"state" text DEFAULT 'proposed' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "history"."person" (
	"id" uuid PRIMARY KEY NOT NULL,
	"sex" text DEFAULT 'unknown' NOT NULL,
	"historicity" text DEFAULT 'historical' NOT NULL,
	"summary" text
);
--> statement-breakpoint
CREATE TABLE "history"."person_date" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"person_id" uuid NOT NULL,
	"kind" text NOT NULL,
	"date_id" uuid NOT NULL,
	"place_id" uuid,
	"is_preferred" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "history"."polity" (
	"id" uuid PRIMARY KEY NOT NULL,
	"polity_type" text NOT NULL,
	"started_id" uuid,
	"ended_id" uuid,
	"summary" text
);
--> statement-breakpoint
CREATE TABLE "history"."polity_type" (
	"code" text PRIMARY KEY NOT NULL
);
--> statement-breakpoint
CREATE TABLE "history"."succession_mode" (
	"code" text PRIMARY KEY NOT NULL
);
--> statement-breakpoint
CREATE TABLE "history"."tenure" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"person_id" uuid NOT NULL,
	"polity_id" uuid,
	"office_type" text NOT NULL,
	"succession_mode" text,
	"start_id" uuid,
	"end_id" uuid,
	"seq" integer
);
--> statement-breakpoint
CREATE TABLE "history"."tenure_era" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenure_id" uuid NOT NULL,
	"name" text NOT NULL,
	"language" text,
	"script" text,
	"start_id" uuid,
	"end_id" uuid
);
--> statement-breakpoint
CREATE TABLE "history"."tenure_succession" (
	"from_tenure_id" uuid NOT NULL,
	"to_tenure_id" uuid NOT NULL,
	"mode" text NOT NULL,
	"state" text DEFAULT 'proposed' NOT NULL,
	CONSTRAINT "tenure_succession_from_tenure_id_to_tenure_id_pk" PRIMARY KEY("from_tenure_id","to_tenure_id")
);
--> statement-breakpoint
CREATE TABLE "history"."union" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"a_id" uuid NOT NULL,
	"b_id" uuid NOT NULL,
	"kind" text DEFAULT 'marriage' NOT NULL,
	"rank" text,
	"start_id" uuid,
	"end_id" uuid,
	"end_reason" text,
	"state" text DEFAULT 'proposed' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "kg"."audit_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"table_name" text NOT NULL,
	"row_id" uuid NOT NULL,
	"action" text NOT NULL,
	"actor" text NOT NULL,
	"before" jsonb,
	"after" jsonb,
	"at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "kg"."calendar" (
	"code" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "kg"."citation" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"subject_table" text NOT NULL,
	"subject_id" uuid NOT NULL,
	"source_id" uuid NOT NULL,
	"locator" text,
	"quote" text,
	"confidence" smallint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "kg"."collection" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"parent_id" uuid,
	"kind" text NOT NULL,
	"description" text,
	CONSTRAINT "collection_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "kg"."external_id" (
	"node_id" uuid NOT NULL,
	"system" text NOT NULL,
	"value" text NOT NULL,
	CONSTRAINT "external_id_system_value_pk" PRIMARY KEY("system","value")
);
--> statement-breakpoint
CREATE TABLE "kg"."fuzzy_date" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"edtf" text,
	"earliest_jdn" integer,
	"latest_jdn" integer,
	"precision" text NOT NULL,
	"source_calendar" text,
	"original_text" text,
	"note" text
);
--> statement-breakpoint
CREATE TABLE "kg"."label" (
	"namespace" text NOT NULL,
	"code" text NOT NULL,
	"language" text NOT NULL,
	"text" text NOT NULL,
	CONSTRAINT "label_namespace_code_language_pk" PRIMARY KEY("namespace","code","language")
);
--> statement-breakpoint
CREATE TABLE "kg"."language" (
	"code" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "kg"."name" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"node_id" uuid NOT NULL,
	"name" text NOT NULL,
	"name_normalized" text NOT NULL,
	"kind" text NOT NULL,
	"language" text,
	"script" text,
	"is_primary" boolean DEFAULT false NOT NULL,
	"valid_from" uuid,
	"valid_to" uuid
);
--> statement-breakpoint
CREATE TABLE "kg"."name_kind" (
	"code" text PRIMARY KEY NOT NULL
);
--> statement-breakpoint
CREATE TABLE "kg"."node" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kind" text NOT NULL,
	"slug" text NOT NULL,
	"review_state" text DEFAULT 'draft' NOT NULL,
	"merged_into" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "node_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "kg"."node_collection" (
	"node_id" uuid NOT NULL,
	"collection_id" uuid NOT NULL,
	CONSTRAINT "node_collection_node_id_collection_id_pk" PRIMARY KEY("node_id","collection_id")
);
--> statement-breakpoint
CREATE TABLE "kg"."node_kind" (
	"code" text PRIMARY KEY NOT NULL
);
--> statement-breakpoint
CREATE TABLE "kg"."relation" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"type" text NOT NULL,
	"from_id" uuid NOT NULL,
	"to_id" uuid NOT NULL,
	"start_id" uuid,
	"end_id" uuid,
	"state" text DEFAULT 'proposed' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "kg"."relation_type" (
	"code" text PRIMARY KEY NOT NULL,
	"category" text NOT NULL,
	"inverse_code" text,
	"is_symmetric" boolean DEFAULT false NOT NULL,
	"subject_kinds" text[] NOT NULL,
	"object_kinds" text[] NOT NULL
);
--> statement-breakpoint
CREATE TABLE "kg"."source" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"author" text,
	"kind" text,
	"language" text,
	"url" text,
	"license" text,
	"reliability" smallint,
	"note" text
);
--> statement-breakpoint
CREATE TABLE "learning"."card" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"node_id" uuid NOT NULL,
	"relation_id" uuid,
	"due_at" timestamp with time zone DEFAULT now() NOT NULL,
	"stability" real DEFAULT 0 NOT NULL,
	"difficulty" real DEFAULT 0 NOT NULL,
	"state" text DEFAULT 'new' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "learning"."progress" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"node_id" uuid NOT NULL,
	"mastered_ratio" real DEFAULT 0 NOT NULL,
	"stats" jsonb
);
--> statement-breakpoint
CREATE TABLE "learning"."review_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"card_id" uuid NOT NULL,
	"rating" integer NOT NULL,
	"reviewed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "history"."parentage" ADD CONSTRAINT "parentage_parent_id_person_id_fk" FOREIGN KEY ("parent_id") REFERENCES "history"."person"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "history"."parentage" ADD CONSTRAINT "parentage_child_id_person_id_fk" FOREIGN KEY ("child_id") REFERENCES "history"."person"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "history"."parentage" ADD CONSTRAINT "parentage_union_id_union_id_fk" FOREIGN KEY ("union_id") REFERENCES "history"."union"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "history"."person" ADD CONSTRAINT "person_id_node_id_fk" FOREIGN KEY ("id") REFERENCES "kg"."node"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "history"."person_date" ADD CONSTRAINT "person_date_person_id_person_id_fk" FOREIGN KEY ("person_id") REFERENCES "history"."person"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "history"."person_date" ADD CONSTRAINT "person_date_date_id_fuzzy_date_id_fk" FOREIGN KEY ("date_id") REFERENCES "kg"."fuzzy_date"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "history"."polity" ADD CONSTRAINT "polity_id_node_id_fk" FOREIGN KEY ("id") REFERENCES "kg"."node"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "history"."polity" ADD CONSTRAINT "polity_polity_type_polity_type_code_fk" FOREIGN KEY ("polity_type") REFERENCES "history"."polity_type"("code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "history"."polity" ADD CONSTRAINT "polity_started_id_fuzzy_date_id_fk" FOREIGN KEY ("started_id") REFERENCES "kg"."fuzzy_date"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "history"."polity" ADD CONSTRAINT "polity_ended_id_fuzzy_date_id_fk" FOREIGN KEY ("ended_id") REFERENCES "kg"."fuzzy_date"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "history"."tenure" ADD CONSTRAINT "tenure_person_id_person_id_fk" FOREIGN KEY ("person_id") REFERENCES "history"."person"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "history"."tenure" ADD CONSTRAINT "tenure_polity_id_polity_id_fk" FOREIGN KEY ("polity_id") REFERENCES "history"."polity"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "history"."tenure" ADD CONSTRAINT "tenure_office_type_office_type_code_fk" FOREIGN KEY ("office_type") REFERENCES "history"."office_type"("code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "history"."tenure" ADD CONSTRAINT "tenure_succession_mode_succession_mode_code_fk" FOREIGN KEY ("succession_mode") REFERENCES "history"."succession_mode"("code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "history"."tenure" ADD CONSTRAINT "tenure_start_id_fuzzy_date_id_fk" FOREIGN KEY ("start_id") REFERENCES "kg"."fuzzy_date"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "history"."tenure" ADD CONSTRAINT "tenure_end_id_fuzzy_date_id_fk" FOREIGN KEY ("end_id") REFERENCES "kg"."fuzzy_date"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "history"."tenure_era" ADD CONSTRAINT "tenure_era_tenure_id_tenure_id_fk" FOREIGN KEY ("tenure_id") REFERENCES "history"."tenure"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "history"."tenure_era" ADD CONSTRAINT "tenure_era_language_language_code_fk" FOREIGN KEY ("language") REFERENCES "kg"."language"("code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "history"."tenure_era" ADD CONSTRAINT "tenure_era_start_id_fuzzy_date_id_fk" FOREIGN KEY ("start_id") REFERENCES "kg"."fuzzy_date"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "history"."tenure_era" ADD CONSTRAINT "tenure_era_end_id_fuzzy_date_id_fk" FOREIGN KEY ("end_id") REFERENCES "kg"."fuzzy_date"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "history"."tenure_succession" ADD CONSTRAINT "tenure_succession_from_tenure_id_tenure_id_fk" FOREIGN KEY ("from_tenure_id") REFERENCES "history"."tenure"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "history"."tenure_succession" ADD CONSTRAINT "tenure_succession_to_tenure_id_tenure_id_fk" FOREIGN KEY ("to_tenure_id") REFERENCES "history"."tenure"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "history"."tenure_succession" ADD CONSTRAINT "tenure_succession_mode_succession_mode_code_fk" FOREIGN KEY ("mode") REFERENCES "history"."succession_mode"("code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "history"."union" ADD CONSTRAINT "union_a_id_person_id_fk" FOREIGN KEY ("a_id") REFERENCES "history"."person"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "history"."union" ADD CONSTRAINT "union_b_id_person_id_fk" FOREIGN KEY ("b_id") REFERENCES "history"."person"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "history"."union" ADD CONSTRAINT "union_start_id_fuzzy_date_id_fk" FOREIGN KEY ("start_id") REFERENCES "kg"."fuzzy_date"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "history"."union" ADD CONSTRAINT "union_end_id_fuzzy_date_id_fk" FOREIGN KEY ("end_id") REFERENCES "kg"."fuzzy_date"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kg"."citation" ADD CONSTRAINT "citation_source_id_source_id_fk" FOREIGN KEY ("source_id") REFERENCES "kg"."source"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kg"."external_id" ADD CONSTRAINT "external_id_node_id_node_id_fk" FOREIGN KEY ("node_id") REFERENCES "kg"."node"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kg"."fuzzy_date" ADD CONSTRAINT "fuzzy_date_source_calendar_calendar_code_fk" FOREIGN KEY ("source_calendar") REFERENCES "kg"."calendar"("code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kg"."label" ADD CONSTRAINT "label_language_language_code_fk" FOREIGN KEY ("language") REFERENCES "kg"."language"("code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kg"."name" ADD CONSTRAINT "name_node_id_node_id_fk" FOREIGN KEY ("node_id") REFERENCES "kg"."node"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kg"."name" ADD CONSTRAINT "name_kind_name_kind_code_fk" FOREIGN KEY ("kind") REFERENCES "kg"."name_kind"("code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kg"."name" ADD CONSTRAINT "name_language_language_code_fk" FOREIGN KEY ("language") REFERENCES "kg"."language"("code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kg"."node" ADD CONSTRAINT "node_kind_node_kind_code_fk" FOREIGN KEY ("kind") REFERENCES "kg"."node_kind"("code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kg"."node_collection" ADD CONSTRAINT "node_collection_node_id_node_id_fk" FOREIGN KEY ("node_id") REFERENCES "kg"."node"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kg"."node_collection" ADD CONSTRAINT "node_collection_collection_id_collection_id_fk" FOREIGN KEY ("collection_id") REFERENCES "kg"."collection"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kg"."relation" ADD CONSTRAINT "relation_type_relation_type_code_fk" FOREIGN KEY ("type") REFERENCES "kg"."relation_type"("code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kg"."relation" ADD CONSTRAINT "relation_from_id_node_id_fk" FOREIGN KEY ("from_id") REFERENCES "kg"."node"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kg"."relation" ADD CONSTRAINT "relation_to_id_node_id_fk" FOREIGN KEY ("to_id") REFERENCES "kg"."node"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kg"."relation" ADD CONSTRAINT "relation_start_id_fuzzy_date_id_fk" FOREIGN KEY ("start_id") REFERENCES "kg"."fuzzy_date"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kg"."relation" ADD CONSTRAINT "relation_end_id_fuzzy_date_id_fk" FOREIGN KEY ("end_id") REFERENCES "kg"."fuzzy_date"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kg"."source" ADD CONSTRAINT "source_language_language_code_fk" FOREIGN KEY ("language") REFERENCES "kg"."language"("code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "learning"."card" ADD CONSTRAINT "card_node_id_node_id_fk" FOREIGN KEY ("node_id") REFERENCES "kg"."node"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "learning"."progress" ADD CONSTRAINT "progress_node_id_node_id_fk" FOREIGN KEY ("node_id") REFERENCES "kg"."node"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "learning"."review_log" ADD CONSTRAINT "review_log_card_id_card_id_fk" FOREIGN KEY ("card_id") REFERENCES "learning"."card"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "parentage_parent_child_kind_key" ON "history"."parentage" USING btree ("parent_id","child_id","kind");--> statement-breakpoint
CREATE INDEX "parentage_child_idx" ON "history"."parentage" USING btree ("child_id");--> statement-breakpoint
CREATE INDEX "parentage_parent_idx" ON "history"."parentage" USING btree ("parent_id");--> statement-breakpoint
CREATE UNIQUE INDEX "person_date_preferred_key" ON "history"."person_date" USING btree ("person_id","kind") WHERE "history"."person_date"."is_preferred" = true;--> statement-breakpoint
CREATE INDEX "tenure_person_idx" ON "history"."tenure" USING btree ("person_id");--> statement-breakpoint
CREATE INDEX "tenure_polity_seq_idx" ON "history"."tenure" USING btree ("polity_id","seq");--> statement-breakpoint
CREATE INDEX "citation_subject_idx" ON "kg"."citation" USING btree ("subject_table","subject_id");--> statement-breakpoint
CREATE INDEX "name_normalized_idx" ON "kg"."name" USING btree ("name_normalized");--> statement-breakpoint
CREATE UNIQUE INDEX "node_id_kind_key" ON "kg"."node" USING btree ("id","kind");--> statement-breakpoint
CREATE INDEX "relation_from_type_idx" ON "kg"."relation" USING btree ("from_id","type");--> statement-breakpoint
CREATE INDEX "relation_to_type_idx" ON "kg"."relation" USING btree ("to_id","type");