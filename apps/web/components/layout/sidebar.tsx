"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CalendarDays,
  ChartBarStacked,
  ClipboardCheck,
  FileText,
  Files,
  LayoutDashboard,
  Settings
} from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/daily-activity", label: "Daily Activity", icon: ClipboardCheck },
  { href: "/work-plan", label: "Work Plan", icon: ChartBarStacked },
  { href: "/calendar", label: "Calendar", icon: CalendarDays },
  { href: "/reports", label: "Reports", icon: FileText },
  { href: "/files", label: "Files", icon: Files },
  { href: "/settings", label: "Settings", icon: Settings }
];

export function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="sticky top-4 h-[calc(100vh-2rem)] w-64 rounded-3xl border bg-white/90 p-5 shadow-panel backdrop-blur">
      <div className="mb-8">
        <p className="text-xs uppercase tracking-[0.2em] text-blue-500">SaaS Suite</p>
        <h1 className="mt-1 text-xl font-black text-blue-950">SMART WORK TRACKER</h1>
      </div>
      <nav className="space-y-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition",
                active
                  ? "bg-blue-600 text-white"
                  : "text-slate-700 hover:bg-blue-50 hover:text-blue-700",
              )}
            >
              <Icon size={18} />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
