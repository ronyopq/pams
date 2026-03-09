import { Hono } from "hono";
import type { AppBindings } from "../types";
import { badRequest, forbidden, notFound } from "../utils/http";
import { mapActivity } from "../services/mappers";
import { activityCreateSchema } from "../services/validators";
import { canReadUser, getCurrentUserId } from "../services/access";
import { logAudit } from "../utils/audit";

function durationInMinutes(fromIso: string, toIso: string): number {
  const from = new Date(fromIso).getTime();
  const to = new Date(toIso).getTime();
  const diff = Math.floor((to - from) / 60_000);
  return Math.max(0, diff);
}

export const activityRoutes = new Hono<AppBindings>();

activityRoutes.get("/", async (c) => {
  const userId = getCurrentUserId(c);
  const month = c.req.query("month");
  const requestedUserId = Number(c.req.query("userId")) || null;

  let targetUserId: number | null = null;
  if (requestedUserId) {
    const allowed = await canReadUser(c, userId, requestedUserId);
    if (!allowed) return forbidden("Not allowed to access requested user");
    targetUserId = requestedUserId;
  }

  const conditions: string[] = [];
  const values: unknown[] = [];

  if (targetUserId) {
    conditions.push("a.user_id = ?");
    values.push(targetUserId);
  } else {
    conditions.push(
      "(a.user_id = ? OR a.user_id IN (SELECT id FROM users WHERE supervisor_id = ?))",
    );
    values.push(userId, userId);
  }

  if (month) {
    conditions.push("strftime('%Y-%m', a.date) = ?");
    values.push(month);
  }

  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
  const rows = await c.env.DB.prepare(
    `SELECT a.*
     FROM activities a
     ${where}
     ORDER BY a.date DESC, a.id DESC`,
  )
    .bind(...values)
    .all<Record<string, unknown>>();

  return c.json({ data: rows.results.map(mapActivity) });
});

activityRoutes.post("/", async (c) => {
  const userId = getCurrentUserId(c);
  const body = await c.req.json().catch(() => null);
  const parsed = activityCreateSchema.safeParse(body);
  if (!parsed.success) {
    return badRequest("Invalid activity payload", parsed.error.format());
  }

  const payload = parsed.data;
  const minutes = durationInMinutes(payload.timeFromUtc, payload.timeToUtc);
  if (minutes <= 0) {
    return badRequest("timeToUtc must be later than timeFromUtc");
  }

  if (payload.workplanId) {
    const workPlan = await c.env.DB.prepare(
      "SELECT id, user_id FROM work_plans WHERE id = ?1",
    )
      .bind(payload.workplanId)
      .first<{ id: number; user_id: number }>();
    if (!workPlan) return notFound("Linked work plan not found");
    if (workPlan.user_id !== userId) {
      return forbidden("Cannot link to another user's work plan");
    }
  }

  const result = await c.env.DB.prepare(
    `INSERT INTO activities
      (user_id, workplan_id, date, time_from_utc, time_to_utc, duration_minutes, task_description, output, note, delivery, category)
     VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11)`,
  )
    .bind(
      userId,
      payload.workplanId ?? null,
      payload.date,
      payload.timeFromUtc,
      payload.timeToUtc,
      minutes,
      payload.taskDescription,
      payload.output,
      payload.note,
      payload.delivery,
      payload.category,
    )
    .run();

  const activityId = Number((result.meta as { last_row_id?: number }).last_row_id);
  const row = await c.env.DB.prepare("SELECT * FROM activities WHERE id = ?1")
    .bind(activityId)
    .first<Record<string, unknown>>();
  if (!row) return c.json({ error: "Could not load created activity" }, 500);

  await logAudit(c, "activities.create", "activities", activityId, {
    date: payload.date,
    durationMinutes: minutes,
  });
  return c.json({ data: mapActivity(row) }, 201);
});
