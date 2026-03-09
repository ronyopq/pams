import { Hono } from "hono";
import type { CalendarEvent } from "@smart-work-tracker/shared-types";
import type { AppBindings } from "../types";
import { canReadUser, getCurrentUserId } from "../services/access";
import { forbidden } from "../utils/http";

export const calendarRoutes = new Hono<AppBindings>();

calendarRoutes.get("/events", async (c) => {
  const viewerId = getCurrentUserId(c);
  const start = c.req.query("start") ?? new Date().toISOString();
  const end =
    c.req.query("end") ??
    new Date(Date.now() + 31 * 24 * 60 * 60 * 1000).toISOString();
  const requestedUserId = Number(c.req.query("userId")) || null;

  let userFilterSql = "(user_id = ? OR user_id IN (SELECT id FROM users WHERE supervisor_id = ?))";
  let params: unknown[] = [viewerId, viewerId];
  if (requestedUserId) {
    const allowed = await canReadUser(c, viewerId, requestedUserId);
    if (!allowed) return forbidden("Not allowed to access requested user");
    userFilterSql = "user_id = ?";
    params = [requestedUserId];
  }

  const activityRows = await c.env.DB.prepare(
    `SELECT id, task_description, date, time_from_utc, time_to_utc
     FROM activities
     WHERE ${userFilterSql}
       AND date BETWEEN date(?${params.length + 1}) AND date(?${params.length + 2})`,
  )
    .bind(...params, start, end)
    .all<{
      id: number;
      task_description: string;
      date: string;
      time_from_utc: string | null;
      time_to_utc: string | null;
    }>();

  const workPlanRows = await c.env.DB.prepare(
    `SELECT id, activity, date
     FROM work_plans
     WHERE ${userFilterSql}
       AND date BETWEEN date(?${params.length + 1}) AND date(?${params.length + 2})`,
  )
    .bind(...params, start, end)
    .all<{ id: number; activity: string; date: string }>();

  const followupRows = await c.env.DB.prepare(
    `SELECT f.id, f.note, f.followup_date
     FROM followups f
     INNER JOIN activities a ON a.id = f.activity_id
     WHERE (${userFilterSql.replaceAll("user_id", "a.user_id")})
       AND date(f.followup_date) BETWEEN date(?${params.length + 1}) AND date(?${params.length + 2})`,
  )
    .bind(...params, start, end)
    .all<{ id: number; note: string; followup_date: string }>();

  const events: CalendarEvent[] = [
    ...activityRows.results.map((row) => {
      const event: CalendarEvent = {
        id: `activity-${row.id}`,
        title: row.task_description,
        start: row.time_from_utc ?? `${row.date}T09:00:00.000Z`,
        color: "#2563EB",
        sourceType: "activity",
        relatedId: row.id,
      };
      if (row.time_to_utc) event.end = row.time_to_utc;
      return event;
    }),
    ...workPlanRows.results.map((row) => ({
      id: `workplan-${row.id}`,
      title: row.activity,
      start: `${row.date}T00:00:00.000Z`,
      allDay: true,
      color: "#16A34A",
      sourceType: "workplan" as const,
      relatedId: row.id,
    })),
    ...followupRows.results.map((row) => ({
      id: `followup-${row.id}`,
      title: row.note || "Follow-up reminder",
      start: row.followup_date,
      color: "#DC2626",
      sourceType: "followup" as const,
      relatedId: row.id,
    })),
  ];

  return c.json({ data: events });
});
