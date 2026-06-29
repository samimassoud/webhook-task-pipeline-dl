import { and, eq } from "drizzle-orm";
import { db } from "../db.js";
import { NewSubscription, subscriptions } from "../schema.js";

export async function addSubscription(data: NewSubscription) {
    const [result] = await db.insert(subscriptions).values(data).returning();
    return result;
}
export async function listSubscriptions(id: string) {
    const result = await db.select()
        .from(subscriptions)
        .where(eq(subscriptions.pipelineId, id))
    return result;
}
export async function getSubscriptionByPipelineAndUrl(
    pipelineId: string,
    callbackUrl: string
) {
    const [result] = await db
        .select()
        .from(subscriptions)
        .where(
            and(
                eq(subscriptions.pipelineId, pipelineId),
                eq(subscriptions.callbackUrl, callbackUrl)
            )
        );

    return result ?? null;
}

export async function getSubscription(pipelineId: string, subscriptionId: string) {
    const [result] = await db
        .select()
        .from(subscriptions)
        .where(
            and(
                eq(subscriptions.id, subscriptionId),
                eq(subscriptions.pipelineId, pipelineId)
            )
        );
    return result ?? null;
}

export async function deleteSubscription(id: string, subId: string) {
    const [result] = await db.delete(subscriptions)
        .where(and(
            eq(subscriptions.id, subId),
            eq(subscriptions.pipelineId, id)
        ))
        .returning();
    return result;
}