export type WorkPlanStatus = "planned" | "in_progress" | "done";
export type FollowupStatus = "pending" | "done";

export interface UserProfile {
  id: number;
  name: string;
  email: string;
  designation: string;
  department: string;
  supervisorId: number | null;
  timezone: string;
}

export interface AuthResponse {
  user: UserProfile;
  accessTokenExpiresAt: string;
}

export interface WorkPlan {
  id: number;
  userId: number;
  date: string;
  activity: string;
  expectedOutput: string;
  priority: "low" | "medium" | "high";
  status: WorkPlanStatus;
  category: string;
  createdAt: string;
  updatedAt: string;
}

export interface Activity {
  id: number;
  userId: number;
  date: string;
  timeFromUtc: string | null;
  timeToUtc: string | null;
  durationMinutes: number;
  taskDescription: string;
  output: string;
  note: string;
  delivery: string;
  category: string;
  workplanId: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface Followup {
  id: number;
  activityId: number;
  person: string;
  followupDate: string;
  note: string;
  status: FollowupStatus;
  createdAt: string;
  updatedAt: string;
  activity?: Activity;
}

export interface FileAttachment {
  id: number;
  activityId: number;
  userId: number;
  r2Key: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  createdAt: string;
}

export interface DashboardSummary {
  todayActivities: number;
  todayWorkPlans: number;
  pendingFollowups: number;
  totalHoursToday: number;
}

export interface DashboardCharts {
  monthlyHours: Array<{ month: string; totalHours: number }>;
  categoryDistribution: Array<{ category: string; totalHours: number }>;
}

export interface CalendarEvent {
  id: string;
  title: string;
  start: string;
  end?: string;
  allDay?: boolean;
  color: string;
  sourceType: "activity" | "workplan" | "followup";
  relatedId: number;
}

export interface MonthlyReportSummary {
  month: string;
  completedTasks: Array<{
    id: number;
    date: string;
    taskDescription: string;
    output: string;
    hours: number;
  }>;
  ongoingTasks: Array<{
    id: number;
    date: string;
    activity: string;
    status: WorkPlanStatus;
  }>;
  summary: {
    totalHours: number;
    totalActivities: number;
    categoryBreakdown: Array<{ category: string; totalHours: number }>;
  };
  exportUrl?: string;
}

export interface ApiListResponse<T> {
  data: T[];
}

export interface ApiSingleResponse<T> {
  data: T;
}
