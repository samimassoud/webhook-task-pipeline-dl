import { describe, it, expect } from "vitest";
import { jsonTransformProcessor } from "./jsonTransform.processor.js";

describe("jsonTransformProcessor", () => {

    it("extracts fields from payload", async () => {

        const payload = {
            user: {
                email: "jane@co.com",
                name: "Jane"
            }
        };

        const config = {
            extract: ["user.email", "user.name"]
        };

        const result = await jsonTransformProcessor(payload, config);

        expect(result).toEqual({
            email: "jane@co.com",
            name: "Jane"
        });

    });

    it("renames fields", async () => {

        const payload = {
            user: {
                email: "jane@co.com",
                name: "Jane"
            }
        };

        const config = {
            rename: {
                "user.email": "email",
                "user.name": "username"
            }
        };

        const result = await jsonTransformProcessor(payload, config);

        expect(result).toEqual({
            email: "jane@co.com",
            username: "Jane"
        });

    });

    it("adds static fields", async () => {

        const payload = {};

        const config = {
            addFields: {
                source: "pipeline"
            }
        };

        const result = await jsonTransformProcessor(payload, config);

        expect(result).toEqual({
            source: "pipeline"
        });

    });

    it("handles __now__ token", async () => {

        const payload = {};

        const config = {
            addFields: {
                processedAt: "__now__"
            }
        };

        const result = await jsonTransformProcessor(payload, config);

        expect(result.processedAt).toBeTypeOf("string");

    });

    it("supports extract + rename + addFields together", async () => {

        const payload = {
            user: {
                email: "jane@co.com"
            },
            event: {
                type: "signup"
            }
        };

        const config = {
            extract: ["user.email"],
            rename: {
                "event.type": "eventKind"
            },
            addFields: {
                source: "pipeline"
            }
        };

        const result = await jsonTransformProcessor(payload, config);

        expect(result).toEqual({
            email: "jane@co.com",
            eventKind: "signup",
            source: "pipeline"
        });

    });

});