import type { MiddlewareHandler } from "hono";
import type { AppBindings, JwtUserPayload } from "../types";
import { readAccessCookie, verifyToken } from "../utils/auth";
import { unauthorized } from "../utils/http";

export const requireAuth: MiddlewareHandler<AppBindings> = async (c, next) => {
  const token = readAccessCookie(c);
  if (!token) return unauthorized("Missing access token");

  try {
    const payload = await verifyToken<JwtUserPayload>(
      token,
      c.env.JWT_ACCESS_SECRET,
    );
    if (payload.type !== "access") {
      return unauthorized("Invalid token type");
    }
    c.set("user", {
      sub: String(payload.sub),
      email: String(payload.email),
      type: "access",
    });
    await next();
  } catch {
    return unauthorized("Invalid or expired token");
  }
};
