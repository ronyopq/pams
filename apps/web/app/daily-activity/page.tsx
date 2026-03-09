"use client";

import { FormEvent, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { PageHeader } from "@/components/shared/page-header";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

function toUtcIso(localDateTime: string): string {
  return new Date(localDateTime).toISOString();
}

function nowLocalInput(minutesOffset = 0): string {
  const date = new Date(Date.now() + minutesOffset * 60_000);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export default function DailyActivityPage() {
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();
  const selectedActivityId = Number(searchParams.get("activityId")) || null;
  const todayDate = new Date().toISOString().slice(0, 10);

  const activitiesQuery = useQuery({
    queryKey: ["activities"],
    queryFn: () => api.getActivities("")
  });
  const workPlansQuery = useQuery({
    queryKey: ["workplans", "for-activity"],
    queryFn: () => api.getWorkPlans("")
  });

  const [form, setForm] = useState({
    date: todayDate,
    timeFromLocal: nowLocalInput(-60),
    timeToLocal: nowLocalInput(0),
    taskDescription: "",
    output: "",
    note: "",
    delivery: "",
    category: "General",
    workplanId: ""
  });
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploadActivityId, setUploadActivityId] = useState<number | null>(null);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [followupForm, setFollowupForm] = useState<{
    activityId: number | null;
    person: string;
    followupDate: string;
    note: string;
  }>({
    activityId: null,
    person: "",
    followupDate: nowLocalInput(24 * 60),
    note: ""
  });

  const createActivityMutation = useMutation({
    mutationFn: api.createActivity,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["activities"] });
      await queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] });
      setMessage("Activity logged successfully.");
      setError(null);
      setForm((prev) => ({ ...prev, taskDescription: "", output: "", note: "", delivery: "" }));
    },
    onError: (err: Error) => {
      setError(err.message);
      setMessage(null);
    }
  });

  const uploadMutation = useMutation({
    mutationFn: ({ activityId, file }: { activityId: number; file: File }) =>
      api.uploadAttachment(activityId, file),
    onSuccess: () => {
      setMessage("Attachment uploaded.");
      setUploadFile(null);
      setUploadActivityId(null);
      queryClient.invalidateQueries({ queryKey: ["files"] });
    },
    onError: (err: Error) => setError(err.message)
  });

  const followupMutation = useMutation({
    mutationFn: api.createFollowup,
    onSuccess: async () => {
      setMessage("Followup created.");
      setFollowupForm((prev) => ({ ...prev, person: "", note: "" }));
      await queryClient.invalidateQueries({ queryKey: ["followups", "pending-today"] });
    },
    onError: (err: Error) => setError(err.message)
  });

  const timeline = useMemo(
    () => [...(activitiesQuery.data ?? [])].sort((a, b) => b.date.localeCompare(a.date)),
    [activitiesQuery.data],
  );

  function submitActivity(event: FormEvent) {
    event.preventDefault();
    createActivityMutation.mutate({
      date: form.date,
      timeFromUtc: toUtcIso(form.timeFromLocal),
      timeToUtc: toUtcIso(form.timeToLocal),
      taskDescription: form.taskDescription,
      output: form.output,
      note: form.note,
      delivery: form.delivery,
      category: form.category,
      workplanId: form.workplanId ? Number(form.workplanId) : null
    });
  }

  function submitUpload(event: FormEvent) {
    event.preventDefault();
    if (!uploadActivityId || !uploadFile) {
      setError("Select activity and file to upload.");
      return;
    }
    uploadMutation.mutate({ activityId: uploadActivityId, file: uploadFile });
  }

  function submitFollowup(event: FormEvent) {
    event.preventDefault();
    if (!followupForm.activityId) {
      setError("Choose an activity for followup.");
      return;
    }
    followupMutation.mutate({
      activityId: followupForm.activityId,
      person: followupForm.person,
      followupDate: toUtcIso(followupForm.followupDate),
      note: followupForm.note
    });
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Daily Activity Register"
        subtitle="Log task hours, attach proof files, and create followup reminders"
      />

      {message ? <Card className="border-emerald-200 bg-emerald-50 text-emerald-800">{message}</Card> : null}
      {error ? <Card className="border-red-200 bg-red-50 text-red-700">{error}</Card> : null}

      <div className="grid gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <h2 className="mb-3 text-lg font-bold text-blue-950">Log Activity</h2>
          <form className="grid gap-3 md:grid-cols-2" onSubmit={submitActivity}>
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
                onChange={(event) => setForm((prev) => ({ ...prev, category: event.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">From (local time)</label>
              <Input
                type="datetime-local"
                value={form.timeFromLocal}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, timeFromLocal: event.target.value }))
                }
                required
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">To (local time)</label>
              <Input
                type="datetime-local"
                value={form.timeToLocal}
                onChange={(event) => setForm((prev) => ({ ...prev, timeToLocal: event.target.value }))}
                required
              />
            </div>
            <div className="space-y-1 md:col-span-2">
              <label className="text-sm font-medium">Link Work Plan (optional)</label>
              <Select
                value={form.workplanId}
                onChange={(event) => setForm((prev) => ({ ...prev, workplanId: event.target.value }))}
              >
                <option value="">No linked work plan</option>
                {(workPlansQuery.data ?? []).map((plan) => (
                  <option key={plan.id} value={plan.id}>
                    {plan.date} - {plan.activity}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-1 md:col-span-2">
              <label className="text-sm font-medium">Task Description</label>
              <Textarea
                value={form.taskDescription}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, taskDescription: event.target.value }))
                }
                required
              />
            </div>
            <div className="space-y-1 md:col-span-2">
              <label className="text-sm font-medium">Output</label>
              <Textarea
                value={form.output}
                onChange={(event) => setForm((prev) => ({ ...prev, output: event.target.value }))}
              />
            </div>
            <div className="space-y-1 md:col-span-2">
              <label className="text-sm font-medium">Note</label>
              <Textarea
                value={form.note}
                onChange={(event) => setForm((prev) => ({ ...prev, note: event.target.value }))}
              />
            </div>
            <div className="space-y-1 md:col-span-2">
              <label className="text-sm font-medium">Delivery</label>
              <Input
                value={form.delivery}
                onChange={(event) => setForm((prev) => ({ ...prev, delivery: event.target.value }))}
              />
            </div>
            <div className="md:col-span-2">
              <Button type="submit" disabled={createActivityMutation.isPending}>
                {createActivityMutation.isPending ? "Saving..." : "Save Activity"}
              </Button>
            </div>
          </form>
        </Card>

        <Card>
          <h2 className="mb-3 text-lg font-bold text-blue-950">Attachments</h2>
          <form className="space-y-3" onSubmit={submitUpload}>
            <div className="space-y-1">
              <label className="text-sm font-medium">Activity</label>
              <Select
                value={uploadActivityId ? String(uploadActivityId) : ""}
                onChange={(event) => setUploadActivityId(Number(event.target.value) || null)}
              >
                <option value="">Select activity</option>
                {(activitiesQuery.data ?? []).map((activity) => (
                  <option key={activity.id} value={activity.id}>
                    #{activity.id} - {activity.taskDescription.slice(0, 40)}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">File</label>
              <Input
                type="file"
                accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.webp,.gif"
                onChange={(event) => setUploadFile(event.target.files?.[0] ?? null)}
              />
              <p className="text-xs text-slate-500">Accepted: pdf, doc, xlsx, image (max 10MB)</p>
            </div>
            <Button type="submit" disabled={uploadMutation.isPending}>
              {uploadMutation.isPending ? "Uploading..." : "Upload Attachment"}
            </Button>
          </form>

          <hr className="my-5" />
          <h3 className="mb-2 text-base font-bold text-blue-950">Create Followup</h3>
          <form className="space-y-2" onSubmit={submitFollowup}>
            <Select
              value={followupForm.activityId ? String(followupForm.activityId) : ""}
              onChange={(event) =>
                setFollowupForm((prev) => ({
                  ...prev,
                  activityId: Number(event.target.value) || null
                }))
              }
            >
              <option value="">Select activity</option>
              {(activitiesQuery.data ?? []).map((activity) => (
                <option key={activity.id} value={activity.id}>
                  #{activity.id} - {activity.taskDescription.slice(0, 40)}
                </option>
              ))}
            </Select>
            <Input
              placeholder="Person"
              value={followupForm.person}
              onChange={(event) =>
                setFollowupForm((prev) => ({ ...prev, person: event.target.value }))
              }
            />
            <Input
              type="datetime-local"
              value={followupForm.followupDate}
              onChange={(event) =>
                setFollowupForm((prev) => ({ ...prev, followupDate: event.target.value }))
              }
            />
            <Textarea
              placeholder="Followup note"
              value={followupForm.note}
              onChange={(event) =>
                setFollowupForm((prev) => ({ ...prev, note: event.target.value }))
              }
            />
            <Button type="submit" disabled={followupMutation.isPending}>
              Add Followup
            </Button>
          </form>
        </Card>
      </div>

      <Card>
        <h2 className="mb-3 text-lg font-bold text-blue-950">Activity Timeline</h2>
        <div className="space-y-2">
          {timeline.map((activity) => (
            <div
              key={activity.id}
              className={`rounded-xl border p-3 ${
                selectedActivityId === activity.id ? "border-blue-500 bg-blue-50" : "bg-white"
              }`}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-semibold text-slate-900">{activity.taskDescription}</p>
                <div className="flex items-center gap-2">
                  <Badge>{activity.category}</Badge>
                  <span className="text-xs text-slate-500">
                    {activity.durationMinutes} mins · {activity.date}
                  </span>
                </div>
              </div>
              <p className="mt-1 text-sm text-slate-600">{activity.output || "No output provided"}</p>
            </div>
          ))}
          {!timeline.length ? <p className="text-sm text-slate-500">No activities yet.</p> : null}
        </div>
      </Card>
    </div>
  );
}
