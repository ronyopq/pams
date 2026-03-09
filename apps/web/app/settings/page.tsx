"use client";

import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/shared/page-header";
import { useAuthUser } from "@/lib/use-auth-user";

export default function SettingsPage() {
  const userQuery = useAuthUser();
  const user = userQuery.data;

  return (
    <div className="space-y-4">
      <PageHeader
        title="Settings"
        subtitle="Profile identity and environment defaults"
      />

      <Card>
        <h2 className="mb-3 text-lg font-bold text-blue-950">User Profile</h2>
        {user ? (
          <div className="grid gap-3 md:grid-cols-2">
            <div className="rounded-xl border p-3">
              <p className="text-xs uppercase text-slate-500">Name</p>
              <p className="font-semibold">{user.name}</p>
            </div>
            <div className="rounded-xl border p-3">
              <p className="text-xs uppercase text-slate-500">Email</p>
              <p className="font-semibold">{user.email}</p>
            </div>
            <div className="rounded-xl border p-3">
              <p className="text-xs uppercase text-slate-500">Designation</p>
              <p className="font-semibold">{user.designation}</p>
            </div>
            <div className="rounded-xl border p-3">
              <p className="text-xs uppercase text-slate-500">Department</p>
              <p className="font-semibold">{user.department}</p>
            </div>
            <div className="rounded-xl border p-3">
              <p className="text-xs uppercase text-slate-500">Timezone</p>
              <p className="font-semibold">{user.timezone}</p>
            </div>
            <div className="rounded-xl border p-3">
              <p className="text-xs uppercase text-slate-500">Supervisor ID</p>
              <p className="font-semibold">{user.supervisorId ?? "Not assigned"}</p>
            </div>
          </div>
        ) : (
          <p className="text-sm text-slate-500">Loading profile data...</p>
        )}
      </Card>

      <Card>
        <h2 className="mb-2 text-lg font-bold text-blue-950">Security Controls</h2>
        <ul className="list-disc space-y-1 pl-5 text-sm text-slate-700">
          <li>JWT access + refresh cookies (HttpOnly, Secure, SameSite=Lax)</li>
          <li>API rate limiting via Durable Object counters</li>
          <li>Private R2 attachments with short-lived signed access links</li>
          <li>Supervisor read-only scope for direct reports</li>
        </ul>
      </Card>
    </div>
  );
}
