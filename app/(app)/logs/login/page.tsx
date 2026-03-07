"use client";

import { useAppContext } from "@/components/providers/app-context";
import { loginLogs } from "@/lib/mockData";
import { formatDateTime } from "@/lib/format";

export default function LoginLogPage() {
  const { user } = useAppContext();
  const rows =
    user?.role === "Admin" || user?.role === "Manager"
      ? loginLogs
      : loginLogs.filter((log) => log.username.toLowerCase() === (user?.username || "").toLowerCase());

  return (
    <div className="d-grid gap-3">
      <section className="page-heading">
        <h1 className="page-title">Login Log</h1>
        <p className="page-subtitle">View your login sessions with time, IP, and device info.</p>
      </section>

      <section className="panel-card table-responsive p-0">
        <table className="table premium-table mb-0 align-middle">
          <thead>
            <tr>
              <th>Username</th>
              <th>Login</th>
              <th>Logout</th>
              <th>IP Address</th>
              <th>Device</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((log, index) => (
              <tr key={index}>
                <td>{log.username}</td>
                <td>{formatDateTime(log.loginTime)}</td>
                <td>{formatDateTime(log.logoutTime)}</td>
                <td className="mono">{log.ipAddress}</td>
                <td>{log.deviceInfo}</td>
                <td>
                  <span className={log.status === "Success" ? "text-success" : "text-danger"}>{log.status}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}