DROP INDEX "users_email_idx";--> statement-breakpoint
DROP INDEX "users_username_idx";--> statement-breakpoint
DROP INDEX "todos_done_idx";--> statement-breakpoint
DROP INDEX "todos_priority_idx";--> statement-breakpoint
DROP INDEX "todos_user_done_idx";--> statement-breakpoint
DROP INDEX "todos_user_id_idx";--> statement-breakpoint
DROP INDEX "todos_user_priority_idx";--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "updated_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
CREATE INDEX "users_email_idx" ON "users" USING btree ("email");--> statement-breakpoint
CREATE INDEX "users_username_idx" ON "users" USING btree ("username");--> statement-breakpoint
CREATE INDEX "todos_done_idx" ON "todos" USING btree ("done");--> statement-breakpoint
CREATE INDEX "todos_priority_idx" ON "todos" USING btree ("priority");--> statement-breakpoint
CREATE INDEX "todos_user_done_idx" ON "todos" USING btree ("user_id","done");--> statement-breakpoint
CREATE INDEX "todos_user_id_idx" ON "todos" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "todos_user_priority_idx" ON "todos" USING btree ("user_id","priority");