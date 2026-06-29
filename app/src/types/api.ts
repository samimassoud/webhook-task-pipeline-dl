import { NewPipeline } from "../repositories/schema.js";

export type UpdatePipelineInput = Omit<Partial<NewPipeline>, "signingSecret">;