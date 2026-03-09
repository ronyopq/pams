"use client";

import { ReactNode, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";
import { ReminderStrip } from "./reminder-strip";
import { useAuthUser } from "@/lib/use-auth-user";

const publicPaths = new Set(["/login", "/register"]);

export function AppFrame({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const authQuery = useAuthUser();
  const isPublicPath = publicPaths.has(pathname);

  useEffect(() => {
    if (!isPublicPath && authQuery.isError) {
      router.push("/login");
    }
  }, [authQuery.isError, isPublicPath, router]);

  if (isPublicPath) return <>{children}</>;
  if (authQuery.isLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <p className="text-sm text-slate-600">Loading SMART WORK TRACKER...</p>
      </main>
    );
  }

  if (!authQuery.data) return null;

  return (
    <div className="mx-auto flex max-w-[1600px] gap-4 p-4">
      <Sidebar />
      <main className="min-w-0 flex-1">
        <Topbar user={authQuery.data} />
        <ReminderStrip />
        {children}
      </main>
    </div>
  );
}
