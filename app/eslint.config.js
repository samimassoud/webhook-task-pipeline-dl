import js from "@eslint/js";
import tseslint from "typescript-eslint";

export default [
    {
        ignores: [
            "dist/**",
            "node_modules/**",
            "drizzle.config.ts"
        ],

    },
    js.configs.recommended,
    ...tseslint.configs.recommended,
    {
        files: ["**/*.ts"],
        languageOptions: {
            parserOptions: {
                project: "./tsconfig.json",
            },
        },
        rules: {
            "no-console": "warn", // warnings only
            "eqeqeq": "error", // errors will fail CI
        },
    },
];