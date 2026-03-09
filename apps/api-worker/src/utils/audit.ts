import type { AppContext } from "../types";
import { getIpAddress } from "./http";

export async function logAudit(
  c: AppContext,
  action: string,
  entityType: string,
  entityId: number | null,
  metadata: Record<string, unknown> = {},
) {
  const user = c.get("user");
  const userId = Number(user?.sub ?? 0) || null;
  const ip = getIpAddress(c);

  await c.env.DB.prepare(
    `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, metadata_json, ip_address)
     VALUES (?1, ?2, ?3, ?4, ?5, ?6)`,
  )
    .bind(
      userId,
      action,
      entityType,
      entityId,
      JSON.stringify(metadata),
      ip,
    )
    .run();
}
