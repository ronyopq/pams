import type { AppContext } from "../types";

export function getIpAddress(c: AppContext): string {
  return (
    c.req.header("CF-Connecting-IP") ??
    c.req.header("X-Forwarded-For")?.split(",")[0]?.trim() ??
    "0.0.0.0"
  );
}

export function badRequest(message: string, details?: unknown) {
  return Response.json(
    {
      error: message,
      details,
    },
    { status: 400 },
  );
}

export function unauthorized(message = "Unauthorized") {
  return Response.json({ error: message }, { status: 401 });
}

export function forbidden(message = "Forbidden") {
  return Response.json({ error: message }, { status: 403 });
}

export function notFound(message = "Not found") {
  return Response.json({ error: message }, { status: 404 });
}
