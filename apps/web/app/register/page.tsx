"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function RegisterPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    designation: "",
    department: "",
    supervisorEmail: "",
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
  });
  const [error, setError] = useState<string | null>(null);

  const registerMutation = useMutation({
    mutationFn: api.register,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["auth-user"] });
      router.push("/dashboard");
    },
    onError: (err: Error) => setError(err.message)
  });

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    const payload = form.supervisorEmail
      ? { ...form, supervisorEmail: form.supervisorEmail }
      : {
          name: form.name,
          email: form.email,
          password: form.password,
          designation: form.designation,
          department: form.department,
          timezone: form.timezone
        };
    registerMutation.mutate(payload);
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl items-center p-4">
      <Card className="w-full p-8">
        <h1 className="text-2xl font-black text-blue-950">Create Account</h1>
        <p className="mt-1 text-sm text-slate-600">
          Start planning and tracking work in one system
        </p>
        <form className="mt-6 grid gap-4 md:grid-cols-2" onSubmit={onSubmit}>
          <div className="space-y-1">
            <label className="text-sm font-medium">Full Name</label>
            <Input
              value={form.name}
              onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
              required
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">Email</label>
            <Input
              type="email"
              value={form.email}
              onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
              required
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">Password</label>
            <Input
              type="password"
              value={form.password}
              onChange={(event) => setForm((prev) => ({ ...prev, password: event.target.value }))}
              required
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">Designation</label>
            <Input
              value={form.designation}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, designation: event.target.value }))
              }
              required
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">Department</label>
            <Input
              value={form.department}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, department: event.target.value }))
              }
              required
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">Supervisor Email (optional)</label>
            <Input
              type="email"
              value={form.supervisorEmail}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, supervisorEmail: event.target.value }))
              }
            />
          </div>

          {error ? <p className="text-sm text-red-600 md:col-span-2">{error}</p> : null}

          <div className="md:col-span-2">
            <Button className="w-full" type="submit" disabled={registerMutation.isPending}>
              {registerMutation.isPending ? "Creating..." : "Register"}
            </Button>
          </div>
        </form>
        <p className="mt-4 text-sm text-slate-600">
          Have an account?{" "}
          <Link href="/login" className="font-semibold text-blue-600">
            Login
          </Link>
        </p>
      </Card>
    </main>
  );
}
