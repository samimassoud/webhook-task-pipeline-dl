DROP INDEX "jobs_pipeline_payload_hash_idx";--> statement-breakpoint
ALTER TABLE "jobs" ADD COLUMN "event_id" text NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "jobs_pipeline_event_id_idx" ON "jobs" USING btree ("pipeline_id","event_id");--> statement-breakpoint
ALTER TABLE "jobs" DROP COLUMN "payload_hash";