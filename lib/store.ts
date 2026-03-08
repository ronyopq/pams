import {
  entries as defaultEntries,
  implementedByOptions as defaultImplementedByOptions,
  locations as defaultLocations,
  notifications as defaultNotifications,
  orgSettings as defaultOrgSettings,
  projectActivityMap as defaultProjectMap,
  reportSettings as defaultReportSettings,
  users as defaultUsers,
  venueOptions as defaultVenueOptions
} from "@/lib/mockData";
import {
  ActivityEntry,
  AppNotification,
  AppUser,
  LocationMap,
  OrgSettings,
  ProjectActivityMap,
  ReportSettings,
  Role
} from "@/lib/types";

const STORAGE_KEY = "praan_app_state_v2";
const LEGACY_STORAGE_KEY = "praan_app_state_v1";

export type PersistedState = {
  entries: ActivityEntry[];
  notifications: AppNotification[];
  users: AppUser[];
  projectMap: ProjectActivityMap[];
  locationMap: LocationMap[];
  implementedByOptions: string[];
  venueOptions: string[];
  orgSettings: OrgSettings;
  reportSettings: ReportSettings;
};

const hasWindow = typeof window !== "undefined";

const cloneProjectMap = (map: ProjectActivityMap[]): ProjectActivityMap[] =>
  map.map((item) => ({
    project: item.project,
    activities: item.activities.map((activity) => ({ ...activity })),
    participantCategories: item.participantCategories.map((category) => ({ ...category }))
  }));

const cloneLocationMap = (map: LocationMap[]): LocationMap[] =>
  map.map((item) => ({
    district: item.district,
    upazilas: item.upazilas.map((upazila) => ({
      name: upazila.name,
      unions: [...upazila.unions]
    }))
  }));

const cloneUsers = (list: AppUser[]): AppUser[] =>
  list.map((item) => ({
    ...item,
    projects: [...item.projects]
  }));

const cloneOrgSettings = (settings: OrgSettings): OrgSettings => ({
  orgName: settings.orgName,
  logoUrl: settings.logoUrl
});

const cloneReportSettings = (settings: ReportSettings): ReportSettings => ({
  defaultTheme: settings.defaultTheme,
  templateName: settings.templateName,
  enableDocx: settings.enableDocx,
  enablePdf: settings.enablePdf,
  enableCsv: settings.enableCsv,
  enableZip: settings.enableZip,
  printSetup: {
    preset: settings.printSetup.preset,
    pageSize: settings.printSetup.pageSize,
    orientation: settings.printSetup.orientation,
    header: settings.printSetup.header,
    footer: settings.printSetup.footer
  }
});

const fallbackState = (): PersistedState => ({
  entries: defaultEntries.map((entry) => ({ ...entry })),
  notifications: defaultNotifications.map((note) => ({ ...note })),
  users: cloneUsers(defaultUsers),
  projectMap: cloneProjectMap(defaultProjectMap),
  locationMap: cloneLocationMap(defaultLocations),
  implementedByOptions: [...defaultImplementedByOptions],
  venueOptions: [...defaultVenueOptions],
  orgSettings: cloneOrgSettings(defaultOrgSettings),
  reportSettings: cloneReportSettings(defaultReportSettings)
});

const parseReportSettings = (input: unknown, base: ReportSettings): ReportSettings => {
  if (!input || typeof input !== "object") return base;
  const value = input as Partial<ReportSettings>;
  const printSetup = (value.printSetup ?? {}) as Partial<ReportSettings["printSetup"]>;
  return {
    defaultTheme: value.defaultTheme || base.defaultTheme,
    templateName: value.templateName || base.templateName,
    enableDocx: value.enableDocx ?? base.enableDocx,
    enablePdf: value.enablePdf ?? base.enablePdf,
    enableCsv: value.enableCsv ?? base.enableCsv,
    enableZip: value.enableZip ?? base.enableZip,
    printSetup: {
      preset: printSetup.preset || base.printSetup.preset,
      pageSize: printSetup.pageSize || base.printSetup.pageSize,
      orientation: printSetup.orientation === "Landscape" ? "Landscape" : "Portrait",
      header: printSetup.header || base.printSetup.header,
      footer: printSetup.footer || base.printSetup.footer
    }
  };
};

export const getPersistedState = (): PersistedState => {
  const fallback = fallbackState();
  if (!hasWindow) return fallback;
  const raw = window.localStorage.getItem(STORAGE_KEY);
  const legacyRaw = window.localStorage.getItem(LEGACY_STORAGE_KEY);
  if (!raw && !legacyRaw) return fallback;

  try {
    const parsed = JSON.parse(raw || legacyRaw || "{}") as Partial<PersistedState>;
    return {
      entries: parsed.entries?.length ? parsed.entries : fallback.entries,
      notifications: parsed.notifications?.length ? parsed.notifications : fallback.notifications,
      users: Array.isArray(parsed.users) && parsed.users.length ? cloneUsers(parsed.users) : fallback.users,
      projectMap:
        Array.isArray(parsed.projectMap) && parsed.projectMap.length
          ? cloneProjectMap(parsed.projectMap)
          : fallback.projectMap,
      locationMap:
        Array.isArray(parsed.locationMap) && parsed.locationMap.length
          ? cloneLocationMap(parsed.locationMap)
          : fallback.locationMap,
      implementedByOptions:
        Array.isArray(parsed.implementedByOptions) && parsed.implementedByOptions.length
          ? [...parsed.implementedByOptions]
          : fallback.implementedByOptions,
      venueOptions:
        Array.isArray(parsed.venueOptions) && parsed.venueOptions.length
          ? [...parsed.venueOptions]
          : fallback.venueOptions,
      orgSettings:
        parsed.orgSettings && parsed.orgSettings.orgName && parsed.orgSettings.logoUrl
          ? cloneOrgSettings(parsed.orgSettings)
          : fallback.orgSettings,
      reportSettings: parseReportSettings(parsed.reportSettings, fallback.reportSettings)
    };
  } catch {
    return fallback;
  }
};

export const savePersistedState = (state: PersistedState) => {
  if (!hasWindow) return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
};

export const canViewEntry = (role: Role, username: string, entry: ActivityEntry) => {
  if (role === "Admin" || role === "Manager") return true;
  return entry.createdBy.toLowerCase() === username.toLowerCase();
};

export const visibleEntries = (allEntries: ActivityEntry[], role: Role, username: string) =>
  allEntries.filter((entry) => canViewEntry(role, username, entry));

export const countUnread = (items: AppNotification[]) => items.filter((item) => item.unread).length;
