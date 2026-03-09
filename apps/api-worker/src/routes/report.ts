import { Hono } from "hono";
import type { Context } from "hono";
import type { MonthlyReportSummary } from "@smart-work-tracker/shared-types";
import type { AppBindings } from "../types";
import { getCurrentUserId } from "../services/access";
import {
  exportReportExcel,
  exportReportPdf,
  exportReportWord,
} from "../utils/report-export";

function currentMonthUtc() {
  return new Date().toISOString().slice(0, 7);
}

async function buildMonthlyReport(
  c: Context<AppBindings>,
  userId: number,
  month: string,
): Promise<MonthlyReportSummary> {
  const completedRows = await c.env.DB.prepare(
    `SELECT a.id, a.date, a.task_description, a.output, ROUND(a.duration_minutes / 60.0, 2) AS hours
     FROM activities a
     LEFT JOIN work_plans wp ON wp.id = a.workplan_id
     WHERE a.user_id = ?1
       AND strftime('%Y-%m', a.date) = ?2
       AND (wp.status = 'done' OR (wp.id IS NULL AND a.output <> ''))
     ORDER BY a.date DESC`,
  )
    .bind(userId, month)
    .all<{
      id: number;
      date: string;
      task_description: string;
      output: string;
      hours: number;
    }>();

  const ongoingRows = await c.env.DB.prepare(
    `SELECT id, date, activity, status
     FROM work_plans
     WHERE user_id = ?1
       AND strftime('%Y-%m', date) = ?2
       AND status IN ('planned', 'in_progress')
     ORDER BY date DESC`,
  )
    .bind(userId, month)
    .all<{ id: number; date: string; activity: string; status: "planned" | "in_progress" }>();

  const totals = await c.env.DB.prepare(
    `SELECT COUNT(*) AS total_activities, ROUND(SUM(duration_minutes) / 60.0, 2) AS total_hours
     FROM activities
     WHERE user_id = ?1
       AND strftime('%Y-%m', date) = ?2`,
  )
    .bind(userId, month)
    .first<{ total_activities: number; total_hours: number }>();

  const categoryRows = await c.env.DB.prepare(
    `SELECT category, ROUND(SUM(duration_minutes) / 60.0, 2) AS total_hours
     FROM activities
     WHERE user_id = ?1
       AND strftime('%Y-%m', date) = ?2
     GROUP BY category
     ORDER BY total_hours DESC`,
  )
    .bind(userId, month)
    .all<{ category: string; total_hours: number }>();

  return {
    month,
    completedTasks: completedRows.results.map((row) => ({
      id: row.id,
      date: row.date,
      taskDescription: row.task_description,
      output: row.output,
      hours: Number(row.hours ?? 0),
    })),
    ongoingTasks: ongoingRows.results.map((row) => ({
      id: row.id,
      date: row.date,
      activity: row.activity,
      status: row.status,
    })),
    summary: {
      totalHours: Number(totals?.total_hours ?? 0),
      totalActivities: Number(totals?.total_activities ?? 0),
      categoryBreakdown: categoryRows.results.map((row) => ({
        category: row.category,
        totalHours: Number(row.total_hours ?? 0),
      })),
    },
  };
}

export const reportRoutes = new Hono<AppBindings>();

reportRoutes.get("/monthly", async (c) => {
  const userId = getCurrentUserId(c);
  const month = c.req.query("month") ?? currentMonthUtc();
  const format = (c.req.query("format") ?? "json").toLowerCase();

  const report = await buildMonthlyReport(c, userId, month);
  if (format === "json") {
    return c.json({ data: report });
  }

  if (format === "pdf") {
    const bytes = await exportReportPdf(report);
    return new Response(bytes, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="monthly-report-${month}.pdf"`,
      },
    });
  }

  if (format === "word") {
    const bytes = exportReportWord(report);
    return new Response(bytes, {
      headers: {
        "Content-Type": "application/msword",
        "Content-Disposition": `attachment; filename="monthly-report-${month}.doc"`,
      },
    });
  }

  if (format === "excel") {
    const bytes = exportReportExcel(report);
    return new Response(bytes, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="monthly-report-${month}.csv"`,
      },
    });
  }

  return c.json({ error: "Unsupported format. Use json/pdf/word/excel" }, 400);
});
