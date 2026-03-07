"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { entries as defaultEntries, notifications as defaultNotifications, users } from "@/lib/mockData";
import { calcVariance } from "@/lib/format";
import { getPersistedState, savePersistedState, visibleEntries } from "@/lib/store";
import { ActivityEntry, AppNotification, AppUser, EntryStatus, Role, ThemeMode } from "@/lib/types";

type RegisterInput = {
  fullName: string;
  username: string;
  email: string;
  project: string;
};

type AppContextValue = {
  user: AppUser | null;
  theme: ThemeMode;
  language: "en" | "bn";
  entries: ActivityEntry[];
  notifications: AppNotification[];
  login: (username: string, password: string) => { ok: boolean; message?: string };
  register: (input: RegisterInput) => { ok: boolean; message?: string };
  logout: () => void;
  toggleTheme: () => void;
  toggleLanguage: () => void;
  addEntry: (entry: ActivityEntry) => void;
  updateEntryStatus: (id: string, status: EntryStatus) => void;
  markNotificationRead: (id: string) => void;
  unreadCount: number;
  visibleEntries: ActivityEntry[];
};

const SESSION_KEY = "praan_session_user";
const THEME_KEY = "praan_theme";
const LANGUAGE_KEY = "praan_lang";

const AppContext = createContext<AppContextValue | undefined>(undefined);

export const AppContextProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<AppUser | null>(null);
  const [theme, setTheme] = useState<ThemeMode>("light");
  const [language, setLanguage] = useState<"en" | "bn">("en");
  const [entries, setEntries] = useState<ActivityEntry[]>(defaultEntries);
  const [notifications, setNotifications] = useState<AppNotification[]>(defaultNotifications);

  useEffect(() => {
    const state = getPersistedState();
    setEntries(state.entries);
    setNotifications(state.notifications);

    const storedUsername = window.localStorage.getItem(SESSION_KEY);
    if (storedUsername) {
      const found = users.find((u) => u.username === storedUsername);
      if (found && found.active) setUser(found);
    }

    const storedTheme = window.localStorage.getItem(THEME_KEY) as ThemeMode | null;
    if (storedTheme === "dark" || storedTheme === "light") {
      setTheme(storedTheme);
    }

    const storedLang = window.localStorage.getItem(LANGUAGE_KEY);
    if (storedLang === "bn") setLanguage("bn");
  }, []);

  useEffect(() => {
    savePersistedState({ entries, notifications });
  }, [entries, notifications]);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    window.localStorage.setItem(THEME_KEY, theme);
  }, [theme]);

  useEffect(() => {
    document.documentElement.setAttribute("lang", language);
    window.localStorage.setItem(LANGUAGE_KEY, language);
  }, [language]);

  const login = (username: string, password: string) => {
    const found = users.find((item) => item.username.toLowerCase() === username.trim().toLowerCase());
    if (!found) return { ok: false, message: "User not found" };
    if (!found.active) return { ok: false, message: "Account is inactive" };
    if (password !== "123456") return { ok: false, message: "Invalid password (demo: 123456)" };

    setUser(found);
    window.localStorage.setItem(SESSION_KEY, found.username);
    return { ok: true };
  };

  const register = (input: RegisterInput) => {
    const exists = users.some((u) => u.username.toLowerCase() === input.username.toLowerCase());
    if (exists) return { ok: false, message: "Username already exists" };

    const newUser: AppUser = {
      fullName: input.fullName,
      username: input.username,
      email: input.email,
      role: "User",
      active: true,
      projects: [input.project]
    };

    users.push(newUser);
    setUser(newUser);
    window.localStorage.setItem(SESSION_KEY, newUser.username);
    return { ok: true };
  };

  const logout = () => {
    setUser(null);
    window.localStorage.removeItem(SESSION_KEY);
  };

  const toggleTheme = () => {
    setTheme((prev) => (prev === "light" ? "dark" : "light"));
  };

  const toggleLanguage = () => {
    setLanguage((prev) => (prev === "en" ? "bn" : "en"));
  };

  const addEntry = (entry: ActivityEntry) => {
    setEntries((prev) => [entry, ...prev]);
    setNotifications((prev) => [
      {
        id: `n-${Date.now()}`,
        title: "New Submission",
        summary: `${entry.uniqueId} submitted by ${entry.createdBy}`,
        at: new Date().toISOString(),
        unread: true,
        entryId: entry.uniqueId
      },
      ...prev
    ]);
  };

  const updateEntryStatus = (id: string, status: EntryStatus) => {
    setEntries((prev) =>
      prev.map((entry) => {
        if (entry.uniqueId !== id) return entry;
        const reviewedAt = status === "Reviewed" ? new Date().toISOString() : entry.reviewedAt;
        return {
          ...entry,
          status,
          reviewedAt,
          reviewedBy: status === "Reviewed" ? user?.username ?? "" : entry.reviewedBy,
          variance: calcVariance(entry.totalBudget, entry.totalExpenses)
        };
      })
    );
  };

  const markNotificationRead = (id: string) => {
    setNotifications((prev) => prev.map((item) => (item.id === id ? { ...item, unread: false } : item)));
  };

  const role: Role = user?.role ?? "User";
  const viewableEntries = useMemo(
    () => (user ? visibleEntries(entries, role, user.username) : []),
    [entries, role, user]
  );

  const unreadCount = notifications.filter((item) => item.unread).length;

  return (
    <AppContext.Provider
      value={{
        user,
        theme,
        language,
        entries,
        notifications,
        login,
        register,
        logout,
        toggleTheme,
        toggleLanguage,
        addEntry,
        updateEntryStatus,
        markNotificationRead,
        unreadCount,
        visibleEntries: viewableEntries
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error("useAppContext must be used inside AppContextProvider");
  return context;
};