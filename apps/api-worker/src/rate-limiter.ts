export class RateLimiterDO implements DurableObject {
  private state: DurableObjectState;
  private env: unknown;

  constructor(state: DurableObjectState, env: unknown) {
    this.state = state;
    this.env = env;
  }

  async fetch(request: Request): Promise<Response> {
    void this.env;

    if (request.method !== "POST") {
      return Response.json({ error: "Method not allowed" }, { status: 405 });
    }

    const body = (await request.json()) as {
      limit: number;
      windowMs: number;
    };

    const now = Date.now();
    const limit = Math.max(1, body.limit);
    const windowMs = Math.max(1_000, body.windowMs);
    const stored = (await this.state.storage.get<{
      count: number;
      resetAt: number;
    }>("bucket")) ?? { count: 0, resetAt: now + windowMs };

    let count = stored.count;
    let resetAt = stored.resetAt;

    if (now > resetAt) {
      count = 0;
      resetAt = now + windowMs;
    }

    if (count >= limit) {
      return Response.json(
        {
          allowed: false,
          retryAfterMs: resetAt - now,
          remaining: 0,
        },
        { status: 429 },
      );
    }

    count += 1;
    await this.state.storage.put("bucket", { count, resetAt });

    return Response.json({
      allowed: true,
      retryAfterMs: 0,
      remaining: Math.max(limit - count, 0),
      resetAt,
    });
  }
}
