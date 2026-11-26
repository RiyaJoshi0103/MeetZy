// Standard in-memory rate limiter with RFC-compliant headers
export const createRateLimiter = ({ windowMs = 15 * 60 * 1000, max = 100, message = "Too many requests" } = {}) => {
    const clients = new Map();

    return (req, res, next) => {
        const ip = req.ip || req.headers["x-forwarded-for"] || req.connection?.remoteAddress || "global";
        const now = Date.now();

        const record = clients.get(ip) || { count: 0, resetTime: now + windowMs };

        if (now > record.resetTime) {
            record.count = 1;
            record.resetTime = now + windowMs;
        } else {
            record.count += 1;
        }

        clients.set(ip, record);

        res.setHeader("X-RateLimit-Limit", max);
        res.setHeader("X-RateLimit-Remaining", Math.max(0, max - record.count));
        res.setHeader("X-RateLimit-Reset", Math.ceil(record.resetTime / 1000));

        if (record.count > max) {
            return res.status(429).json({
                message: message,
                retryAfterSeconds: Math.ceil((record.resetTime - now) / 1000)
            });
        }

        next();
    };
};

export const authLimiter = createRateLimiter({
    windowMs: 15 * 60 * 1000,
    max: 20, // 20 login/register attempts per 15 min per IP
    message: "Too many login/registration attempts. Please try again after 15 minutes."
});

export const apiLimiter = createRateLimiter({
    windowMs: 15 * 60 * 1000,
    max: 300,
    message: "API rate limit reached. Please try again later."
});
