import { Hono } from "hono";
import type { AppBindings } from "../types";
import { badRequest, forbidden, notFound } from "../utils/http";
import { mapFollowup } from "../services/mappers";
import {
  followupCreateSchema,
  followupStatusUpdateSchema,
} from "../services/validators";
import { getCurrentUserId } from "../services/access";
import { logAudit } from "../utils/audit";

export const followupRoutes = new Hono<AppBindings>();

followupRoutes.get("/", async (c) => {
  const userId = getCurrentUserId(c);
  const status = c.req.query("status");
  const forToday = c.req.query("today") === "true";

  const values: unknown[] = [userId, userId];
  const filters: string[] = [
    "(a.user_id = ? OR a.user_id IN (SELECT id FROM users WHERE supervisor_id = ?))",
  ];

  if (status) {
    filters.push("f.status = ?");
    values.push(status);
  }
  if (forToday) {
    filters.push("date(f.followup_date) <= date('now')");
  }

  const rows = await c.env.DB.prepare(
    `SELECT f.*
     FROM followups f
     INNER JOIN activities a ON a.id = f.activity_id
     WHERE ${filters.join(" AND ")}
     ORDER BY f.followup_date ASC, f.id DESC`,
  )
    .bind(...values)
    .all<Record<string, unknown>>();

  return c.json({ data: rows.results.map(mapFollowup) });
});

followupRoutes.post("/", async (c) => {
  const userId = getCurrentUserId(c);
  const body = await c.req.json().catch(() => null);
  const parsed = followupCreateSchema.safeParse(body);
  if (!parsed.success) {
    return badRequest("Invalid followup payload", parsed.error.format());
  }

  const payload = parsed.data;
  const activity = await c.env.DB.prepare(
    "SELECT id, user_id FROM activities WHERE id = ?1",
  )
    .bind(payload.activityId)
    .first<{ id: number; user_id: number }>();
  if (!activity) return notFound("Activity not found");
  if (activity.user_id !== userId) {
    return forbidden("Only activity owner can create followups");
  }

  const result = await c.env.DB.prepare(
    `INSERT INTO followups (activity_id, person, followup_date, note, status)
     VALUES (?1, ?2, ?3, ?4, ?5)`,
  )
    .bind(
      payload.activityId,
      payload.person,
      payload.followupDate,
      payload.note,
      payload.status,
    )
    .run();

  const followupId = Number((result.meta as { last_row_id?: number }).last_row_id);
  const row = await c.env.DB.prepare("SELECT * FROM followups WHERE id = ?1")
    .bind(followupId)
    .first<Record<string, unknown>>();
  if (!row) return c.json({ error: "Could not load created followup" }, 500);

  await logAudit(c, "followups.create", "followups", followupId, {
    activityId: payload.activityId,
  });
  return c.json({ data: mapFollowup(row) }, 201);
});

followupRoutes.put("/:id/status", async (c) => {
  const userId = getCurrentUserId(c);
  const followupId = Number(c.req.param("id"));
  if (!followupId) return badRequest("Invalid followup id");

  const body = await c.req.json().catch(() => null);
  const parsed = followupStatusUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return badRequest("Invalid status payload", parsed.error.format());
  }

  const existing = await c.env.DB.prepare(
    `SELECT f.id, a.user_id
     FROM followups f
     INNER JOIN activities a ON a.id = f.activity_id
     WHERE f.id = ?1`,
  )
    .bind(followupId)
    .first<{ id: number; user_id: number }>();
  if (!existing) return notFound("Followup not found");
  if (existing.user_id !== userId) {
    return forbidden("Only activity owner can update followup status");
  }

  await c.env.DB.prepare("UPDATE followups SET status = ?1 WHERE id = ?2")
    .bind(parsed.data.status, followupId)
    .run();

  const updated = await c.env.DB.prepare("SELECT * FROM followups WHERE id = ?1")
    .bind(followupId)
    .first<Record<string, unknown>>();
  if (!updated) return notFound("Followup not found after update");

  await logAudit(c, "followups.status_update", "followups", followupId, {
    status: parsed.data.status,
  });
  return c.json({ data: mapFollowup(updated) });
});
