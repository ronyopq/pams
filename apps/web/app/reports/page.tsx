"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { PageHeader } from "@/components/shared/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

function saveBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export default function ReportsPage() {
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [error, setError] = useState<string | null>(null);
  const reportQuery = useQuery({
    queryKey: ["monthly-report", month],
    queryFn: () => api.getReportMonthly(month)
  });

  async function exportFormat(format: "pdf" | "word" | "excel") {
    try {
      const blob = await api.exportReport(format, month);
      const ext = format === "word" ? "doc" : format === "excel" ? "csv" : "pdf";
      saveBlob(blob, `monthly-report-${month}.${ext}`);
    } catch (err) {
      setError((err as Error).message);
    }
  }

  const report = reportQuery.data;

  return (
    <div className="space-y-4">
      <PageHeader
        title="Monthly Report Generator"
        subtitle="Auto-generated from daily activities and work plans"
        action={
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => exportFormat("pdf")}>
              Export PDF
            </Button>
            <Button variant="secondary" onClick={() => exportFormat("word")}>
              Export Word
            </Button>
            <Button variant="secondary" onClick={() => exportFormat("excel")}>
              Export Excel
            </Button>
          </div>
        }
      />

      <Card>
        <div className="mb-3 flex items-center gap-3">
          <label className="text-sm font-medium">Month</label>
          <input
            type="month"
            value={month}
            onChange={(event) => setMonth(event.target.value)}
            className="h-10 rounded-xl border px-3 text-sm"
          />
        </div>
        {error ? <p className="mb-3 text-sm text-red-600">{error}</p> : null}
        <div className="grid gap-3 md:grid-cols-3">
          <div className="rounded-xl border bg-blue-50 p-3">
            <p className="text-sm text-slate-600">Total Activities</p>
            <p className="text-2xl font-black text-blue-900">{report?.summary.totalActivities ?? 0}</p>
          </div>
          <div className="rounded-xl border bg-emerald-50 p-3">
            <p className="text-sm text-slate-600">Total Hours</p>
            <p className="text-2xl font-black text-emerald-700">{report?.summary.totalHours ?? 0}</p>
          </div>
          <div className="rounded-xl border bg-amber-50 p-3">
            <p className="text-sm text-slate-600">Ongoing Plans</p>
            <p className="text-2xl font-black text-amber-700">{report?.ongoingTasks.length ?? 0}</p>
          </div>
        </div>
      </Card>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <h2 className="mb-3 text-lg font-bold text-blue-950">Completed Tasks</h2>
          <div className="space-y-2">
            {(report?.completedTasks ?? []).map((task) => (
              <div key={task.id} className="rounded-xl border p-3">
                <p className="font-semibold text-slate-900">{task.taskDescription}</p>
                <p className="text-sm text-slate-600">{task.output}</p>
                <p className="text-xs text-slate-500">
                  {task.date} · {task.hours}h
                </p>
              </div>
            ))}
            {!report?.completedTasks.length ? (
              <p className="text-sm text-slate-500">No completed tasks in selected month.</p>
            ) : null}
          </div>
        </Card>

        <Card>
          <h2 className="mb-3 text-lg font-bold text-blue-950">Ongoing Tasks</h2>
          <div className="space-y-2">
            {(report?.ongoingTasks ?? []).map((task) => (
              <div key={task.id} className="rounded-xl border p-3">
                <p className="font-semibold text-slate-900">{task.activity}</p>
                <p className="text-xs uppercase tracking-wide text-slate-500">
                  {task.date} · {task.status}
                </p>
              </div>
            ))}
            {!report?.ongoingTasks.length ? (
              <p className="text-sm text-slate-500">No ongoing tasks in selected month.</p>
            ) : null}
          </div>
        </Card>
      </div>

      <Card>
        <h2 className="mb-3 text-lg font-bold text-blue-950">Summary by Category</h2>
        <div className="grid gap-2 md:grid-cols-3">
          {(report?.summary.categoryBreakdown ?? []).map((category) => (
            <div key={category.category} className="rounded-xl border bg-white p-3">
              <p className="font-semibold text-slate-800">{category.category}</p>
              <p className="text-sm text-slate-500">{category.totalHours} hours</p>
            </div>
          ))}
          {!report?.summary.categoryBreakdown.length ? (
            <p className="text-sm text-slate-500">No category data for selected month.</p>
          ) : null}
        </div>
      </Card>
    </div>
  );
}
