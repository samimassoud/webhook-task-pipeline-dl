import { HttpEnrichConfig } from "../configSchemas/httpEnrich.schema.js";

export async function httpEnrichProcessor(
    payload: unknown,
    config: HttpEnrichConfig
) {
    if (typeof payload !== "object" || payload === null) {
        throw new Error("Payload must be an object");
    } // Protect against malformed payloads

    const data = payload as Record<string, unknown>;
    const value = data[config.lookupField];

    if (!value) {
        throw new Error(
            `Lookup field "${config.lookupField}" not found in payload`
        );
    }

    const url = config.enrichUrl.replace(
        "{value}",
        encodeURIComponent(String(value))
    ); // encodeURIComponent escapes any characters that could break or manipulate the URL
    // replace("{value}",...) substitutes the placeholder with the safely encoded value.

    const controller = new AbortController();
    // This built-in interface lets us create objects that allow us to abort web requests when desired
    // In our case, when the timeout (5 seconds default, max: 10) which is in the config schema runs out.

    const timeout = setTimeout(() => {
        controller.abort(); // fires the signal
    }, config.timeoutMs);

    let response;

    try {
        response = await fetch(url, {
            signal: controller.signal // listens for the signal
        });
    } finally {
        clearTimeout(timeout);
    }

    if (!response.ok) {
        throw new Error(`Enrichment request failed with status ${response.status}`);
    }

    const enrichment = await response.json();

    return {
        ...data,
        [config.mergeKey]: enrichment
    };
    // We return a new object instead of mutating the original payload;
    // making it deterministic; if other code held reference to the payload, no hidden side effects would occur.
}