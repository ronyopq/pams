/**
 * Seed SQL generator for SMART WORK TRACKER.
 * Usage:
 *   node --loader ts-node/esm scripts/seed.ts > seed.sql
 *   wrangler d1 execute smart-work-tracker-db --file=seed.sql
 */

const sql = `
INSERT INTO users (name, email, password_hash, designation, department, timezone)
VALUES
  ('Demo Manager', 'manager@example.com', '$2a$12$5uYw4Pc/x6FvWug3RMfE3el4nW6QMgLxQn7j0Vh0Pg/8KdN8lZm6m', 'Manager', 'Operations', 'Asia/Dhaka'),
  ('Demo User', 'user@example.com', '$2a$12$5uYw4Pc/x6FvWug3RMfE3el4nW6QMgLxQn7j0Vh0Pg/8KdN8lZm6m', 'Executive', 'Operations', 'Asia/Dhaka');

UPDATE users SET supervisor_id = (SELECT id FROM users WHERE email = 'manager@example.com')
WHERE email = 'user@example.com';

INSERT INTO work_plans (user_id, date, activity, expected_output, priority, status, category)
SELECT id, date('now'), 'Client onboarding', 'Onboarding checklist completed', 'high', 'in_progress', 'Operations'
FROM users WHERE email = 'user@example.com';
`;

console.log(sql.trim());
