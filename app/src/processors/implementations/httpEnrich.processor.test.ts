import { describe, it, expect, vi, beforeEach } from "vitest";
import { httpEnrichProcessor } from "./httpEnrich.processor.js";

describe("httpEnrichProcessor", () => {

    beforeEach(() => {
        vi.restoreAllMocks();
    });

    // Test core functionality
    it("enriches payload with API response", async () => {

        const mockResponse = {
            ip: "8.8.8.8",
            country_code: "US"
        };

        global.fetch = vi.fn().mockResolvedValue({
            ok: true,
            json: async () => mockResponse
        } as Partial<Response>);
        // This overrides global.fetch which means that any call to fetch()
        // returns our mockResponse

        const payload = {
            ip: "8.8.8.8",
            userId: "usr_123"
        };

        const config = {
            lookupField: "ip",
            enrichUrl: "https://api.ipinfo.io/lite/{value}?token=test",
            mergeKey: "geoData",
            timeoutMs: 5000
        };

        const result = await httpEnrichProcessor(payload, config);

        expect(result).toEqual({
            ip: "8.8.8.8",
            userId: "usr_123",
            geoData: mockResponse
        });

        expect(fetch).toHaveBeenCalledTimes(1);
    });

    // Test missing lookup field from payload
    it("throws when lookup field is missing", async () => {

        const payload = {
            userId: "usr_123"
        };

        const config = {
            lookupField: "ip",
            enrichUrl: "https://api.ipinfo.io/lite/{value}?token=test",
            mergeKey: "geoData",
            timeoutMs: 5000
        };

        await expect(
            httpEnrichProcessor(payload, config)
        ).rejects.toThrow('Lookup field "ip" not found');

    });

    // Test HTTP failure: fetch gives (!response.ok) = true
    it("throws when API request fails", async () => {

        global.fetch = vi.fn().mockResolvedValue({
            ok: false,
            status: 500
        } as Partial<Response>);

        const payload = {
            ip: "8.8.8.8"
        };

        const config = {
            lookupField: "ip",
            enrichUrl: "https://api.ipinfo.io/lite/{value}?token=test",
            mergeKey: "geoData",
            timeoutMs: 5000
        };

        await expect(
            httpEnrichProcessor(payload, config)
        ).rejects.toThrow("Enrichment request failed");

    });

    // Test substitution
    it("injects lookup value into enrichUrl", async () => {

        global.fetch = vi.fn().mockResolvedValue({
            ok: true,
            json: async () => ({})
        } as Partial<Response>);

        const payload = {
            ip: "1.2.3.4"
        };

        const config = {
            lookupField: "ip",
            enrichUrl: "https://api.ipinfo.io/lite/{value}?token=test",
            mergeKey: "geoData",
            timeoutMs: 5000
        };

        await httpEnrichProcessor(payload, config);

        expect(fetch).toHaveBeenCalledWith(
            expect.stringContaining("1.2.3.4"),
            expect.any(Object)
        );

    });

});