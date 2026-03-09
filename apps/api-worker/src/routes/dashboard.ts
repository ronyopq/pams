import { Hono } from "hono";
import type { AppBindings } from "../types";
import { getCurrentUserId } from "../services/access";

export const dashboardRoutes = new Hono<AppBindings>();

dashboardRoutes.get("/summary", async (c) => {
  const userId = getCurrentUserId(c);
  const row = await c.env.DB.prepare(
    `SELECT today_activities, today_work_plans, pending_followups, total_hours_today
     FROM vw_today_kpis
     WHERE user_id = ?1`,
  )
    .bind(userId)
    .first<{
      today_activities: number;
      today_work_plans: number;
      pending_followups: number;
      total_hours_today: number;
    }>();

  return c.json({
    data: {
      todayActivities: Number(row?.today_activities ?? 0),
      todayWorkPlans: Number(row?.today_work_plans ?? 0),
      pendingFollowups: Number(row?.pending_followups ?? 0),
      totalHoursToday: Number(row?.total_hours_today ?? 0),
    },
  });
});

dashboardRoutes.get("/charts", async (c) => {
  const userId = getCurrentUserId(c);

  const monthlyRows = await c.env.DB.prepare(
    `SELECT month, total_hours
     FROM vw_monthly_activity_summary
     WHERE user_id = ?1
     ORDER BY month DESC
     LIMIT 12`,
  )
    .bind(userId)
    .all<{ month: string; total_hours: number }>();

  const categoryRows = await c.env.DB.prepare(
    `SELECT category, ROUND(SUM(duration_minutes) / 60.0, 2) AS total_hours
     FROM activities
     WHERE user_id = ?1
       AND strftime('%Y-%m', date) = strftime('%Y-%m', 'now')
     GROUP BY category
     ORDER BY total_hours DESC`,
  )
    .bind(userId)
    .all<{ category: string; total_hours: number }>();

  return c.json({
    data: {
      monthlyHours: monthlyRows.results
        .map((row) => ({
          month: row.month,
          totalHours: Number(row.total_hours),
        }))
        .reverse(),
      categoryDistribution: categoryRows.results.map((row) => ({
        category: row.category,
        totalHours: Number(row.total_hours),
      })),
    },
  });
});
