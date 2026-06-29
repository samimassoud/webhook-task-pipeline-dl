import { ZodSchema } from "zod"

export interface Processor {
    configSchema: ZodSchema,
    run(payload: unknown, config: unknown): Promise<unknown>
}