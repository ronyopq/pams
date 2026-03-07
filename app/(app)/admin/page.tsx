"use client";

import { useAppContext } from "@/components/providers/app-context";
import { projectActivityMap, users } from "@/lib/mockData";

export default function AdminPage() {
  const { user } = useAppContext();

  if (user?.role !== "Admin") {
    return (
      <section className="panel-card">
        <h1 className="page-title h3 mb-2">Admin Panel</h1>
        <p className="mb-0 text-muted">Only Admin users can access this module.</p>
      </section>
    );
  }

  return (
    <div className="d-grid gap-3">
      <section className="page-heading">
        <h1 className="page-title">Admin Panel</h1>
        <p className="page-subtitle">Manage users, project mappings, participant categories, and settings.</p>
      </section>

      <section className="row g-3">
        <div className="col-12 col-xl-5">
          <article className="panel-card h-100">
            <h3 className="h5 mb-3">Users</h3>
            <div className="table-responsive">
              <table className="table premium-table mb-0 align-middle small">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Role</th>
                    <th>Active</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((member) => (
                    <tr key={member.username}>
                      <td>
                        <p className="mb-0 fw-semibold">{member.fullName}</p>
                        <small className="text-muted">{member.username}</small>
                      </td>
                      <td>{member.role}</td>
                      <td>{member.active ? "Yes" : "No"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </article>
        </div>

        <div className="col-12 col-xl-7">
          <article className="panel-card h-100">
            <h3 className="h5 mb-3">Project ? Activity ? Code Mapping</h3>
            <div className="d-grid gap-2">
              {projectActivityMap.map((project) => (
                <div className="admin-map-card" key={project.project}>
                  <p className="fw-semibold mb-2">{project.project}</p>
                  {project.activities.map((activity) => (
                    <div className="d-flex justify-content-between small" key={activity.code}>
                      <span>{activity.name}</span>
                      <span className="mono text-muted">{activity.code}</span>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </article>
        </div>
      </section>

      <section className="panel-card">
        <h3 className="h5 mb-3">Settings</h3>
        <div className="row g-3">
          <div className="col-md-4"><label className="form-label">ORG_NAME</label><input className="form-control premium-input" value="PRAAN" readOnly /></div>
          <div className="col-md-8"><label className="form-label">LOGO_URL</label><input className="form-control premium-input" value="/logo.svg" readOnly /></div>
        </div>
      </section>
    </div>
  );
}