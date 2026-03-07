"use client";

import { useAppContext } from "@/components/providers/app-context";

export default function ProfilePage() {
  const { user } = useAppContext();

  return (
    <div className="d-grid gap-3">
      <section className="page-heading">
        <h1 className="page-title">Profile</h1>
        <p className="page-subtitle">Account overview and role-based access summary.</p>
      </section>

      <section className="panel-card">
        <div className="row g-4">
          <div className="col-md-6">
            <p className="text-muted mb-1">Full Name</p>
            <p className="fw-semibold">{user?.fullName}</p>
            <p className="text-muted mb-1">Username</p>
            <p className="fw-semibold mono">{user?.username}</p>
            <p className="text-muted mb-1">Email</p>
            <p className="fw-semibold">{user?.email}</p>
          </div>
          <div className="col-md-6">
            <p className="text-muted mb-1">Role</p>
            <p className="fw-semibold">{user?.role}</p>
            <p className="text-muted mb-1">Active</p>
            <p className="fw-semibold">{user?.active ? "Yes" : "No"}</p>
            <p className="text-muted mb-1">Project Access</p>
            <div className="d-flex flex-wrap gap-2">
              {user?.projects.map((project) => (
                <span className="badge text-bg-light" key={project}>
                  {project}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}