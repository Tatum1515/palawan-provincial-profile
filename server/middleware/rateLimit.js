import rateLimit from "express-rate-limit";

/*
 * LOGIN RATE LIMIT
 *
 * Throttles repeated login attempts per IP to slow down
 * credential-stuffing / brute-force attacks against
 * /api/auth/login. The limit is generous enough that no
 * legitimate user should ever hit it under normal use.
 */
export const loginRateLimit = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 20,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        success: false,
        error: "Too many login attempts. Please wait a few minutes and try again.",
    },
});
