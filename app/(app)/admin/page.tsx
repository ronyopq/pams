"use client";

import { useEffect, useMemo, useState } from "react";
import { useAppContext } from "@/components/providers/app-context";
import { AppUser, LocationMap, ProjectActivityMap, ThemeMode } from "@/lib/types";

type Tab = "org" | "projects" | "locations" | "participants" | "reports" | "users" | "themes";
type Loc = { district: string; upazilas: string; unions: string };
type UserForm = {
  fullName: string;
  username: string;
  email: string;
  role: AppUser["role"];
  active: boolean;
  projects: string[];
};

const cloneProjects = (projectMap: ProjectActivityMap[]): ProjectActivityMap[] =>
  projectMap.map((p) => ({
    project: p.project,
    activities: p.activities.map((a) => ({ ...a })),
    participantCategories: p.participantCategories.map((c) => ({ ...c }))
  }));

const locRows = (locationMap: LocationMap[]): Loc[] =>
  locationMap.map((l) => ({
    district: l.district,
    upazilas: l.upazilas.map((u) => u.name).join(", "),
    unions: l.upazilas.flatMap((u) => u.unions).join(", ")
  }));

const rowsToLocationMap = (rows: Loc[]): LocationMap[] =>
  rows
    .filter((row) => row.district.trim())
    .map((row) => {
      const upazilas = row.upazilas
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);
      const unions = row.unions
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);
      const normalizedUpazilas = upazilas.length ? upazilas : ["General Upazila"];
      const normalizedUnions = unions.length ? unions : ["General Union"];
      return {
        district: row.district.trim(),
        upazilas: normalizedUpazilas.map((name) => ({ name, unions: [...normalizedUnions] }))
      };
    });

const themeOptions: Array<{ value: ThemeMode; label: string }> = [
  { value: "corporate-light", label: "Corporate Light" },
  { value: "corporate-dark", label: "Corporate Dark" },
  { value: "emerald", label: "Emerald" },
  { value: "violet", label: "Violet" },
  { value: "sunset", label: "Sunset" },
  { value: "mono", label: "Monochrome" }
];

const emptyUser: UserForm = { fullName: "", username: "", email: "", role: "User", active: true, projects: [] };

