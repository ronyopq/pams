"use client";

import { useEffect, useMemo, useState } from "react";
import { printTemplatePreview } from "@/lib/print-report";
import { useAppContext } from "@/components/providers/app-context";
import { AppUser, LocationMap, ProjectActivityMap, ThemeMode } from "@/lib/types";

type Tab = "org" | "projects" | "locations" | "participants" | "reports" | "users" | "themes";
type UserForm = {
  fullName: string;
  username: string;
  email: string;
  role: AppUser["role"];
  active: boolean;
  projects: string[];
};

const cloneProjects = (items: ProjectActivityMap[]) =>
  items.map((p) => ({
    project: p.project,
    activities: p.activities.map((a) => ({ ...a })),
    participantCategories: p.participantCategories.map((c) => ({ ...c }))
  }));

const cloneLocations = (items: LocationMap[]) =>
  items.map((d) => ({
    district: d.district,
    upazilas: d.upazilas.map((u) => ({ name: u.name, unions: [...u.unions] }))
  }));

const slugify = (v: string) =>
  v
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

const themeOptions: Array<{ value: ThemeMode; label: string }> = [
  { value: "corporate-light", label: "Corporate Light" },
  { value: "corporate-dark", label: "Corporate Dark" },
  { value: "emerald", label: "Emerald" },
  { value: "violet", label: "Violet" },
  { value: "sunset", label: "Sunset" },
  { value: "mono", label: "Monochrome" }
];

const emptyUser: UserForm = { fullName: "", username: "", email: "", role: "User", active: true, projects: [] };

const normalizeLocations = (items: LocationMap[]): LocationMap[] =>
  items
    .map((d) => ({
      district: d.district.trim(),
      upazilas: d.upazilas
        .map((u) => ({
          name: u.name.trim(),
          unions: u.unions.map((n) => n.trim()).filter(Boolean)
        }))
        .filter((u) => u.name)
    }))
    .filter((d) => d.district)
    .map((d) => ({
      district: d.district,
      upazilas: d.upazilas.length ? d.upazilas : [{ name: "General Upazila", unions: ["General Union"] }]
    }));

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

