import { Hono } from "hono";
import type { AppBindings } from "../types";
import { badRequest, forbidden, notFound } from "../utils/http";
import { mapActivity, mapWorkPlan } from "../services/mappers";
import { workPlanCreateSchema, workPlanUpdateSchema } from "../services/validators";
import { canReadUser, getCurrentUserId } from "../services/access";
import { logAudit } from "../utils/audit";

export const workPlanRoutes = new Hono<AppBindings>();

function parseCsvLine(line: string): string[] {
  const values: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      values.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  values.push(current.trim());
  return values;
}

workPlanRoutes.get("/export", async (c) => {
  const userId = getCurrentUserId(c);
  const month = c.req.query("month");

  const rows = await c.env.DB.prepare(
    `SELECT date, activity, expected_output, priority, status, category
     FROM work_plans
     WHERE user_id = ?1
       AND (?2 IS NULL OR strftime('%Y-%m', date) = ?2)
     ORDER BY date DESC`,
  )
    .bind(userId, month ?? null)
    .all<{
      date: string;
      activity: string;
      expected_output: string;
      priority: string;
      status: string;
      category: string;
    }>();

  const csvRows = [
    "date,activity,expected_output,priority,status,category",
    ...rows.results.map((row) =>
      [
        row.date,
        row.activity,
        row.expected_output,
        row.priority,
        row.status,
        row.category,
      ]
        .map((value) => `"${String(value).replaceAll('"', '""')}"`)
        .join(","),
    ),
  ];

  return new Response(csvRows.join("\n"), {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="work-plans-${month ?? "all"}.csv"`,
    },
  });
});

workPlanRoutes.post("/import", async (c) => {
  const userId = getCurrentUserId(c);
  const formData = await c.req.formData().catch(() => null);
  if (!formData) return badRequest("Invalid multipart form data");

  const file = formData.get("file");
  if (!(file instanceof File)) return badRequest("file is required");

  const text = await file.text();
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  if (lines.length < 2) {
    return badRequest("Import file must include headers and at least one data row");
  }

  const headers = parseCsvLine(lines[0] ?? "");
  const expected = [
    "date",
    "activity",
    "expected_output",
    "priority",
    "status",
    "category",
  ];
  if (headers.join(",").toLowerCase() !== expected.join(",")) {
    return badRequest(
      "Invalid template headers. Required: date,activity,expected_output,priority,status,category",
    );
  }

  let imported = 0;
  for (const line of lines.slice(1)) {
    const cols = parseCsvLine(line);
    if (cols.length !== expected.length) continue;
    const [date, activity, expectedOutput, priority, status, category] = cols;
    const parsed = workPlanCreateSchema.safeParse({
      date,
      activity,
      expectedOutput,
      priority,
      status,
      category,
    });
    if (!parsed.success) continue;

    await c.env.DB.prepare(
      `INSERT INTO work_plans
        (user_id, date, activity, expected_output, priority, status, category)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)`,
    )
      .bind(
        userId,
        parsed.data.date,
        parsed.data.activity,
        parsed.data.expectedOutput,
        parsed.data.priority,
        parsed.data.status,
        parsed.data.category,
      )
      .run();
    imported += 1;
  }

  await logAudit(c, "workplans.import", "work_plans", null, { imported });
  return c.json({ data: { imported } }, 201);
});

workPlanRoutes.get("/", async (c) => {
  const userId = getCurrentUserId(c);
  const month = c.req.query("month");
  const status = c.req.query("status");
  const priority = c.req.query("priority");
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
    conditions.push("wp.user_id = ?");
    values.push(targetUserId);
  } else {
    conditions.push(
      "(wp.user_id = ? OR wp.user_id IN (SELECT id FROM users WHERE supervisor_id = ?))",
    );
    values.push(userId, userId);
  }

  if (month) {
    conditions.push("strftime('%Y-%m', wp.date) = ?");
    values.push(month);
  }

  if (status) {
    conditions.push("wp.status = ?");
    values.push(status);
  }

  if (priority) {
    conditions.push("wp.priority = ?");
    values.push(priority);
  }

  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
  const rows = await c.env.DB.prepare(
    `SELECT wp.*
     FROM work_plans wp
     ${where}
     ORDER BY wp.date DESC, wp.id DESC`,
  )
    .bind(...values)
    .all<Record<string, unknown>>();

  return c.json({
    data: rows.results.map(mapWorkPlan),
  });
});

workPlanRoutes.post("/", async (c) => {
  const userId = getCurrentUserId(c);
  const body = await c.req.json().catch(() => null);
  const parsed = workPlanCreateSchema.safeParse(body);
  if (!parsed.success) {
    return badRequest("Invalid work plan payload", parsed.error.format());
  }

  const payload = parsed.data;
  const result = await c.env.DB.prepare(
    `INSERT INTO work_plans
      (user_id, date, activity, expected_output, priority, status, category)
     VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)`,
  )
    .bind(
      userId,
      payload.date,
      payload.activity,
      payload.expectedOutput,
      payload.priority,
      payload.status,
      payload.category,
    )
    .run();

  const id = Number((result.meta as { last_row_id?: number }).last_row_id);
  const row = await c.env.DB.prepare("SELECT * FROM work_plans WHERE id = ?1")
    .bind(id)
    .first<Record<string, unknown>>();
  if (!row) return c.json({ error: "Could not load created work plan" }, 500);

  await logAudit(c, "workplans.create", "work_plans", id, { date: payload.date });
  return c.json({ data: mapWorkPlan(row) }, 201);
});

workPlanRoutes.put("/:id", async (c) => {
  const workPlanId = Number(c.req.param("id"));
  if (!workPlanId) return badRequest("Invalid work plan id");
  const userId = getCurrentUserId(c);

  const existing = await c.env.DB.prepare("SELECT * FROM work_plans WHERE id = ?1")
    .bind(workPlanId)
    .first<Record<string, unknown>>();
  if (!existing) return notFound("Work plan not found");
  if (Number(existing.user_id) !== userId) {
    return forbidden("Only owner can edit a work plan");
  }

  const body = await c.req.json().catch(() => null);
  const parsed = workPlanUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return badRequest("Invalid work plan update payload", parsed.error.format());
  }

  const merged = {
    date: parsed.data.date ?? String(existing.date),
    activity: parsed.data.activity ?? String(existing.activity),
    expectedOutput: parsed.data.expectedOutput ?? String(existing.expected_output),
    priority: parsed.data.priority ?? String(existing.priority),
    status: parsed.data.status ?? String(existing.status),
    category: parsed.data.category ?? String(existing.category),
  };

  await c.env.DB.prepare(
    `UPDATE work_plans
     SET date = ?1, activity = ?2, expected_output = ?3, priority = ?4, status = ?5, category = ?6
     WHERE id = ?7`,
  )
    .bind(
      merged.date,
      merged.activity,
      merged.expectedOutput,
      merged.priority,
      merged.status,
      merged.category,
      workPlanId,
    )
    .run();

  const updated = await c.env.DB.prepare("SELECT * FROM work_plans WHERE id = ?1")
    .bind(workPlanId)
    .first<Record<string, unknown>>();

  if (!updated) return notFound("Updated work plan not found");
  await logAudit(c, "workplans.update", "work_plans", workPlanId, {});
  return c.json({ data: mapWorkPlan(updated) });
});

workPlanRoutes.delete("/:id", async (c) => {
  const workPlanId = Number(c.req.param("id"));
  if (!workPlanId) return badRequest("Invalid work plan id");
  const userId = getCurrentUserId(c);

  const existing = await c.env.DB.prepare(
    "SELECT id, user_id FROM work_plans WHERE id = ?1",
  )
    .bind(workPlanId)
    .first<{ id: number; user_id: number }>();

  if (!existing) return notFound("Work plan not found");
  if (existing.user_id !== userId) return forbidden("Only owner can delete");

  await c.env.DB.prepare("DELETE FROM work_plans WHERE id = ?1")
    .bind(workPlanId)
    .run();
  await logAudit(c, "workplans.delete", "work_plans", workPlanId, {});
  return c.json({ data: { success: true } });
});

workPlanRoutes.post("/:id/convert-to-activity", async (c) => {
  const workPlanId = Number(c.req.param("id"));
  if (!workPlanId) return badRequest("Invalid work plan id");
  const userId = getCurrentUserId(c);

  const workPlan = await c.env.DB.prepare("SELECT * FROM work_plans WHERE id = ?1")
    .bind(workPlanId)
    .first<Record<string, unknown>>();
  if (!workPlan) return notFound("Work plan not found");
  if (Number(workPlan.user_id) !== userId) {
    return forbidden("Only owner can convert a work plan");
  }

  const insert = await c.env.DB.prepare(
    `INSERT INTO activities
      (user_id, workplan_id, date, time_from_utc, time_to_utc, duration_minutes, task_description, output, note, delivery, category)
     VALUES (?1, ?2, ?3, NULL, NULL, 0, ?4, '', '', '', ?5)`,
  )
    .bind(
      userId,
      workPlanId,
      String(workPlan.date),
      String(workPlan.activity),
      String(workPlan.category ?? "General"),
    )
    .run();

  await c.env.DB.prepare(
    `UPDATE work_plans
     SET status = CASE WHEN status = 'planned' THEN 'in_progress' ELSE status END
     WHERE id = ?1`,
  )
    .bind(workPlanId)
    .run();

  const activityId = Number((insert.meta as { last_row_id?: number }).last_row_id);
  const activity = await c.env.DB.prepare("SELECT * FROM activities WHERE id = ?1")
    .bind(activityId)
    .first<Record<string, unknown>>();
  if (!activity) return c.json({ error: "Could not create activity" }, 500);

  await logAudit(c, "workplans.convert_to_activity", "work_plans", workPlanId, {
    activityId,
  });
  return c.json({ data: mapActivity(activity) }, 201);
});
