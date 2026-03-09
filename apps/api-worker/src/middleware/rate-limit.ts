import type { MiddlewareHandler } from "hono";
import type { AppBindings } from "../types";
import { getIpAddress } from "../utils/http";

interface RateLimitOptions {
  limit: number;
  windowMs: number;
}

export function rateLimit(options: RateLimitOptions): MiddlewareHandler<AppBindings> {
  return async (c, next) => {
    const user = c.get("user");
    const key = user?.sub ? `user:${user.sub}` : `ip:${getIpAddress(c)}`;
    const id = c.env.RATE_LIMITER.idFromName(key);
    const stub = c.env.RATE_LIMITER.get(id);
    const response = await stub.fetch("https://rate-limit/check", {
      method: "POST",
      body: JSON.stringify(options),
      headers: {
        "content-type": "application/json",
      },
    });

    const payload = (await response.json()) as {
      allowed: boolean;
      remaining: number;
      retryAfterMs: number;
      resetAt?: number;
    };

    c.header("X-RateLimit-Limit", String(options.limit));
    c.header("X-RateLimit-Remaining", String(payload.remaining));
    if (payload.resetAt) {
      c.header("X-RateLimit-Reset", String(Math.floor(payload.resetAt / 1000)));
    }

    if (!payload.allowed) {
      c.header("Retry-After", String(Math.ceil(payload.retryAfterMs / 1000)));
      return c.json({ error: "Rate limit exceeded" }, 429);
    }

    await next();
  };
}
