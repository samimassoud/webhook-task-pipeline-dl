import { z } from "zod";

export const jsonTransformConfigSchema = z.object({

    extract: z.array(z.string()).optional(), // examples: [user.email, user.name]

    rename: z.record(z.string(), z.string()).optional(), // examples: {"user.email": "email", "user.name": "username"}

    addFields: z
        .record(z.string(), z.union([
            z.string(),
            z.number(),
            z.boolean()
        ]))
        .optional() // examples: "processedAt": "__now__", "source": "pipeline_name"

}).strict()
    .refine(
        cfg => cfg.extract || cfg.rename || cfg.addFields,
        {
            message: "At least one of extract, rename, or addFields must be provided"
        }
    ); // This enforces at least one transform rule; since all are optional, we don't
// want clients to create a jsonTransform pipeline with an empty config schema.
// jsonTransform pipeline can: extract fields, rename fields (implicitly extracts), add fields or all at once.

export type JsonTransformConfig = z.infer<typeof jsonTransformConfigSchema>;