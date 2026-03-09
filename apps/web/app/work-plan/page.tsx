"use client";

import { FormEvent, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { WorkPlan } from "@smart-work-tracker/shared-types";
import { api } from "@/lib/api";
import { PageHeader } from "@/components/shared/page-header";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { TableWrapper } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

function saveBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

const initialForm = {
  date: new Date().toISOString().slice(0, 10),
  activity: "",
  expectedOutput: "",
  priority: "medium" as WorkPlan["priority"],
  status: "planned" as WorkPlan["status"],
  category: "General"
};

export default function WorkPlanPage() {
  const queryClient = useQueryClient();
  const [monthFilter, setMonthFilter] = useState(new Date().toISOString().slice(0, 7));
  const [statusFilter, setStatusFilter] = useState("");
  const [form, setForm] = useState(initialForm);
  const [editing, setEditing] = useState<Record<number, Partial<typeof initialForm>>>({});
  const [importFile, setImportFile] = useState<File | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const workplansQuery = useQuery({
    queryKey: ["workplans", monthFilter, statusFilter],
    queryFn: () =>
      api.getWorkPlans(
        `?month=${encodeURIComponent(monthFilter)}${
          statusFilter ? `&status=${encodeURIComponent(statusFilter)}` : ""
        }`,
      )
  });

  const createMutation = useMutation({
    mutationFn: api.createWorkPlan,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["workplans"] });
      await queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] });
      setForm(initialForm);
      setMessage("Work plan created.");
      setError(null);
    },
    onError: (err: Error) => setError(err.message)
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: Partial<typeof initialForm> }) =>
      api.updateWorkPlan(id, payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["workplans"] });
      setMessage("Work plan updated.");
      setError(null);
    },
    onError: (err: Error) => setError(err.message)
  });

  const deleteMutation = useMutation({
    mutationFn: api.deleteWorkPlan,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["workplans"] });
      setMessage("Work plan deleted.");
      setError(null);
    },
    onError: (err: Error) => setError(err.message)
  });

  const convertMutation = useMutation({
    mutationFn: api.convertWorkPlanToActivity,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["workplans"] });
      await queryClient.invalidateQueries({ queryKey: ["activities"] });
      setMessage("Work plan converted to activity.");
      setError(null);
    },
    onError: (err: Error) => setError(err.message)
  });

  const importMutation = useMutation({
    mutationFn: api.importWorkPlans,
    onSuccess: async (result) => {
      await queryClient.invalidateQueries({ queryKey: ["workplans"] });
      setMessage(`Imported ${result.imported} work plans.`);
      setImportFile(null);
      setError(null);
    },
    onError: (err: Error) => setError(err.message)
  });

  const plans = useMemo(
    () => [...(workplansQuery.data ?? [])].sort((a, b) => b.date.localeCompare(a.date)),
    [workplansQuery.data],
  );

  function submitCreate(event: FormEvent) {
    event.preventDefault();
    createMutation.mutate(form);
  }

  async function exportCurrent() {
    try {
      const blob = await api.exportWorkPlans(monthFilter);
      saveBlob(blob, `work-plans-${monthFilter}.csv`);
    } catch (err) {
      setError((err as Error).message);
    }
  }

  function submitImport(event: FormEvent) {
    event.preventDefault();
    if (!importFile) {
      setError("Please select a CSV template file.");
      return;
    }
    importMutation.mutate(importFile);
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Monthly Work Plan"
        subtitle="Create, track, import, export, and convert plans to daily activities"
      />

      {message ? <Card className="border-emerald-200 bg-emerald-50 text-emerald-800">{message}</Card> : null}
      {error ? <Card className="border-red-200 bg-red-50 text-red-700">{error}</Card> : null}

      <div className="grid gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <h2 className="mb-3 text-lg font-bold text-blue-950">Create Plan</h2>
          <form className="grid gap-3 md:grid-cols-2" onSubmit={submitCreate}>
            <div className="space-y-1">
              <label className="text-sm font-medium">Date</label>
              <Input
                type="date"
                value={form.date}
                onChange={(event) => setForm((prev) => ({ ...prev, date: event.target.value }))}
                required
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Category</label>
              <Input
                value={form.category}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, category: event.target.value }))
                }
                required
              />
            </div>
            <div className="space-y-1 md:col-span-2">
              <label className="text-sm font-medium">Activity</label>
              <Textarea
                value={form.activity}
                onChange={(event) => setForm((prev) => ({ ...prev, activity: event.target.value }))}
                required
              />
            </div>
            <div className="space-y-1 md:col-span-2">
              <label className="text-sm font-medium">Expected Output</label>
              <Textarea
                value={form.expectedOutput}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, expectedOutput: event.target.value }))
                }
                required
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Priority</label>
              <Select
                value={form.priority}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, priority: event.target.value as WorkPlan["priority"] }))
                }
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Status</label>
              <Select
                value={form.status}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, status: event.target.value as WorkPlan["status"] }))
                }
              >
                <option value="planned">Planned</option>
                <option value="in_progress">In Progress</option>
                <option value="done">Done</option>
              </Select>
            </div>
            <div className="md:col-span-2">
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? "Saving..." : "Create Plan"}
              </Button>
            </div>
          </form>
        </Card>

        <Card>
          <h2 className="mb-3 text-lg font-bold text-blue-950">Import/Export Excel</h2>
          <div className="space-y-3">
            <div className="space-y-1">
              <label className="text-sm font-medium">Filter Month</label>
              <Input type="month" value={monthFilter} onChange={(e) => setMonthFilter(e.target.value)} />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Status Filter</label>
              <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                <option value="">All</option>
                <option value="planned">Planned</option>
                <option value="in_progress">In Progress</option>
                <option value="done">Done</option>
              </Select>
            </div>
            <Button variant="secondary" onClick={exportCurrent}>
              Export (Excel-compatible CSV)
            </Button>
            <form onSubmit={submitImport} className="space-y-2">
              <Input type="file" accept=".csv" onChange={(e) => setImportFile(e.target.files?.[0] ?? null)} />
              <p className="text-xs text-slate-500">
                Strict template headers: date,activity,expected_output,priority,status,category
              </p>
              <Button type="submit" disabled={importMutation.isPending}>
                {importMutation.isPending ? "Importing..." : "Import Template File"}
              </Button>
            </form>
          </div>
        </Card>
      </div>

      <Card>
        <h2 className="mb-3 text-lg font-bold text-blue-950">Work Plan Table</h2>
        <TableWrapper>
          <table className="w-full min-w-[960px] text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
              <tr>
                <th className="p-3">Date</th>
                <th className="p-3">Activity</th>
                <th className="p-3">Expected Output</th>
                <th className="p-3">Priority</th>
                <th className="p-3">Status</th>
                <th className="p-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {plans.map((plan) => {
                const draft = editing[plan.id];
                return (
                  <tr key={plan.id} className="border-t align-top">
                    <td className="p-3">
                      <Input
                        type="date"
                        value={draft?.date ?? plan.date}
                        onChange={(event) =>
                          setEditing((prev) => ({
                            ...prev,
                            [plan.id]: { ...prev[plan.id], date: event.target.value }
                          }))
                        }
                      />
                    </td>
                    <td className="p-3">
                      <Textarea
                        value={draft?.activity ?? plan.activity}
                        onChange={(event) =>
                          setEditing((prev) => ({
                            ...prev,
                            [plan.id]: { ...prev[plan.id], activity: event.target.value }
                          }))
                        }
                      />
                    </td>
                    <td className="p-3">
                      <Textarea
                        value={draft?.expectedOutput ?? plan.expectedOutput}
                        onChange={(event) =>
                          setEditing((prev) => ({
                            ...prev,
                            [plan.id]: { ...prev[plan.id], expectedOutput: event.target.value }
                          }))
                        }
                      />
                    </td>
                    <td className="p-3">
                      <Select
                        value={draft?.priority ?? plan.priority}
                        onChange={(event) =>
                          setEditing((prev) => ({
                            ...prev,
                            [plan.id]: {
                              ...prev[plan.id],
                              priority: event.target.value as WorkPlan["priority"]
                            }
                          }))
                        }
                      >
                        <option value="low">Low</option>
                        <option value="medium">Medium</option>
                        <option value="high">High</option>
                      </Select>
                    </td>
                    <td className="p-3">
                      <div className="space-y-2">
                        <Select
                          value={draft?.status ?? plan.status}
                          onChange={(event) =>
                            setEditing((prev) => ({
                              ...prev,
                              [plan.id]: {
                                ...prev[plan.id],
                                status: event.target.value as WorkPlan["status"]
                              }
                            }))
                          }
                        >
                          <option value="planned">Planned</option>
                          <option value="in_progress">In Progress</option>
                          <option value="done">Done</option>
                        </Select>
                        <Badge>{plan.category}</Badge>
                      </div>
                    </td>
                    <td className="p-3">
                      <div className="flex flex-col gap-2">
                        <Button
                          className="w-full"
                          onClick={() => updateMutation.mutate({ id: plan.id, payload: editing[plan.id] ?? {} })}
                          disabled={updateMutation.isPending}
                        >
                          Save
                        </Button>
                        <Button
                          variant="secondary"
                          className="w-full"
                          onClick={() => convertMutation.mutate(plan.id)}
                          disabled={convertMutation.isPending}
                        >
                          Convert to Activity
                        </Button>
                        <Button
                          variant="danger"
                          className="w-full"
                          onClick={() => deleteMutation.mutate(plan.id)}
                          disabled={deleteMutation.isPending}
                        >
                          Delete
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {!plans.length ? <p className="p-4 text-sm text-slate-500">No plans for current filter.</p> : null}
        </TableWrapper>
      </Card>
    </div>
  );
}
