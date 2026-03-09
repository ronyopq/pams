"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Pie, PieChart, ResponsiveContainer, Tooltip, Cell, BarChart, XAxis, YAxis, Bar } from "recharts";
import { api } from "@/lib/api";
import { PageHeader } from "@/components/shared/page-header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const PIE_COLORS = ["#0F67F2", "#16A34A", "#DC2626", "#9333EA", "#EA580C"];

export default function DashboardPage() {
  const summaryQuery = useQuery({
    queryKey: ["dashboard-summary"],
    queryFn: api.getDashboardSummary
  });
  const chartsQuery = useQuery({
    queryKey: ["dashboard-charts"],
    queryFn: api.getDashboardCharts
  });
  const plansQuery = useQuery({
    queryKey: ["workplans", "today-popup"],
    queryFn: () => api.getWorkPlans("")
  });

  const [showPopup, setShowPopup] = useState(false);
  const todayIso = new Date().toISOString().slice(0, 10);
  const todaysPlans = useMemo(
    () => (plansQuery.data ?? []).filter((plan) => plan.date === todayIso),
    [plansQuery.data, todayIso],
  );

  useEffect(() => {
    const key = `today-plan-popup-${todayIso}`;
    if (todaysPlans.length && !localStorage.getItem(key)) {
      setShowPopup(true);
      localStorage.setItem(key, "1");
    }
  }, [todaysPlans.length, todayIso]);

  const summary = summaryQuery.data;
  const charts = chartsQuery.data;

  return (
    <div className="space-y-4">
      <PageHeader
        title="Dashboard"
        subtitle="Your productivity pulse for today and this month"
      />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <p className="text-sm text-slate-500">Today&apos;s Activities</p>
          <p className="mt-2 text-3xl font-black text-blue-950">{summary?.todayActivities ?? 0}</p>
        </Card>
        <Card>
          <p className="text-sm text-slate-500">Today&apos;s Work Plan</p>
          <p className="mt-2 text-3xl font-black text-blue-950">{summary?.todayWorkPlans ?? 0}</p>
        </Card>
        <Card>
          <p className="text-sm text-slate-500">Pending Followups</p>
          <p className="mt-2 text-3xl font-black text-red-600">{summary?.pendingFollowups ?? 0}</p>
        </Card>
        <Card>
          <p className="text-sm text-slate-500">Total Hours Today</p>
          <p className="mt-2 text-3xl font-black text-emerald-600">{summary?.totalHoursToday ?? 0}</p>
        </Card>
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <Card>
          <h3 className="mb-3 text-lg font-bold text-blue-950">Monthly Activity Hours</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={charts?.monthlyHours ?? []}>
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="totalHours" fill="#0F67F2" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card>
          <h3 className="mb-3 text-lg font-bold text-blue-950">Task Category Distribution</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={charts?.categoryDistribution ?? []}
                  dataKey="totalHours"
                  nameKey="category"
                  outerRadius={110}
                  innerRadius={60}
                >
                  {(charts?.categoryDistribution ?? []).map((entry, index) => (
                    <Cell key={entry.category} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </section>

      <Card>
        <h3 className="text-lg font-bold text-blue-950">Today&apos;s Work Plan Timeline</h3>
        <div className="mt-3 space-y-2">
          {todaysPlans.length ? (
            todaysPlans.map((plan) => (
              <div
                key={plan.id}
                className="flex items-start justify-between rounded-xl border border-blue-100 bg-blue-50/60 p-3"
              >
                <div>
                  <p className="font-semibold text-slate-800">{plan.activity}</p>
                  <p className="text-sm text-slate-600">{plan.expectedOutput}</p>
                </div>
                <Badge>{plan.status}</Badge>
              </div>
            ))
          ) : (
            <p className="text-sm text-slate-500">No work plans for today.</p>
          )}
        </div>
      </Card>

      {showPopup ? (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/35 p-4">
          <Card className="w-full max-w-xl">
            <h2 className="text-xl font-black text-blue-950">Today&apos;s Planned Work</h2>
            <div className="mt-3 space-y-2">
              {todaysPlans.map((plan) => (
                <div key={plan.id} className="rounded-xl border p-3">
                  <p className="font-semibold">{plan.activity}</p>
                  <p className="text-sm text-slate-600">{plan.expectedOutput}</p>
                </div>
              ))}
            </div>
            <div className="mt-4 flex justify-end">
              <Button onClick={() => setShowPopup(false)}>Close</Button>
            </div>
          </Card>
        </div>
      ) : null}
    </div>
  );
}