const exportDemoDocx = () => {
  const text = "PRAAN Demo DOCX Template\\n\\nTitle:\\nProject:\\nActivity:\\nParticipants:\\nFinancial:\\nNotes:";
  const blob = new Blob([text], { type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "praan-demo-template.docx";
  a.click();
  URL.revokeObjectURL(url);
};

export default function AdminPage() {
  const {
    user,
    theme,
    setTheme,
    users: appUsers,
    setUsers: setAppUsers,
    projectMap: appProjectMap,
    setProjectMap: setAppProjectMap,
    locationMap: appLocationMap,
    setLocationMap: setAppLocationMap,
    orgSettings,
    setOrgSettings,
    reportSettings,
    setReportSettings
  } = useAppContext();
  const [tab, setTab] = useState<Tab>("org");
  const [orgName, setOrgName] = useState(orgSettings.orgName);
  const [logoUrl, setLogoUrl] = useState(orgSettings.logoUrl);
  const [projects, setProjects] = useState<ProjectActivityMap[]>(cloneProjects(appProjectMap));
  const [projectIdx, setProjectIdx] = useState(0);
  const [loc, setLoc] = useState<Loc[]>(locRows(appLocationMap));
  const [tpl, setTpl] = useState(reportSettings.templateName);
  const [reportTheme, setReportTheme] = useState(reportSettings.defaultTheme);
  const [printPreset, setPrintPreset] = useState(reportSettings.printSetup.preset);
  const [printSize, setPrintSize] = useState(reportSettings.printSetup.pageSize);
  const [printOrientation, setPrintOrientation] = useState(reportSettings.printSetup.orientation);
  const [header, setHeader] = useState(reportSettings.printSetup.header);
  const [footer, setFooter] = useState(reportSettings.printSetup.footer);
  const [docx, setDocx] = useState(reportSettings.enableDocx);
  const [pdf, setPdf] = useState(reportSettings.enablePdf);
  const [csv, setCsv] = useState(reportSettings.enableCsv);
  const [zip, setZip] = useState(reportSettings.enableZip);
  const [users, setUsers] = useState<AppUser[]>(appUsers.map((item) => ({ ...item, projects: [...item.projects] })));
  const [editUser, setEditUser] = useState<string | null>(null);
  const [userForm, setUserForm] = useState<UserForm>(emptyUser);
  const [newProject, setNewProject] = useState("");
  const [newActivity, setNewActivity] = useState("");
  const [newCode, setNewCode] = useState("");
  const [newType, setNewType] = useState("Training");
  const [newCategory, setNewCategory] = useState("");

  const currentProject = projects[projectIdx] ?? projects[0];
  const projectNames = useMemo(() => projects.map((p) => p.project), [projects]);

  useEffect(() => {
    setOrgName(orgSettings.orgName);
    setLogoUrl(orgSettings.logoUrl);
  }, [orgSettings]);

  useEffect(() => {
    setProjects(cloneProjects(appProjectMap));
  }, [appProjectMap]);

  useEffect(() => {
    setLoc(locRows(appLocationMap));
  }, [appLocationMap]);

  useEffect(() => {
    setUsers(appUsers.map((item) => ({ ...item, projects: [...item.projects] })));
  }, [appUsers]);

  useEffect(() => {
    if (projectIdx >= projects.length) setProjectIdx(0);
  }, [projectIdx, projects.length]);

  useEffect(() => {
    setTpl(reportSettings.templateName);
    setReportTheme(reportSettings.defaultTheme);
    setPrintPreset(reportSettings.printSetup.preset);
    setPrintSize(reportSettings.printSetup.pageSize);
    setPrintOrientation(reportSettings.printSetup.orientation);
    setHeader(reportSettings.printSetup.header);
    setFooter(reportSettings.printSetup.footer);
    setDocx(reportSettings.enableDocx);
    setPdf(reportSettings.enablePdf);
    setCsv(reportSettings.enableCsv);
    setZip(reportSettings.enableZip);
  }, [reportSettings]);

  if (user?.role !== "Admin") {
    return (
      <section className="panel-card">
        <h1 className="page-title h3 mb-2">Settings</h1>
        <p className="mb-0 text-muted">Only Admin users can access this workspace.</p>
      </section>
    );
  }

  const persistOrganization = () => {
    setOrgSettings({
      orgName: orgName.trim() || "PRAAN",
      logoUrl: logoUrl.trim() || "/logo.svg"
    });
  };

  const persistProjects = () => {
    setAppProjectMap(cloneProjects(projects));
  };

  const persistLocations = () => {
    const mapped = rowsToLocationMap(loc);
    if (!mapped.length) return;
    setAppLocationMap(mapped);
  };

  const persistReports = () => {
    setReportSettings({
      defaultTheme: reportTheme,
      templateName: tpl || "praan-demo-template.docx",
      enableDocx: docx,
      enablePdf: pdf,
      enableCsv: csv,
      enableZip: zip,
      printSetup: {
        preset: printPreset,
        pageSize: printSize,
        orientation: printOrientation === "Landscape" ? "Landscape" : "Portrait",
        header,
        footer
      }
    });
  };

  const persistUsers = () => {
    const nextUsers = users.map((item) => ({
      ...item,
      projects: item.role === "Admin" ? projectNames : item.projects
    }));
    setAppUsers(nextUsers);
  };

  const saveAll = () => {
    persistOrganization();
    persistProjects();
    persistLocations();
    persistReports();
    persistUsers();
    window.alert("Settings saved successfully");
  };
  const addProject = () => {
    const name = newProject.trim();
    if (!name) return;
    if (projects.some((p) => p.project.toLowerCase() === name.toLowerCase())) return;
    setProjects((prev) => [...prev, { project: name, activities: [], participantCategories: [] }]);
    setNewProject("");
  };
  const addActivity = () => {
    if (!currentProject || !newActivity.trim() || !newCode.trim()) return;
    setProjects((prev) =>
      prev.map((p, i) =>
        i === projectIdx ? { ...p, activities: [...p.activities, { name: newActivity.trim(), code: newCode.trim(), type: newType }] } : p
      )
    );
    setNewActivity("");
    setNewCode("");
  };
  const addCategory = () => {
    const label = newCategory.trim();
    if (!label || !currentProject) return;
    const key = label.toLowerCase().replace(/[^a-z0-9]+/g, "_");
    setProjects((prev) => prev.map((p, i) => (i === projectIdx ? { ...p, participantCategories: [...p.participantCategories, { key, label }] } : p)));
    setNewCategory("");
  };
  const upsertUser = () => {
    if (!userForm.fullName || !userForm.username || !userForm.email) return;
    const payload: AppUser = {
      fullName: userForm.fullName,
      username: userForm.username,
      email: userForm.email,
      role: userForm.role,
      active: userForm.active,
      projects: userForm.role === "Admin" ? projectNames : userForm.projects
    };
    setUsers((prev) => {
      if (editUser) return prev.map((u) => (u.username === editUser ? payload : u));
      if (prev.some((u) => u.username === payload.username)) return prev;
      return [...prev, payload];
    });
    setEditUser(null);
    setUserForm(emptyUser);
  };

  return (
    <div className="d-grid gap-3">
      <section className="page-heading d-flex justify-content-between flex-wrap gap-2">
        <div>
          <h1 className="page-title">Settings Workspace</h1>
          <p className="page-subtitle">Project, report, user, print and theme management in one panel.</p>
        </div>
        <button className="primary-btn" onClick={saveAll}><i className="bi bi-save" /> Save All Changes</button>
      </section>

      <section className="admin-layout-grid">
        <article className="panel-card">
          <h2 className="h5 mb-3">Settings</h2>
          <nav className="settings-nav">
            <button className={`settings-nav-btn ${tab === "org" ? "active" : ""}`} onClick={() => setTab("org")}>Organization</button>
            <button className={`settings-nav-btn ${tab === "projects" ? "active" : ""}`} onClick={() => setTab("projects")}>Project Settings</button>
            <button className={`settings-nav-btn ${tab === "locations" ? "active" : ""}`} onClick={() => setTab("locations")}>Location Mapping</button>
            <button className={`settings-nav-btn ${tab === "participants" ? "active" : ""}`} onClick={() => setTab("participants")}>Participant Management</button>
            <button className={`settings-nav-btn ${tab === "reports" ? "active" : ""}`} onClick={() => setTab("reports")}>Report + Print Setup</button>
            <button className={`settings-nav-btn ${tab === "users" ? "active" : ""}`} onClick={() => setTab("users")}>User Management</button>
            <button className={`settings-nav-btn ${tab === "themes" ? "active" : ""}`} onClick={() => setTab("themes")}>Theme Panel</button>
          </nav>
        </article>

        <div className="d-grid gap-3">
          {tab === "org" && (
            <article className="panel-card settings-section">
              <h3 className="h5 mb-3">Organization</h3>
              <div className="admin-kv-grid">
                <div><label className="form-label">ORG_NAME</label><input className="form-control premium-input" value={orgName} onChange={(e) => setOrgName(e.target.value)} /></div>
                <div><label className="form-label">LOGO_URL</label><input className="form-control premium-input" value={logoUrl} onChange={(e) => setLogoUrl(e.target.value)} /></div>
              </div>
              <div className="mt-3"><button className="primary-btn" onClick={persistOrganization}>Save</button></div>
            </article>
          )}

          {tab === "projects" && (
            <article className="panel-card settings-section" id="project-settings">
              <h3 className="h5 mb-3">Project - Activity - Code</h3>
              <div className="row g-3">
                <div className="col-md-6"><label className="form-label">Projects</label><select className="form-select premium-input" value={currentProject?.project || ""} onChange={(e) => setProjectIdx(projectNames.indexOf(e.target.value))}>{projectNames.map((n) => <option key={n}>{n}</option>)}</select></div>
                <div className="col-md-6"><label className="form-label">Add Project</label><div className="d-flex gap-2"><input className="form-control premium-input" value={newProject} onChange={(e) => setNewProject(e.target.value)} /><button className="outline-btn" onClick={addProject}>Add</button></div></div>
                <div className="col-md-5"><label className="form-label">Activity</label><input className="form-control premium-input" value={newActivity} onChange={(e) => setNewActivity(e.target.value)} /></div>
                <div className="col-md-3"><label className="form-label">Code</label><input className="form-control premium-input" value={newCode} onChange={(e) => setNewCode(e.target.value)} /></div>
                <div className="col-md-2"><label className="form-label">Type</label><select className="form-select premium-input" value={newType} onChange={(e) => setNewType(e.target.value)}><option>Training</option><option>Workshop</option><option>Meeting</option><option>Distribution</option><option>Campaign</option></select></div>
                <div className="col-md-2 d-flex align-items-end"><button className="outline-btn w-100" onClick={addActivity}>Add Activity</button></div>
              </div>
              <div className="table-responsive mt-3"><table className="table premium-table mb-0"><thead><tr><th>Activity</th><th>Code</th><th>Type</th></tr></thead><tbody>{currentProject?.activities.map((a) => <tr key={a.code + a.name}><td>{a.name}</td><td className="mono">{a.code}</td><td>{a.type}</td></tr>)}</tbody></table></div>
              <div className="mt-3"><button className="primary-btn" onClick={persistProjects}>Save</button></div>
            </article>
          )}

          {tab === "locations" && (
            <article className="panel-card settings-section">
              <h3 className="h5 mb-3">Location Mapping (Working Editor)</h3>
              <div className="table-responsive"><table className="table premium-table mb-0"><thead><tr><th>District</th><th>Upazilas</th><th>Unions</th><th /></tr></thead><tbody>{loc.map((row, i) => <tr key={i}><td><input className="form-control premium-input" value={row.district} onChange={(e) => setLoc((p) => p.map((x, j) => j === i ? { ...x, district: e.target.value } : x))} /></td><td><input className="form-control premium-input" value={row.upazilas} onChange={(e) => setLoc((p) => p.map((x, j) => j === i ? { ...x, upazilas: e.target.value } : x))} /></td><td><input className="form-control premium-input" value={row.unions} onChange={(e) => setLoc((p) => p.map((x, j) => j === i ? { ...x, unions: e.target.value } : x))} /></td><td><button className="icon-btn" onClick={() => setLoc((p) => p.filter((_, j) => j !== i))}><i className="bi bi-trash" /></button></td></tr>)}</tbody></table></div>
              <div className="mt-3 d-flex gap-2"><button className="outline-btn" onClick={() => setLoc((p) => [...p, { district: "", upazilas: "", unions: "" }])}>Add Row</button><button className="primary-btn" onClick={persistLocations}>Save</button></div>
            </article>
          )}

          {tab === "participants" && (
            <article className="panel-card settings-section">
              <h3 className="h5 mb-3">Participant Management</h3>
              <div className="row g-3">
                <div className="col-md-6"><label className="form-label">Project</label><select className="form-select premium-input" value={currentProject?.project || ""} onChange={(e) => setProjectIdx(projectNames.indexOf(e.target.value))}>{projectNames.map((n) => <option key={n}>{n}</option>)}</select></div>
                <div className="col-md-6"><label className="form-label">Add Category</label><div className="d-flex gap-2"><input className="form-control premium-input" value={newCategory} onChange={(e) => setNewCategory(e.target.value)} /><button className="outline-btn" onClick={addCategory}>Add</button></div></div>
              </div>
              <div className="mt-3 d-grid gap-2">{currentProject?.participantCategories.map((c) => <div key={c.key + c.label} className="admin-map-card d-flex justify-content-between"><span>{c.label}</span><small className="mono text-muted">{c.key}</small></div>)}</div>
              <div className="mt-3"><button className="primary-btn" onClick={persistProjects}>Save</button></div>
            </article>
          )}

          {tab === "reports" && (
            <article className="panel-card settings-section" id="report-settings">
              <h3 className="h5 mb-3">Report and Print Setup</h3>
              <div className="row g-3">
                <div className="col-md-6"><label className="form-label">Default Report Theme</label><select className="form-select premium-input" value={reportTheme} onChange={(e) => setReportTheme(e.target.value)}><option>Corporate Blue</option><option>Clean Neutral</option><option>Executive Dark</option></select></div>
                <div className="col-md-6"><label className="form-label">Template DOCX</label><input className="form-control premium-input" value={tpl} readOnly /></div>
                <div className="col-md-12 d-flex gap-2 flex-wrap"><button className="outline-btn" onClick={exportDemoDocx}><i className="bi bi-download" /> Export Demo DOCX</button><label className="outline-btn m-0"><i className="bi bi-upload" /> Import DOCX<input type="file" accept=".doc,.docx" className="d-none" onChange={(e) => setTpl(e.target.files?.[0]?.name || tpl)} /></label></div>
              </div>
              <div className="mt-3 d-grid gap-2">
                <label className="confirm-box"><input type="checkbox" checked={docx} onChange={(e) => setDocx(e.target.checked)} /><span>Enable DOCX</span></label>
                <label className="confirm-box"><input type="checkbox" checked={pdf} onChange={(e) => setPdf(e.target.checked)} /><span>Enable PDF</span></label>
                <label className="confirm-box"><input type="checkbox" checked={csv} onChange={(e) => setCsv(e.target.checked)} /><span>Enable CSV</span></label>
                <label className="confirm-box"><input type="checkbox" checked={zip} onChange={(e) => setZip(e.target.checked)} /><span>Enable ZIP</span></label>
              </div>
              <hr />
              <div className="row g-3">
                <div className="col-md-3"><label className="form-label">Preset</label><select className="form-select premium-input" value={printPreset} onChange={(e) => setPrintPreset(e.target.value)}><option>Standard A4</option><option>Compact</option><option>Detailed</option></select></div>
                <div className="col-md-3"><label className="form-label">Page Size</label><select className="form-select premium-input" value={printSize} onChange={(e) => setPrintSize(e.target.value)}><option>A4</option><option>Letter</option><option>Legal</option></select></div>
                <div className="col-md-3"><label className="form-label">Orientation</label><select className="form-select premium-input" value={printOrientation} onChange={(e) => setPrintOrientation(e.target.value as "Portrait" | "Landscape")}><option>Portrait</option><option>Landscape</option></select></div>
                <div className="col-md-3 d-flex align-items-end"><button className="outline-btn w-100" onClick={() => window.print()}><i className="bi bi-printer" /> Print Preview</button></div>
                <div className="col-md-6"><label className="form-label">Header</label><input className="form-control premium-input" value={header} onChange={(e) => setHeader(e.target.value)} /></div>
                <div className="col-md-6"><label className="form-label">Footer</label><input className="form-control premium-input" value={footer} onChange={(e) => setFooter(e.target.value)} /></div>
              </div>
              <div className="mt-3"><button className="primary-btn" onClick={persistReports}>Save Report + Print</button></div>
            </article>
          )}

          {tab === "users" && (
            <article className="panel-card settings-section">
              <h3 className="h5 mb-3">User Management (CRUD + Assign Project + Active/Inactive)</h3>
              <div className="row g-3">
                <div className="col-md-4"><label className="form-label">Name</label><input className="form-control premium-input" value={userForm.fullName} onChange={(e) => setUserForm((p) => ({ ...p, fullName: e.target.value }))} /></div>
                <div className="col-md-3"><label className="form-label">Username</label><input className="form-control premium-input" value={userForm.username} onChange={(e) => setUserForm((p) => ({ ...p, username: e.target.value }))} disabled={Boolean(editUser)} /></div>
                <div className="col-md-5"><label className="form-label">Email</label><input className="form-control premium-input" value={userForm.email} onChange={(e) => setUserForm((p) => ({ ...p, email: e.target.value }))} /></div>
                <div className="col-md-3"><label className="form-label">Role</label><select className="form-select premium-input" value={userForm.role} onChange={(e) => setUserForm((p) => ({ ...p, role: e.target.value as AppUser["role"] }))}><option>User</option><option>Manager</option><option>Admin</option></select></div>
                <div className="col-md-3 d-flex align-items-end"><label className="confirm-box"><input type="checkbox" checked={userForm.active} onChange={(e) => setUserForm((p) => ({ ...p, active: e.target.checked }))} /><span>Active</span></label></div>
                <div className="col-md-6 d-flex align-items-end"><button className="primary-btn w-100" onClick={upsertUser}>{editUser ? "Update User" : "Create User"}</button></div>
              </div>
              <div className="mt-3"><p className="small text-muted mb-2">Assign Projects (Admin = all projects)</p><div className="d-flex flex-wrap gap-3">{projectNames.map((p) => <label key={p} className="confirm-box"><input type="checkbox" checked={userForm.role === "Admin" || userForm.projects.includes(p)} onChange={() => setUserForm((prev) => ({ ...prev, projects: prev.projects.includes(p) ? prev.projects.filter((x) => x !== p) : [...prev.projects, p] }))} disabled={userForm.role === "Admin"} /><span>{p}</span></label>)}</div></div>
              <div className="table-responsive mt-3"><table className="table premium-table mb-0"><thead><tr><th>Name</th><th>Username</th><th>Role</th><th>Active</th><th>Projects</th><th /></tr></thead><tbody>{users.map((u) => <tr key={u.username}><td>{u.fullName}</td><td className="mono">{u.username}</td><td>{u.role}</td><td>{u.active ? "Yes" : "No"}</td><td>{u.role === "Admin" ? "All Projects" : u.projects.join(", ")}</td><td><div className="d-flex gap-2 justify-content-end"><button className="icon-btn" onClick={() => { setEditUser(u.username); setUserForm({ fullName: u.fullName, username: u.username, email: u.email, role: u.role, active: u.active, projects: u.role === "Admin" ? projectNames : u.projects }); }}><i className="bi bi-pencil" /></button><button className="icon-btn" onClick={() => setUsers((prev) => prev.map((x) => x.username === u.username ? { ...x, active: !x.active } : x))}><i className={`bi ${u.active ? "bi-toggle-on" : "bi-toggle-off"}`} /></button><button className="icon-btn" onClick={() => setUsers((prev) => prev.filter((x) => x.username !== u.username))}><i className="bi bi-trash" /></button></div></td></tr>)}</tbody></table></div>
              <div className="mt-3"><button className="primary-btn" onClick={persistUsers}>Save Users</button></div>
            </article>
          )}

          {tab === "themes" && (
            <article className="panel-card settings-section">
              <h3 className="h5 mb-3">Theme Panel (5 extra themes)</h3>
              <div className="d-flex flex-wrap gap-2">
                {themeOptions.map((t) => (
                  <button key={t.value} className={`settings-nav-btn ${theme === t.value ? "active" : ""}`} onClick={() => setTheme(t.value)}>{t.label}</button>
                ))}
              </div>
              <div className="mt-3"><button className="primary-btn" onClick={() => window.alert(`Theme saved: ${theme}`)}>Save Theme</button></div>
            </article>
          )}
        </div>
      </section>
    </div>
  );
}
