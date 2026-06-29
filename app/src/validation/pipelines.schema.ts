import { z } from "zod";

export const createPipelineSchema = z.object({
    name: z.string().min(1).max(100),

    processorType: z.string().min(1),

    config: z.record(z.string(), z.any()).default({})
}).strict();

export type CreatePipelineInput = z.infer<typeof createPipelineSchema>;


export const updatePipelineSchema = z.object({
    name: z.string().min(1).max(100).optional(),

    processorType: z.string().min(1).optional(),

    config: z.record(z.string(), z.any()).optional()
}).strict();

export type UpdatePipelineInput = z.infer<typeof updatePipelineSchema>;