import { describe, it, expect } from "vitest"
import { textSummarizeProcessor } from "./textSummarize.processor.js"

describe("textSummarizeProcessor", () => {

    const payload = {
        subject: "Q4 Review",
        body: `
      This quarter we exceeded targets by 15%.
      Revenue grew in all regions.
      Customer retention improved significantly.
      Marketing campaigns performed well.
      Our growth trajectory is strong.
    `
    };

    const config = {
        inputField: "body",
        maxSentences: 2,
        keywordCount: 3
    };

    it("generates summary and keywords", async () => {

        const result = await textSummarizeProcessor(payload, config);

        expect(result.summary).toBeDefined();
        expect(result.keywords.length).toBe(3);
        expect(result.wordCount).toBeGreaterThan(0);
        expect(result.sentenceCount).toBeGreaterThan(0);

        console.log("Paragraph:", payload.body);
        console.log("Summary:", result.summary);
        console.log("Keywords:", result.keywords);
        console.log("Word count:", result.wordCount);
        console.log("Sentence count:", result.sentenceCount);


    })

    it("throws if field is not string", async () => {

        const badPayload = { body: 123 };

        await expect(
            textSummarizeProcessor(badPayload as Record<string, unknown>, config)
        ).rejects.toThrow();

    })

})