const move = <T,>(list: T[], i: number, dir: "up" | "down") => {
  const j = dir === "up" ? i - 1 : i + 1;
  if (j < 0 || j >= list.length) return list;
  const next = [...list];
  [next[i], next[j]] = [next[j], next[i]];
  return next;
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
    setReportSettings,
    addAuditLog,
    notify
  } = useAppContext();

  const [tab, setTab] = useState<Tab>("org");
  const [orgName, setOrgName] = useState(orgSettings.orgName);
  const [logoUrl, setLogoUrl] = useState(orgSettings.logoUrl);
  const [projects, setProjects] = useState<ProjectActivityMap[]>(cloneProjects(appProjectMap));
  const [projectIdx, setProjectIdx] = useState(0);
  const [locationEditor, setLocationEditor] = useState<LocationMap[]>(cloneLocations(appLocationMap));
  const [users, setUsers] = useState<AppUser[]>(appUsers.map((u) => ({ ...u, projects: [...u.projects] })));
  const [editUser, setEditUser] = useState<string | null>(null);
  const [userForm, setUserForm] = useState<UserForm>(emptyUser);

  const [newProject, setNewProject] = useState("");
  const [newActivity, setNewActivity] = useState("");
  const [newCode, setNewCode] = useState("");
  const [newType, setNewType] = useState("Training");
  const [newCategory, setNewCategory] = useState("");

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

  const projectNames = useMemo(() => projects.map((p) => p.project), [projects]);
  const currentProject = projects[projectIdx] ?? projects[0];

  useEffect(() => setOrgName(orgSettings.orgName), [orgSettings.orgName]);
  useEffect(() => setLogoUrl(orgSettings.logoUrl), [orgSettings.logoUrl]);
  useEffect(() => setProjects(cloneProjects(appProjectMap)), [appProjectMap]);
  useEffect(() => setLocationEditor(cloneLocations(appLocationMap)), [appLocationMap]);
  useEffect(() => setUsers(appUsers.map((u) => ({ ...u, projects: [...u.projects] }))), [appUsers]);
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

  const persistOrganization = (silent = false) => {
    setOrgSettings({ orgName: orgName.trim() || "PRAAN", logoUrl: logoUrl.trim() || "/logo.svg" });
    addAuditLog("Updated Organization", "Settings", "org", "Updated organization details");
    if (!silent) notify("Organization settings saved successfully.", "success");
  };
  const persistProjects = (silent = false) => {
    setAppProjectMap(cloneProjects(projects));
    addAuditLog("Updated Project Settings", "Settings", "projects", "Updated projects and participant mapping");
    if (!silent) notify("Project settings saved successfully.", "success");
  };
  const persistLocations = (silent = false) => {
    const normalized = normalizeLocations(locationEditor);
    if (!normalized.length) return;
    setAppLocationMap(normalized);
    addAuditLog("Updated Location Mapping", "Settings", "locations", "Updated district/upazila/union mapping");
    if (!silent) notify("Location mapping saved successfully.", "success");
  };
  const persistReports = (silent = false) => {
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
    addAuditLog("Updated Report Settings", "Settings", "reports", "Updated template, export and print setup");
    if (!silent) notify("Report settings saved successfully.", "success");
  };
  const persistUsers = (silent = false) => {
    const nextUsers = users.map((u) => ({ ...u, projects: u.role === "Admin" ? projectNames : u.projects }));
    setAppUsers(nextUsers);
    addAuditLog("Updated User Management", "Settings", "users", "Updated user access");
    if (!silent) notify("User settings saved successfully.", "success");
  };
  const saveAll = () => {
    persistOrganization(true);
    persistProjects(true);
    persistLocations(true);
    persistReports(true);
    persistUsers(true);
    notify("All settings saved successfully.", "success");
  };

  const addProject = () => {
    const name = newProject.trim();
    if (!name || projects.some((p) => p.project.toLowerCase() === name.toLowerCase())) return;
    setProjects((prev) => [...prev, { project: name, activities: [], participantCategories: [] }]);
    setNewProject("");
  };
  const addActivity = () => {
    if (!currentProject || !newActivity.trim() || !newCode.trim()) return;
    setProjects((prev) =>
      prev.map((p, i) =>
        i === projectIdx
          ? { ...p, activities: [...p.activities, { name: newActivity.trim(), code: newCode.trim(), type: newType }] }
          : p
      )
    );
    setNewActivity("");
    setNewCode("");
  };
  const addCategory = () => {
    const label = newCategory.trim();
    if (!label || !currentProject) return;
    setProjects((prev) =>
      prev.map((p, i) =>
        i === projectIdx ? { ...p, participantCategories: [...p.participantCategories, { key: slugify(label), label }] } : p
      )
    );
    setNewCategory("");
  };
  const upsertUser = () => {
    if (!userForm.fullName.trim() || !userForm.username.trim() || !userForm.email.trim()) return;
    const payload: AppUser = {
      fullName: userForm.fullName.trim(),
      username: userForm.username.trim(),
      email: userForm.email.trim(),
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
          <p className="page-subtitle">Project, report, user, location, participant, and theme management.</p>
        </div>
        <button className="primary-btn" onClick={saveAll}>
          <i className="bi bi-save" /> Save All Changes
        </button>
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
              <div className="mt-3"><button className="primary-btn" onClick={() => persistOrganization()}>Save</button></div>
            </article>
          )}
          {tab === "projects" && (
            <article className="panel-card settings-section">
              <h3 className="h5 mb-3">Project - Activity - Code</h3>
              <div className="row g-3">
                <div className="col-md-6"><label className="form-label">Projects</label><select className="form-select premium-input" value={currentProject?.project || ""} onChange={(e) => setProjectIdx(Math.max(projectNames.indexOf(e.target.value), 0))}>{projectNames.map((n) => <option key={n}>{n}</option>)}</select></div>
                <div className="col-md-6"><label className="form-label">Add Project</label><div className="d-flex gap-2"><input className="form-control premium-input" value={newProject} onChange={(e) => setNewProject(e.target.value)} /><button className="outline-btn" onClick={addProject}>Add</button></div></div>
                <div className="col-md-5"><label className="form-label">Activity</label><input className="form-control premium-input" value={newActivity} onChange={(e) => setNewActivity(e.target.value)} /></div>
                <div className="col-md-3"><label className="form-label">Code</label><input className="form-control premium-input" value={newCode} onChange={(e) => setNewCode(e.target.value)} /></div>
                <div className="col-md-2"><label className="form-label">Type</label><select className="form-select premium-input" value={newType} onChange={(e) => setNewType(e.target.value)}><option>Training</option><option>Workshop</option><option>Meeting</option><option>Distribution</option><option>Campaign</option></select></div>
                <div className="col-md-2 d-flex align-items-end"><button className="outline-btn w-100" onClick={addActivity}>Add Activity</button></div>
              </div>
              <div className="table-responsive mt-3"><table className="table premium-table mb-0"><thead><tr><th>Activity</th><th>Code</th><th>Type</th></tr></thead><tbody>{currentProject?.activities.map((a) => <tr key={a.code + a.name}><td>{a.name}</td><td className="mono">{a.code}</td><td>{a.type}</td></tr>)}</tbody></table></div>
              <div className="mt-3"><button className="primary-btn" onClick={() => persistProjects()}>Save</button></div>
            </article>
          )}
          {tab === "locations" && (
            <article className="panel-card settings-section">
              <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-3">
                <h3 className="h5 mb-0">Location Mapping</h3>
                <button className="outline-btn" onClick={() => setLocationEditor((prev) => [...prev, { district: "", upazilas: [{ name: "", unions: [""] }] }])}><i className="bi bi-plus-circle" /> Add District</button>
              </div>
              <div className="d-grid gap-3">
                {locationEditor.map((district, dIdx) => (
                  <article key={`district-${dIdx}`} className="admin-location-card">
                    <div className="d-flex gap-2 flex-wrap align-items-center mb-2">
                      <input className="form-control premium-input flex-grow-1" placeholder="District" value={district.district} onChange={(e) => setLocationEditor((prev) => prev.map((d, i) => (i === dIdx ? { ...d, district: e.target.value } : d)))} />
                      <button className="icon-btn" onClick={() => setLocationEditor((prev) => move(prev, dIdx, "up"))}><i className="bi bi-arrow-up" /></button>
                      <button className="icon-btn" onClick={() => setLocationEditor((prev) => move(prev, dIdx, "down"))}><i className="bi bi-arrow-down" /></button>
                      <button className="icon-btn" onClick={() => setLocationEditor((prev) => prev.map((d, i) => (i === dIdx ? { ...d, upazilas: [...d.upazilas, { name: "", unions: [""] }] } : d)))}><i className="bi bi-plus-lg" /></button>
                      <button className="icon-btn" onClick={() => setLocationEditor((prev) => prev.filter((_, i) => i !== dIdx))}><i className="bi bi-trash" /></button>
                    </div>
                    <div className="d-grid gap-2">
                      {district.upazilas.map((upazila, uIdx) => (
                        <article key={`upazila-${dIdx}-${uIdx}`} className="admin-upazila-card">
                          <div className="d-flex gap-2 flex-wrap align-items-center">
                            <input className="form-control premium-input flex-grow-1" placeholder="Upazila" value={upazila.name} onChange={(e) => setLocationEditor((prev) => prev.map((d, i) => i === dIdx ? { ...d, upazilas: d.upazilas.map((u, j) => (j === uIdx ? { ...u, name: e.target.value } : u)) } : d))} />
                            <button className="icon-btn" onClick={() => setLocationEditor((prev) => prev.map((d, i) => (i === dIdx ? { ...d, upazilas: move(d.upazilas, uIdx, "up") } : d)))}><i className="bi bi-arrow-up" /></button>
                            <button className="icon-btn" onClick={() => setLocationEditor((prev) => prev.map((d, i) => (i === dIdx ? { ...d, upazilas: move(d.upazilas, uIdx, "down") } : d)))}><i className="bi bi-arrow-down" /></button>
                            <button className="icon-btn" onClick={() => setLocationEditor((prev) => prev.map((d, i) => i === dIdx ? { ...d, upazilas: d.upazilas.map((u, j) => (j === uIdx ? { ...u, unions: [...u.unions, ""] } : u)) } : d))}><i className="bi bi-plus-lg" /></button>
                            <button className="icon-btn" onClick={() => setLocationEditor((prev) => prev.map((d, i) => i === dIdx ? { ...d, upazilas: d.upazilas.filter((_, j) => j !== uIdx) } : d))}><i className="bi bi-trash" /></button>
                          </div>
                          <div className="d-grid gap-2 mt-2">
                            {upazila.unions.map((union, unionIdx) => (
                              <div key={`union-${dIdx}-${uIdx}-${unionIdx}`} className="d-flex gap-2 flex-wrap align-items-center">
                                <input className="form-control premium-input flex-grow-1" placeholder="Union" value={union} onChange={(e) => setLocationEditor((prev) => prev.map((d, i) => i === dIdx ? { ...d, upazilas: d.upazilas.map((u, j) => j === uIdx ? { ...u, unions: u.unions.map((n, k) => (k === unionIdx ? e.target.value : n)) } : u) } : d))} />
                                <button className="icon-btn" onClick={() => setLocationEditor((prev) => prev.map((d, i) => i === dIdx ? { ...d, upazilas: d.upazilas.map((u, j) => j === uIdx ? { ...u, unions: move(u.unions, unionIdx, "up") } : u) } : d))}><i className="bi bi-arrow-up" /></button>
                                <button className="icon-btn" onClick={() => setLocationEditor((prev) => prev.map((d, i) => i === dIdx ? { ...d, upazilas: d.upazilas.map((u, j) => j === uIdx ? { ...u, unions: move(u.unions, unionIdx, "down") } : u) } : d))}><i className="bi bi-arrow-down" /></button>
                                <button className="icon-btn" onClick={() => setLocationEditor((prev) => prev.map((d, i) => i === dIdx ? { ...d, upazilas: d.upazilas.map((u, j) => j === uIdx ? { ...u, unions: u.unions.filter((_, k) => k !== unionIdx) } : u) } : d))}><i className="bi bi-trash" /></button>
                              </div>
                            ))}
                          </div>
                        </article>
                      ))}
                    </div>
                  </article>
                ))}
              </div>
              <div className="mt-3"><button className="primary-btn" onClick={() => persistLocations()}>Save Location Mapping</button></div>
            </article>
          )}
          {tab === "participants" && (
            <article className="panel-card settings-section">
              <h3 className="h5 mb-3">Participant Management</h3>
              <div className="row g-3">
                <div className="col-md-6"><label className="form-label">Project</label><select className="form-select premium-input" value={currentProject?.project || ""} onChange={(e) => setProjectIdx(Math.max(projectNames.indexOf(e.target.value), 0))}>{projectNames.map((n) => <option key={n}>{n}</option>)}</select></div>
                <div className="col-md-6"><label className="form-label">Add Category</label><div className="d-flex gap-2"><input className="form-control premium-input" value={newCategory} onChange={(e) => setNewCategory(e.target.value)} /><button className="outline-btn" onClick={addCategory}>Add</button></div></div>
              </div>
              <div className="d-grid gap-2 mt-3">{currentProject?.participantCategories.map((c, idx) => <article key={`${c.key}-${idx}`} className="admin-participant-card"><div className="row g-2"><div className="col-md-5"><input className="form-control premium-input" value={c.label} onChange={(e) => setProjects((prev) => prev.map((p, i) => i === projectIdx ? { ...p, participantCategories: p.participantCategories.map((r, j) => (j === idx ? { ...r, label: e.target.value } : r)) } : p))} /></div><div className="col-md-3"><input className="form-control premium-input mono" value={c.key} onChange={(e) => setProjects((prev) => prev.map((p, i) => i === projectIdx ? { ...p, participantCategories: p.participantCategories.map((r, j) => (j === idx ? { ...r, key: slugify(e.target.value) } : r)) } : p))} /></div><div className="col-md-4 d-flex gap-2"><button className="icon-btn" onClick={() => setProjects((prev) => prev.map((p, i) => i === projectIdx ? { ...p, participantCategories: move(p.participantCategories, idx, "up") } : p))}><i className="bi bi-arrow-up" /></button><button className="icon-btn" onClick={() => setProjects((prev) => prev.map((p, i) => i === projectIdx ? { ...p, participantCategories: move(p.participantCategories, idx, "down") } : p))}><i className="bi bi-arrow-down" /></button><button className="icon-btn" onClick={() => setProjects((prev) => prev.map((p, i) => i === projectIdx ? { ...p, participantCategories: p.participantCategories.filter((_, j) => j !== idx) } : p))}><i className="bi bi-trash" /></button></div></div></article>)}</div>
              <div className="mt-3"><button className="primary-btn" onClick={() => persistProjects()}>Save Participant Mapping</button></div>
            </article>
          )}
          {tab === "reports" && (
            <article className="panel-card settings-section">
              <h3 className="h5 mb-3">Report and Print Setup</h3>
              <div className="row g-3">
                <div className="col-md-6"><label className="form-label">Default Report Theme</label><select className="form-select premium-input" value={reportTheme} onChange={(e) => setReportTheme(e.target.value)}><option>Corporate Blue</option><option>Clean Neutral</option><option>Executive Dark</option></select></div>
                <div className="col-md-6"><label className="form-label">Template DOCX</label><input className="form-control premium-input" value={tpl} readOnly /></div>
                <div className="col-md-12 d-flex gap-2 flex-wrap"><button className="outline-btn" onClick={exportDemoDocx}><i className="bi bi-download" /> Export Demo DOCX</button><label className="outline-btn m-0"><i className="bi bi-upload" /> Import DOCX<input type="file" accept=".doc,.docx" className="d-none" onChange={(e) => setTpl(e.target.files?.[0]?.name || tpl)} /></label></div>
              </div>
              <div className="mt-3 d-grid gap-2"><label className="confirm-box"><input type="checkbox" checked={docx} onChange={(e) => setDocx(e.target.checked)} /><span>Enable DOCX</span></label><label className="confirm-box"><input type="checkbox" checked={pdf} onChange={(e) => setPdf(e.target.checked)} /><span>Enable PDF</span></label><label className="confirm-box"><input type="checkbox" checked={csv} onChange={(e) => setCsv(e.target.checked)} /><span>Enable CSV</span></label><label className="confirm-box"><input type="checkbox" checked={zip} onChange={(e) => setZip(e.target.checked)} /><span>Enable ZIP</span></label></div>
              <hr />
              <div className="row g-3">
                <div className="col-md-3"><label className="form-label">Preset</label><select className="form-select premium-input" value={printPreset} onChange={(e) => setPrintPreset(e.target.value)}><option>Standard A4</option><option>Compact</option><option>Detailed</option></select></div>
                <div className="col-md-3"><label className="form-label">Page Size</label><select className="form-select premium-input" value={printSize} onChange={(e) => setPrintSize(e.target.value)}><option>A4</option><option>Letter</option><option>Legal</option></select></div>
                <div className="col-md-3"><label className="form-label">Orientation</label><select className="form-select premium-input" value={printOrientation} onChange={(e) => setPrintOrientation(e.target.value as "Portrait" | "Landscape")}><option>Portrait</option><option>Landscape</option></select></div>
                <div className="col-md-3 d-flex align-items-end"><button className="outline-btn w-100" onClick={() => printTemplatePreview({ preset: printPreset, pageSize: printSize, orientation: printOrientation === "Landscape" ? "Landscape" : "Portrait", header, footer }, tpl)}><i className="bi bi-printer" /> Text Preview</button></div>
                <div className="col-md-6"><label className="form-label">Header</label><input className="form-control premium-input" value={header} onChange={(e) => setHeader(e.target.value)} /></div>
                <div className="col-md-6"><label className="form-label">Footer</label><input className="form-control premium-input" value={footer} onChange={(e) => setFooter(e.target.value)} /></div>
              </div>
              <div className="mt-3"><button className="primary-btn" onClick={() => persistReports()}>Save Report + Print</button></div>
            </article>
          )}
          {tab === "users" && (
            <article className="panel-card settings-section">
              <h3 className="h5 mb-3">User Management</h3>
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
              <div className="mt-3"><button className="primary-btn" onClick={() => persistUsers()}>Save Users</button></div>
            </article>
          )}
          {tab === "themes" && (
            <article className="panel-card settings-section">
              <h3 className="h5 mb-3">Theme Panel</h3>
              <div className="d-flex flex-wrap gap-2">{themeOptions.map((t) => <button key={t.value} className={`settings-nav-btn ${theme === t.value ? "active" : ""}`} onClick={() => setTheme(t.value)}>{t.label}</button>)}</div>
              <div className="mt-3"><button className="primary-btn" onClick={() => { addAuditLog("Updated Theme", "Settings", "theme", `Theme set to ${theme}`); notify("Theme saved successfully.", "success"); }}>Save Theme</button></div>
            </article>
          )}
        </div>
      </section>
    </div>
  );
}
