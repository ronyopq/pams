import type {
  Activity,
  AuthResponse,
  CalendarEvent,
  DashboardCharts,
  DashboardSummary,
  FileAttachment,
  Followup,
  MonthlyReportSummary,
  UserProfile,
  WorkPlan
} from "@smart-work-tracker/shared-types";
import { API_BASE_URL } from "./config";

type HttpMethod = "GET" | "POST" | "PUT" | "DELETE";

async function request<T>(
  path: string,
  method: HttpMethod = "GET",
  body?: unknown,
): Promise<T> {
  const init: RequestInit = {
    method,
    credentials: "include"
  };
  if (body !== undefined) {
    init.headers = { "Content-Type": "application/json" };
    init.body = JSON.stringify(body);
  }
  const response = await fetch(`${API_BASE_URL}${path}`, init);

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: "Request failed" }));
    throw new Error(error.error ?? `HTTP ${response.status}`);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const payload = (await response.json()) as { data: T };
  return payload.data;
}

export async function download(path: string): Promise<Blob> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: "GET",
    credentials: "include"
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: "Download failed" }));
    throw new Error(error.error ?? "Download failed");
  }
  return response.blob();
}

export async function uploadForm<T>(path: string, formData: FormData): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: "POST",
    credentials: "include",
    body: formData
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: "Upload failed" }));
    throw new Error(error.error ?? "Upload failed");
  }
  const payload = (await response.json()) as { data: T };
  return payload.data;
}

export const api = {
  register: (payload: {
    name: string;
    email: string;
    password: string;
    designation: string;
    department: string;
    supervisorEmail?: string;
    timezone?: string;
  }) => request<AuthResponse>("/api/auth/register", "POST", payload),
  login: (payload: { email: string; password: string }) =>
    request<AuthResponse>("/api/auth/login", "POST", payload),
  logout: () => request<{ success: boolean }>("/api/auth/logout", "POST"),
  me: () => request<UserProfile>("/api/auth/me"),
  refresh: () => request<AuthResponse>("/api/auth/refresh", "POST"),
  getDashboardSummary: () => request<DashboardSummary>("/api/dashboard/summary"),
  getDashboardCharts: () => request<DashboardCharts>("/api/dashboard/charts"),
  getWorkPlans: (query = "") => request<WorkPlan[]>(`/api/workplans${query}`),
  createWorkPlan: (payload: Omit<WorkPlan, "id" | "userId" | "createdAt" | "updatedAt">) =>
    request<WorkPlan>("/api/workplans", "POST", payload),
  importWorkPlans: async (file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    return uploadForm<{ imported: number }>("/api/workplans/import", formData);
  },
  exportWorkPlans: (month?: string) =>
    download(`/api/workplans/export${month ? `?month=${encodeURIComponent(month)}` : ""}`),
  updateWorkPlan: (
    id: number,
    payload: Partial<Omit<WorkPlan, "id" | "userId" | "createdAt" | "updatedAt">>,
  ) => request<WorkPlan>(`/api/workplans/${id}`, "PUT", payload),
  deleteWorkPlan: (id: number) =>
    request<{ success: boolean }>(`/api/workplans/${id}`, "DELETE"),
  convertWorkPlanToActivity: (id: number) =>
    request<Activity>(`/api/workplans/${id}/convert-to-activity`, "POST"),
  getActivities: (query = "") => request<Activity[]>(`/api/activities${query}`),
  createActivity: (payload: {
    date: string;
    timeFromUtc: string;
    timeToUtc: string;
    taskDescription: string;
    output?: string;
    note?: string;
    delivery?: string;
    category?: string;
    workplanId?: number | null;
  }) => request<Activity>("/api/activities", "POST", payload),
  getFollowups: (query = "") => request<Followup[]>(`/api/followups${query}`),
  createFollowup: (payload: {
    activityId: number;
    person: string;
    followupDate: string;
    note?: string;
    status?: "pending" | "done";
  }) => request<Followup>("/api/followups", "POST", payload),
  updateFollowupStatus: (id: number, status: "pending" | "done") =>
    request<Followup>(`/api/followups/${id}/status`, "PUT", { status }),
  getCalendarEvents: (query = "") =>
    request<CalendarEvent[]>(`/api/calendar/events${query}`),
  getReportMonthly: (month?: string) =>
    request<MonthlyReportSummary>(
      `/api/report/monthly${month ? `?month=${encodeURIComponent(month)}` : ""}`,
    ),
  exportReport: (format: "pdf" | "word" | "excel", month?: string) =>
    download(
      `/api/report/monthly?format=${format}${month ? `&month=${encodeURIComponent(month)}` : ""}`,
    ),
  listFiles: (query = "") => request<FileAttachment[]>(`/api/files${query}`),
  getSignedFileUrl: (fileId: number) =>
    request<{ url: string; expiresInSeconds: number }>(`/api/files/${fileId}/signed-url`),
  uploadAttachment: (activityId: number, file: File) => {
    const formData = new FormData();
    formData.append("activityId", String(activityId));
    formData.append("file", file);
    return uploadForm<FileAttachment>("/api/upload", formData);
  }
};
