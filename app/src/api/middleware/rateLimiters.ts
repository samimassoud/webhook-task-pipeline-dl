import rateLimit from "express-rate-limit";

// Shared configuration
const baseConfig = {
    windowMs: 60 * 1000, // 1 minute
    standardHeaders: true,
    legacyHeaders: false,
};

// Webhook rate limiter (can receive bursts)
export const webhookRateLimiter = rateLimit({
    ...baseConfig,
    max: 100, // per IP
    message: {
        error: "Too many webhook requests, please slow down."
    }
});

// Pipelines API limiter (CRUD operations)
export const pipelineRateLimiter = rateLimit({
    ...baseConfig,
    max: 30, // per IP
    message: {
        error: "Too many pipeline requests, please try again later."
    }
});

// Jobs API limiter (read-heavy, slightly higher)
export const jobsRateLimiter = rateLimit({
    ...baseConfig,
    max: 60, // per IP
    message: {
        error: "Too many job requests, please try again later."
    }
});