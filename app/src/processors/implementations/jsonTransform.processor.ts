import { JsonTransformConfig } from "../configSchemas/jsonTransform.schema.js";

// Helper function for dot-path extraction, handled via path.split(".")
function getValueByPath(obj: Record<string, unknown>, path: string) {
    return path.split(".").reduce<unknown>((acc, key) => {
        if (acc === null || acc === undefined) return undefined;
        if (typeof acc === "object" && acc !== null && key in acc) {
            return (acc as Record<string, unknown>)[key];
        }
        return undefined;
    }, obj);

    // .reduce(...) walks through the object using the path array, accumulating it per iteration
    // The final result is the nested value or undefined if the path doesn't exist
    // this lets us read JSON nested values like: user.address.city
}

export async function jsonTransformProcessor(
    payload: unknown,
    config: JsonTransformConfig
) {
    if (typeof payload !== "object" || payload === null) {
        throw new Error("Payload must be an object");
    } // Protect against malformed payloads

    const data = payload as Record<string, unknown>;
    const result: Record<string, unknown> = {};

    // Extract fields (if in config)
    if (config.extract) {
        for (const path of config.extract) {
            const value = getValueByPath(data, path);
            if (value !== undefined) {
                const key = path.split(".").pop()!; // get the key alone to create the record
                result[key] = value; // create/add the record
            }
            // silently skip incorrect paths
        }
    }

    // Rename fields
    if (config.rename) {
        for (const [path, newKey] of Object.entries(config.rename)) {
            const value = getValueByPath(data, path); // implicit extract
            if (value !== undefined) {
                result[newKey] = value;
            }
            // silently skip incorrect paths
        }
    }

    // Add static fields
    if (config.addFields) {
        for (const [key, value] of Object.entries(config.addFields)) {
            if (value === "__now__") { // __now__ is a special token
                result[key] = new Date().toISOString();
                // we can add more later
            } else {
                result[key] = value;
            }
        }
    }

    return result;
}