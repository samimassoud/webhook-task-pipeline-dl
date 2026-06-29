import { z } from "zod";

export const textSummarizeConfigSchema = z.object({
    inputField: z.string(),

    maxSentences: z.number()
        .int()
        .positive()
        .max(10)
        .default(3),

    keywordCount: z.number()
        .int()
        .positive()
        .max(20)
        .default(5)

}).strict();

export type TextSummarizeConfig = z.infer<typeof textSummarizeConfigSchema>;