-- Squashed from the former 0005-0008. Tenure disputed flag, relationship / office importance
-- (1 = minor, 5 = core) and the per-relation-type default importance.
ALTER TABLE "history"."tenure" ADD COLUMN "disputed" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "kg"."relation" ADD COLUMN "importance" smallint DEFAULT 3 NOT NULL;--> statement-breakpoint
ALTER TABLE "kg"."relation" ADD CONSTRAINT "relation_importance_check" CHECK ("kg"."relation"."importance" between 1 and 5);--> statement-breakpoint
ALTER TABLE "history"."office_type" ADD COLUMN "importance" smallint DEFAULT 3 NOT NULL;--> statement-breakpoint
ALTER TABLE "kg"."relation_type" ADD COLUMN "default_importance" smallint DEFAULT 3 NOT NULL;--> statement-breakpoint
ALTER TABLE "kg"."relation_type" ADD CONSTRAINT "relation_type_default_importance_check" CHECK ("kg"."relation_type"."default_importance" between 1 and 5);--> statement-breakpoint
-- Starting importance by relation type: succession and founding are the spine of a dynasty graph,
-- conquest and splits come next, teacher / friend / rival are minor, the rest keep the default 3.
-- Existing relationships get their type's value; descent (parent / child) stays at 3 so a dynasty
-- graph opens on its rulers, not their in-laws. Both sides of an inverse pair share one value.
UPDATE "kg"."relation_type" SET "default_importance" = 5 WHERE "code" IN ('successor_of', 'predecessor_of', 'succeeds', 'succeeded_by', 'founder_of', 'founded_by');--> statement-breakpoint
UPDATE "kg"."relation_type" SET "default_importance" = 4 WHERE "code" IN ('conquered', 'conquered_by', 'split_from', 'split_into');--> statement-breakpoint
UPDATE "kg"."relation_type" SET "default_importance" = 2 WHERE "code" IN ('teacher_of', 'student_of', 'rival_of', 'friend_of');--> statement-breakpoint
UPDATE "kg"."relation" r SET "importance" = t."default_importance" FROM "kg"."relation_type" t WHERE t."code" = r."type";--> statement-breakpoint
-- Heads of a polity are core; regents and court officials sit below them, soldiers and clerks lower.
UPDATE "history"."office_type" SET "importance" = 5 WHERE "code" IN ('emperor', 'king', 'duke', 'lord');--> statement-breakpoint
UPDATE "history"."office_type" SET "importance" = 2 WHERE "code" IN ('general', 'mandarin', 'other');
