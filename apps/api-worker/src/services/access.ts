import type { AppContext } from "../types";

export function getCurrentUserId(c: AppContext): number {
  return Number(c.get("user").sub);
}

export async function canReadUser(
  c: AppContext,
  viewerUserId: number,
  targetUserId: number,
): Promise<boolean> {
  if (viewerUserId === targetUserId) return true;
  const result = await c.env.DB.prepare(
    "SELECT id FROM users WHERE id = ?1 AND supervisor_id = ?2",
  )
    .bind(targetUserId, viewerUserId)
    .first<{ id: number }>();
  return Boolean(result?.id);
}

export async function resolveReadableTargetUser(
  c: AppContext,
  requestedUserId: number | null,
): Promise<number | null> {
  const viewer = getCurrentUserId(c);
  if (!requestedUserId) return null;
  return (await canReadUser(c, viewer, requestedUserId)) ? requestedUserId : null;
}
