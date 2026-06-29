import dotenv from "dotenv";
dotenv.config();
import { defineConfig } from "drizzle-kit";
export default defineConfig({
    schema: "./src/repositories/schema.ts",
    out: "./drizzle",
    dialect: "postgresql",
    dbCredentials: {
        url: process.env.DATABASE_URL!,
    }
})