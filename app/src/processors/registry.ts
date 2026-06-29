import { httpEnrichConfigSchema } from "./configSchemas/httpEnrich.schema.js";
import { jsonTransformConfigSchema } from "./configSchemas/jsonTransform.schema.js";
import { textSummarizeConfigSchema } from "./configSchemas/textSummarize.schema.js";
import { httpEnrichProcessor } from "./implementations/httpEnrich.processor.js";
import { jsonTransformProcessor } from "./implementations/jsonTransform.processor.js";
import { textSummarizeProcessor } from "./implementations/textSummarize.processor.js";
import { Processor } from "./types.js";

export const processorRegistry: Record<string, Processor> = {
  jsonTransform: {
    configSchema: jsonTransformConfigSchema,
    run: jsonTransformProcessor
  },
  httpEnrich: {
    configSchema: httpEnrichConfigSchema,
    run: httpEnrichProcessor
  },
  textSummarize: {
    configSchema: textSummarizeConfigSchema,
    run: textSummarizeProcessor
  }
}

/* 
Validation will happen in the service layer
before touching the repository.
The flow will be:
route
  ↓
handler
  ↓
service  ← validation happens here
  ↓
repository
  ↓
database

Types of validation:
1- Validate that a processor exists:
const processor = processorRegistry[data.processorType]

if (!processor) {
  throw new Error("Unsupported processor type")
}
const result = await processor.run(job.payload, pipeline.config);

This ensures we can't create pipelines with unknown processors.

2- Validate config structure (Config field is jsonb, we don't want it to be anything!)
const validatedConfig =
  processor.configSchema.parse(data.config)

This will ensure that the pipeline is never saved with bad configuration.

3- (optional)
We can also normalize config data;

e.g., User sends: "url": "https://api.com/{value}/"
you normalize to https://api.com/{value}

Or you add defaults:
const config = {
  timeout: 5000,
  ...validatedConfig
}

After validation you call repository:
return pipelineRepository.create({
  name: data.name,
  processorType: data.processorType,
  config: validatedConfig
})
*/