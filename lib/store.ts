import { entries, notifications, users } from "@/lib/mockData";
import { ActivityEntry, AppNotification, AppUser, Role } from "@/lib/types";

const STORAGE_KEY = "praan_app_state_v1";

type PersistedState = {
  entries: ActivityEntry[];
  notifications: AppNotification[];
};

const hasWindow = typeof window !== "undefined";

const fallbackState: PersistedState = {
  entries,
  notifications
};

export const getPersistedState = (): PersistedState => {
  if (!hasWindow) return fallbackState;
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return fallbackState;
  try {
    const parsed = JSON.parse(raw) as PersistedState;
    return {
      entries: parsed.entries?.length ? parsed.entries : entries,
      notifications: parsed.notifications?.length ? parsed.notifications : notifications
    };
  } catch {
    return fallbackState;
  }
};

export const savePersistedState = (state: PersistedState) => {
  if (!hasWindow) return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
};

export const resolveUser = (username: string): AppUser | undefined =>
  users.find((u) => u.username.toLowerCase() === username.toLowerCase());

export const canViewEntry = (role: Role, username: string, entry: ActivityEntry) => {
  if (role === "Admin" || role === "Manager") return true;
  return entry.createdBy.toLowerCase() === username.toLowerCase();
};

export const visibleEntries = (allEntries: ActivityEntry[], role: Role, username: string) =>
  allEntries.filter((entry) => canViewEntry(role, username, entry));

export const countUnread = (items: AppNotification[]) => items.filter((item) => item.unread).length;