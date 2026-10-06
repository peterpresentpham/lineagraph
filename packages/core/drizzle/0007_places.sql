CREATE TABLE "history"."place" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"name_normalized" text NOT NULL,
	"parent_id" uuid,
	"latitude" double precision,
	"longitude" double precision,
	"note" text,
	CONSTRAINT "place_latitude_check" CHECK ("history"."place"."latitude" between -90 and 90),
	CONSTRAINT "place_longitude_check" CHECK ("history"."place"."longitude" between -180 and 180)
);
--> statement-breakpoint
ALTER TABLE "history"."person" ADD COLUMN "birth_place_id" uuid;--> statement-breakpoint
ALTER TABLE "history"."person" ADD COLUMN "death_place_id" uuid;--> statement-breakpoint
ALTER TABLE "history"."place" ADD CONSTRAINT "place_parent_id_place_id_fk" FOREIGN KEY ("parent_id") REFERENCES "history"."place"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "place_name_idx" ON "history"."place" USING btree ("name_normalized");--> statement-breakpoint
CREATE INDEX "place_parent_idx" ON "history"."place" USING btree ("parent_id");--> statement-breakpoint
ALTER TABLE "history"."person" ADD CONSTRAINT "person_birth_place_id_place_id_fk" FOREIGN KEY ("birth_place_id") REFERENCES "history"."place"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "history"."person" ADD CONSTRAINT "person_death_place_id_place_id_fk" FOREIGN KEY ("death_place_id") REFERENCES "history"."place"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "history"."person_date" DROP COLUMN "place_id";