import { z } from "zod";

export const httpEnrichConfigSchema = z.object({
    lookupField: z.string(),

    enrichUrl: z
        .string()
        .url()
        .refine(url => url.includes("{value}"), {
            message: "enrichUrl must include {value} placeholder"
        }),

    mergeKey: z.string().default("enrichment"),

    timeoutMs: z.number().int().positive().max(10000).default(5000)
}).strict();

export type HttpEnrichConfig = z.infer<typeof httpEnrichConfigSchema>