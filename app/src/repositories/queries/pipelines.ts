import { eq } from "drizzle-orm";
import { db } from "../db.js";
import { NewPipeline, pipelines } from "../schema.js";
// Utility to strip signingSecret before returning
function sanitizePipeline<T extends { signingSecret?: string }>(pipeline: T) {
    // Destructure the object, pulling out signingSecret
    const safe = { ...pipeline };
    delete safe.signingSecret;
    // Return everything except signingSecret
    return safe;
}


export async function createPipeline(data: NewPipeline) {
    const [result] = await db.insert(pipelines).values(data).returning();
    // At creation  time, we return the full object including the signingSecret
    // so the creator can store it securely.
    return result;
}

export async function listPipelines() {
    try {
        const result = await db.select().from(pipelines);
        return result.map(sanitizePipeline);
    } catch (err) {
        console.log("DB URL:", process.env.DATABASE_URL);
        console.error("Pipeline query failed:", err);
        throw err;
    }
}

export async function getPipelineById(id: string) {
    const [result] = await db.select()
        .from(pipelines)
        .where(eq(pipelines.id, id));

    return result ? sanitizePipeline(result) : null;
}

export async function getPipelineWithSecret(id: string) {
    const [result] = await db
        .select()
        .from(pipelines)
        .where(eq(pipelines.id, id));

    return result;
}

export async function updatePipeline(
    id: string,
    data: Partial<NewPipeline>
) {
    const [result] = await db.update(pipelines)
        .set({
            ...data,
            updatedAt: new Date()
        })
        .where(eq(pipelines.id, id))
        .returning();
    return sanitizePipeline(result);
}

export async function deletePipeline(
    id: string
) {
    const [result] = await db.delete(pipelines)
        .where(eq(pipelines.id, id))
        .returning();
    console.log("Delete result:", result);
    return result ? sanitizePipeline(result) : null;
}
