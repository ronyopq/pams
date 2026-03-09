import { Hono } from "hono";
import type { AppBindings, JwtUserPayload } from "../types";
import {
  clearAuthCookies,
  hashPassword,
  issueAuthCookies,
  readRefreshCookie,
  verifyPassword,
  verifyToken,
} from "../utils/auth";
import { badRequest, unauthorized } from "../utils/http";
import { mapUser } from "../services/mappers";
import { loginSchema, registerSchema } from "../services/validators";
import { requireAuth } from "../middleware/auth";

export const authRoutes = new Hono<AppBindings>();

authRoutes.post("/register", async (c) => {
  const json = await c.req.json().catch(() => null);
  const parsed = registerSchema.safeParse(json);
  if (!parsed.success) {
    return badRequest("Invalid register payload", parsed.error.format());
  }

  const payload = parsed.data;
  const existing = await c.env.DB.prepare(
    "SELECT id FROM users WHERE email = ?1",
  )
    .bind(payload.email.toLowerCase())
    .first<{ id: number }>();
  if (existing?.id) return c.json({ error: "Email already registered" }, 409);

  let supervisorId: number | null = null;
  if (payload.supervisorEmail) {
    const supervisor = await c.env.DB.prepare(
      "SELECT id FROM users WHERE email = ?1",
    )
      .bind(payload.supervisorEmail.toLowerCase())
      .first<{ id: number }>();
    supervisorId = supervisor?.id ?? null;
  }

  const passwordHash = await hashPassword(payload.password);
  const insertResult = await c.env.DB.prepare(
    `INSERT INTO users (name, email, password_hash, designation, department, supervisor_id, timezone)
     VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)`,
  )
    .bind(
      payload.name,
      payload.email.toLowerCase(),
      passwordHash,
      payload.designation,
      payload.department,
      supervisorId,
      payload.timezone,
    )
    .run();

  const userId = Number((insertResult.meta as { last_row_id?: number }).last_row_id);
  const userRow = await c.env.DB.prepare(
    `SELECT id, name, email, designation, department, supervisor_id, timezone
     FROM users WHERE id = ?1`,
  )
    .bind(userId)
    .first<Record<string, unknown>>();

  if (!userRow) return c.json({ error: "Could not load created user" }, 500);

  const user = mapUser(userRow);
  const tokenMeta = await issueAuthCookies(c, {
    sub: String(user.id),
    email: user.email,
  });

  await c.env.DB.prepare(
    `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, metadata_json, ip_address)
     VALUES (?1, 'auth.register', 'users', ?2, ?3, ?4)`,
  )
    .bind(
      user.id,
      user.id,
      JSON.stringify({ email: user.email }),
      c.req.header("CF-Connecting-IP") ?? "0.0.0.0",
    )
    .run();

  return c.json({
    data: {
      user,
      accessTokenExpiresAt: tokenMeta.accessTokenExpiresAt,
    },
  });
});

authRoutes.post("/login", async (c) => {
  const json = await c.req.json().catch(() => null);
  const parsed = loginSchema.safeParse(json);
  if (!parsed.success) {
    return badRequest("Invalid login payload", parsed.error.format());
  }

  const payload = parsed.data;
  const userRow = await c.env.DB.prepare(
    `SELECT id, name, email, designation, department, supervisor_id, timezone, password_hash
     FROM users
     WHERE email = ?1`,
  )
    .bind(payload.email.toLowerCase())
    .first<Record<string, unknown> & { password_hash: string }>();

  if (!userRow) return unauthorized("Invalid email or password");
  const valid = await verifyPassword(payload.password, userRow.password_hash);
  if (!valid) return unauthorized("Invalid email or password");

  const user = mapUser(userRow);
  const tokenMeta = await issueAuthCookies(c, {
    sub: String(user.id),
    email: user.email,
  });

  await c.env.DB.prepare(
    `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, metadata_json, ip_address)
     VALUES (?1, 'auth.login', 'users', ?2, ?3, ?4)`,
  )
    .bind(
      user.id,
      user.id,
      JSON.stringify({ email: user.email }),
      c.req.header("CF-Connecting-IP") ?? "0.0.0.0",
    )
    .run();

  return c.json({
    data: {
      user,
      accessTokenExpiresAt: tokenMeta.accessTokenExpiresAt,
    },
  });
});

authRoutes.post("/refresh", async (c) => {
  const refresh = readRefreshCookie(c);
  if (!refresh) return unauthorized("Missing refresh token");

  try {
    const payload = await verifyToken<JwtUserPayload>(
      refresh,
      c.env.JWT_REFRESH_SECRET,
    );
    if (payload.type !== "refresh") return unauthorized("Invalid token type");

    const userRow = await c.env.DB.prepare(
      `SELECT id, name, email, designation, department, supervisor_id, timezone
       FROM users
       WHERE id = ?1`,
    )
      .bind(Number(payload.sub))
      .first<Record<string, unknown>>();
    if (!userRow) return unauthorized("User not found");

    const user = mapUser(userRow);
    const tokenMeta = await issueAuthCookies(c, {
      sub: String(user.id),
      email: user.email,
    });

    return c.json({
      data: {
        user,
        accessTokenExpiresAt: tokenMeta.accessTokenExpiresAt,
      },
    });
  } catch {
    return unauthorized("Invalid or expired refresh token");
  }
});

authRoutes.post("/logout", async (c) => {
  clearAuthCookies(c);
  return c.json({ data: { success: true } });
});

authRoutes.get("/me", requireAuth, async (c) => {
  const userId = Number(c.get("user").sub);
  const userRow = await c.env.DB.prepare(
    `SELECT id, name, email, designation, department, supervisor_id, timezone
     FROM users WHERE id = ?1`,
  )
    .bind(userId)
    .first<Record<string, unknown>>();

  if (!userRow) return unauthorized("User not found");
  return c.json({ data: mapUser(userRow) });
});
