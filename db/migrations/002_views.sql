CREATE VIEW IF NOT EXISTS vw_monthly_activity_summary AS
SELECT
  a.user_id AS user_id,
  strftime('%Y-%m', a.date) AS month,
  COUNT(a.id) AS total_activities,
  ROUND(SUM(a.duration_minutes) / 60.0, 2) AS total_hours,
  SUM(CASE WHEN wp.status = 'done' THEN 1 ELSE 0 END) AS completed_tasks,
  SUM(CASE WHEN wp.status IN ('planned', 'in_progress') THEN 1 ELSE 0 END) AS ongoing_tasks
FROM activities a
LEFT JOIN work_plans wp ON wp.id = a.workplan_id
GROUP BY a.user_id, strftime('%Y-%m', a.date);

CREATE VIEW IF NOT EXISTS vw_today_kpis AS
SELECT
  u.id AS user_id,
  date('now') AS today_utc,
  COALESCE((SELECT COUNT(*) FROM activities a WHERE a.user_id = u.id AND a.date = date('now')), 0) AS today_activities,
  COALESCE((SELECT COUNT(*) FROM work_plans wp WHERE wp.user_id = u.id AND wp.date = date('now')), 0) AS today_work_plans,
  COALESCE((
    SELECT COUNT(*)
    FROM followups f
    INNER JOIN activities a ON a.id = f.activity_id
    WHERE a.user_id = u.id AND f.status = 'pending'
  ), 0) AS pending_followups,
  COALESCE((
    SELECT ROUND(SUM(a.duration_minutes) / 60.0, 2)
    FROM activities a
    WHERE a.user_id = u.id AND a.date = date('now')
  ), 0) AS total_hours_today
FROM users u;
