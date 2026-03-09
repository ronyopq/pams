"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { BellRing } from "lucide-react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";

export function ReminderStrip() {
  const [open, setOpen] = useState(false);
  const followupsQuery = useQuery({
    queryKey: ["followups", "pending-today"],
    queryFn: () => api.getFollowups("?status=pending&today=true"),
    refetchInterval: 60_000
  });

  const followups = followupsQuery.data ?? [];
  const nextFollowup = useMemo(() => followups[0], [followups]);

  if (!followups.length) return null;

  return (
    <>
      <div className="sticky top-4 z-30 mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 shadow-panel">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <BellRing size={16} />
            <span>
              {followups.length} pending follow-up reminder{followups.length > 1 ? "s" : ""}.
              {nextFollowup ? ` Next: ${new Date(nextFollowup.followupDate).toLocaleString()}` : ""}
            </span>
          </div>
          <Button variant="danger" className="h-8 text-xs" onClick={() => setOpen(true)}>
            View Reminders
          </Button>
        </div>
      </div>

      {open ? (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/35 p-4">
          <div className="w-full max-w-2xl rounded-2xl border bg-white p-5 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900">Pending Followups</h2>
              <Button variant="ghost" onClick={() => setOpen(false)}>
                Close
              </Button>
            </div>
            <div className="space-y-3">
              {followups.map((followup) => (
                <div key={followup.id} className="rounded-xl border p-3">
                  <p className="text-sm font-semibold text-slate-900">{followup.person}</p>
                  <p className="text-xs text-slate-600">
                    Follow-up Date: {new Date(followup.followupDate).toLocaleString()}
                  </p>
                  <p className="mt-1 text-sm text-slate-700">{followup.note || "No note"}</p>
                  <Link
                    href={`/daily-activity?activityId=${followup.activityId}`}
                    className="mt-2 inline-block text-sm font-semibold text-blue-600"
                  >
                    Open related activity
                  </Link>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
