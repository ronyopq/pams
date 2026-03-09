import type {
  Activity,
  FileAttachment,
  Followup,
  UserProfile,
  WorkPlan,
} from "@smart-work-tracker/shared-types";

type Row = Record<string, unknown>;

export function mapUser(row: Row): UserProfile {
  return {
    id: Number(row.id),
    name: String(row.name),
    email: String(row.email),
    designation: String(row.designation),
    department: String(row.department),
    supervisorId:
      row.supervisor_id === null || row.supervisor_id === undefined
        ? null
        : Number(row.supervisor_id),
    timezone: String(row.timezone ?? "UTC"),
  };
}

export function mapWorkPlan(row: Row): WorkPlan {
  return {
    id: Number(row.id),
    userId: Number(row.user_id),
    date: String(row.date),
    activity: String(row.activity),
    expectedOutput: String(row.expected_output),
    priority: String(row.priority) as WorkPlan["priority"],
    status: String(row.status) as WorkPlan["status"],
    category: String(row.category ?? "General"),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

export function mapActivity(row: Row): Activity {
  return {
    id: Number(row.id),
    userId: Number(row.user_id),
    workplanId:
      row.workplan_id === null || row.workplan_id === undefined
        ? null
        : Number(row.workplan_id),
    date: String(row.date),
    timeFromUtc: row.time_from_utc ? String(row.time_from_utc) : null,
    timeToUtc: row.time_to_utc ? String(row.time_to_utc) : null,
    durationMinutes: Number(row.duration_minutes ?? 0),
    taskDescription: String(row.task_description),
    output: String(row.output ?? ""),
    note: String(row.note ?? ""),
    delivery: String(row.delivery ?? ""),
    category: String(row.category ?? "General"),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

export function mapFollowup(row: Row): Followup {
  return {
    id: Number(row.id),
    activityId: Number(row.activity_id),
    person: String(row.person),
    followupDate: String(row.followup_date),
    note: String(row.note ?? ""),
    status: String(row.status) as Followup["status"],
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

export function mapFile(row: Row): FileAttachment {
  return {
    id: Number(row.id),
    activityId: Number(row.activity_id),
    userId: Number(row.user_id),
    r2Key: String(row.r2_key),
    originalName: String(row.original_name),
    mimeType: String(row.mime_type),
    sizeBytes: Number(row.size_bytes),
    createdAt: String(row.created_at),
  };
}
