import { sql } from "drizzle-orm";
import { index } from "drizzle-orm/gel-core";
import {
    pgTable,
    uuid,
    text,
    jsonb,
    timestamp,
    integer,
    pgEnum,
    uniqueIndex
} from "drizzle-orm/pg-core";

/* =========================
   ENUMS
========================= */

export const jobStatusEnum = pgEnum("job_status", [
    "queued",
    "processing",
    "success",
    "failed",
]);

export const webhookStatusEnum = pgEnum("webhook_status", [
    "pending",
    "delivered",
    "failed",
    "skipped",
]);

/* =========================
   PIPELINES
========================= */

export const pipelines = pgTable("pipelines", {
    id: uuid("id").primaryKey().defaultRandom(),

    name: text("name").notNull(),

    processorType: text("processor_type").notNull(),

    config: jsonb("config").notNull().default({}),

    signingSecret: text("signing_secret").notNull(),

    createdAt: timestamp("created_at").defaultNow().notNull(),

    updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

/* =========================
   SUBSCRIPTIONS
========================= */

export const subscriptions = pgTable("subscriptions", {
    id: uuid("id").primaryKey().defaultRandom(),

    pipelineId: uuid("pipeline_id")
        .notNull()
        .references(() => pipelines.id, { onDelete: "cascade" }),

    callbackUrl: text("callback_url").notNull(),

    createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => {
    return {
        pipelineCallbackUnique: uniqueIndex("pipeline_callback_unique")
            .on(table.pipelineId, table.callbackUrl),
    };
});

/* =========================
   JOBS
========================= */

export const jobs = pgTable("jobs", {
    id: uuid("id").primaryKey().defaultRandom(),

    pipelineId: uuid("pipeline_id")
        .notNull()
        .references(() => pipelines.id, { onDelete: "cascade" }),

    eventId: text("event_id").notNull(),

    payload: jsonb("payload").notNull(),

    result: jsonb("result"),

    errorMessage: text("error_message"),

    status: jobStatusEnum("status")
        .notNull()
        .default("queued"),

    webhookStatus: webhookStatusEnum("webhook_status")
        .notNull()
        .default("pending"),

    webhookAttempts: integer("webhook_attempts")
        .notNull()
        .default(0),

    nextWebhookAttemptAt: timestamp("next_webhook_attempt_at")
        .defaultNow(),
    lockedAt: timestamp("locked_at"),

    createdAt: timestamp("created_at").defaultNow().notNull(),

    startedAt: timestamp("started_at"),

    finishedAt: timestamp("finished_at"),
}, (table) => {
    return {
        pipelineEventUnique: uniqueIndex("jobs_pipeline_event_id_idx")
            .on(table.pipelineId, table.eventId),
        statusIdx: index("jobs_status_idx")
            .on(sql`${table.status}`),
        webhookPollingIdx: index("jobs_webhook_polling_idx")
            .on(sql`${table.webhookStatus}`, sql`${table.nextWebhookAttemptAt}`),

        lockedAtIdx: index("jobs_locked_at_idx")
            .on(sql`${table.lockedAt}`),
    };

});

/* =========================
   DELIVERY ATTEMPTS
========================= */

export const deliveryAttempts = pgTable("delivery_attempts", {
    id: uuid("id").primaryKey().defaultRandom(),

    jobId: uuid("job_id")
        .notNull()
        .references(() => jobs.id),

    subscriptionId: uuid("subscription_id")
        .notNull()
        .references(() => subscriptions.id),

    attemptNumber: integer("attempt_number").notNull(),

    statusCode: integer("status_code"),

    responseBody: text("response_body"),

    errorMessage: text("error_message"),

    attemptedAt: timestamp("attempted_at")
        .defaultNow()
        .notNull(),
});

export type Pipeline = typeof pipelines.$inferSelect;
export type NewPipeline = typeof pipelines.$inferInsert;

export type Job = typeof jobs.$inferSelect;
export type NewJob = typeof jobs.$inferInsert;

export type Subscription = typeof subscriptions.$inferSelect;
export type NewSubscription = typeof subscriptions.$inferInsert;