"use client";

import { Bell, LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import type { UserProfile } from "@smart-work-tracker/shared-types";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";

export function Topbar({ user }: { user: UserProfile }) {
  const router = useRouter();

  return (
    <header className="mb-4 flex items-center justify-between rounded-2xl border bg-white/90 px-5 py-3 shadow-panel">
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-blue-500">Today</p>
        <h2 className="text-lg font-bold text-blue-950">
          {new Date().toLocaleDateString(undefined, {
            weekday: "long",
            month: "long",
            day: "numeric",
            year: "numeric"
          })}
        </h2>
      </div>
      <div className="flex items-center gap-3">
        <div className="rounded-xl bg-blue-50 px-4 py-2 text-right">
          <p className="text-sm font-semibold text-blue-950">{user.name}</p>
          <p className="text-xs text-slate-600">
            {user.designation} · {user.department}
          </p>
        </div>
        <Button variant="secondary" className="h-9 gap-2 px-3">
          <Bell size={16} />
          Alerts
        </Button>
        <Button
          variant="ghost"
          className="h-9 gap-2 px-3"
          onClick={async () => {
            await api.logout();
            router.push("/login");
          }}
        >
          <LogOut size={16} />
          Logout
        </Button>
      </div>
    </header>
  );
}
