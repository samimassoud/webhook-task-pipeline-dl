import { z } from "zod";

export const createSubscriptionSchema = z.object({
    callbackUrl: z.string().url()
}).strict();

export type CreateSubscriptionInput = z.infer<typeof createSubscriptionSchema>;