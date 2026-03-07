"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useAppContext } from "@/components/providers/app-context";

export default function LoginPage() {
  const router = useRouter();
  const params = useSearchParams();
  const { login } = useAppContext();
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("123456");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError(null);

    const result = login(username, password);
    if (!result.ok) {
      setError(result.message || "Login failed");
      setLoading(false);
      return;
    }

    const nextPath = params.get("next") || "/dashboard";
    router.push(nextPath);
  };

  return (
    <div className="auth-card-wrap">
      <div className="auth-card">
        <div className="mb-4 text-center">
          <p className="auth-eyebrow mb-2">PRAAN Activity Management System</p>
          <h1 className="auth-title">Welcome Back</h1>
          <p className="text-muted mb-0">Sign in with your account to continue.</p>
        </div>

        <form onSubmit={onSubmit} className="d-grid gap-3">
          <div>
            <label className="form-label">Username</label>
            <input
              className="form-control premium-input"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              placeholder="Enter username"
              required
            />
          </div>

          <div>
            <label className="form-label">Password</label>
            <input
              type="password"
              className="form-control premium-input"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Enter password"
              required
            />
            <small className="text-muted">Demo password: 123456</small>
          </div>

          {error && <div className="alert alert-danger py-2 mb-0">{error}</div>}

          <button className="primary-btn w-100" disabled={loading}>
            {loading ? "Signing In..." : "Sign In"}
          </button>
        </form>

        <p className="mt-3 mb-0 text-center text-muted">
          No account? <Link href="/register">Create one</Link>
        </p>
      </div>
    </div>
  );
}