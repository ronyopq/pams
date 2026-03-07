"use client";

import { FormEvent, useMemo, useState } from "react";
import clsx from "clsx";
import { useAppContext } from "@/components/providers/app-context";
import { calcUtilization, calcVariance, formatCurrency } from "@/lib/format";
import { implementedByOptions, locations, projectActivityMap, venueOptions } from "@/lib/mockData";
import {
  ActivityAttachment,
  ActivityEntry,
  AttachmentCategory,
  EntryStatus,
  ParticipantLine
} from "@/lib/types";

const uploadCategories: AttachmentCategory[] = [
  "Implementation Plan",
  "Participants List",
  "Press Release",
  "Activity Report",
  "Bill Voucher",
  "Photos"
];

const firstProject = projectActivityMap[0];
const firstActivity = firstProject.activities[0];
const firstDistrict = locations[0];
const todayIso = new Date().toISOString().slice(0, 10);

type FormState = {
  date: string;
  project: string;
  activityName: string;
  activityCode: string;
  activityType: string;
  venue: string;
  implementedBy: string;
  district: string;
  upazila: string;
  union: string;
  referenceLink: string;
  notes: string;
  aiReport: string;
  budget: number;
  expenses: number;
};

const initParticipants = (project: string): ParticipantLine[] => {
  const map = projectActivityMap.find((item) => item.project === project) ?? firstProject;
  return map.participantCategories.map((category) => ({
    categoryKey: category.key,
    categoryLabel: category.label,
    male: 0,
    female: 0
  }));
};

const toAttachments = (filesByCategory: Record<AttachmentCategory, File[]>) => {
  const list: ActivityAttachment[] = [];
  uploadCategories.forEach((category) => {
    (filesByCategory[category] || []).forEach((file) => {
      list.push({
        id: `file-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
        category,
        name: file.name,
        url: "#",
        type: file.type.startsWith("image/") ? "image" : "document",
        sizeKb: Math.round(file.size / 1024)
      });
    });
  });
  return list;
};

const buildNarrative = (form: FormState, participants: ParticipantLine[], attachmentCount: number) => {
  const male = participants.reduce((sum, item) => sum + item.male, 0);
  const female = participants.reduce((sum, item) => sum + item.female, 0);
  const total = male + female;

  return [
    `On ${form.date}, PRAAN conducted ${form.activityName} under ${form.project} at ${form.venue}.`,
    `Implementation was led by ${form.implementedBy} in ${form.district}, ${form.upazila}, ${form.union}.`,
    `A total of ${total} participants attended, including ${male} male and ${female} female participants across approved project categories.`,
    `The approved budget was ${formatCurrency(form.budget)} and the expense recorded was ${formatCurrency(form.expenses)}, resulting in a variance of ${calcVariance(form.budget, form.expenses).toFixed(1)} percent.`,
    `Field teams documented the process, outcomes, and follow-up points to support monitoring, review, and role-based reporting workflows.`,
    `${attachmentCount} supporting file(s) were attached across standard upload categories for audit and export readiness.`
  ].join(" ");
};

const buildId = (entries: ActivityEntry[], dateValue: string) => {
  const date = new Date(`${dateValue}T00:00:00`);
  const yy = String(date.getFullYear()).slice(-2);
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  const prefix = `PR-${yy}${mm}`;
  const serial = String(entries.filter((entry) => entry.uniqueId.startsWith(prefix)).length + 1).padStart(2, "0");
  return `PR-${yy}${mm}${dd}${serial}`;
};

export const NewActivityForm = () => {
  const { user, entries, addEntry } = useAppContext();

  const [form, setForm] = useState<FormState>({
    date: todayIso,
    project: firstProject.project,
    activityName: firstActivity.name,
    activityCode: firstActivity.code,
    activityType: firstActivity.type,
    venue: venueOptions[0],
    implementedBy: implementedByOptions[0],
    district: firstDistrict.district,
    upazila: firstDistrict.upazilas[0].name,
    union: firstDistrict.upazilas[0].unions[0],
    referenceLink: "",
    notes: "",
    aiReport: "",
    budget: 0,
    expenses: 0
  });

  const [participants, setParticipants] = useState<ParticipantLine[]>(initParticipants(firstProject.project));
  const [filesByCategory, setFilesByCategory] = useState<Record<AttachmentCategory, File[]>>({
    "Implementation Plan": [],
    "Participants List": [],
    "Press Release": [],
    "Activity Report": [],
    "Bill Voucher": [],
    Photos: []
  });
  const [confirmed, setConfirmed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const [successEntry, setSuccessEntry] = useState<ActivityEntry | null>(null);
  const [open, setOpen] = useState({ info: true, participants: true, financial: true, uploads: true });
  const [venueChoices, setVenueChoices] = useState<string[]>(venueOptions);
  const [implementedByChoices, setImplementedByChoices] = useState<string[]>(implementedByOptions);

  const projectMap = projectActivityMap.find((item) => item.project === form.project) ?? firstProject;
  const districtMap = locations.find((item) => item.district === form.district) ?? firstDistrict;
  const upazilaList = districtMap.upazilas.map((item) => item.name);
  const currentUpazila = districtMap.upazilas.find((item) => item.name === form.upazila) ?? districtMap.upazilas[0];
  const unionList = currentUpazila.unions;

  const totalMale = participants.reduce((sum, row) => sum + row.male, 0);
  const totalFemale = participants.reduce((sum, row) => sum + row.female, 0);
  const grandTotal = totalMale + totalFemale;
  const attachmentCount = uploadCategories.reduce((sum, key) => sum + (filesByCategory[key]?.length || 0), 0);
  const variance = calcVariance(form.budget, form.expenses);
  const utilization = calcUtilization(form.budget, form.expenses);
  const generatedId = useMemo(() => buildId(entries, form.date), [entries, form.date]);

  const setProject = (project: string) => {
    const map = projectActivityMap.find((item) => item.project === project) ?? firstProject;
    const activity = map.activities[0];
    setForm((prev) => ({
      ...prev,
      project,
      activityName: activity.name,
      activityCode: activity.code,
      activityType: activity.type
    }));
    setParticipants(initParticipants(project));
  };

  const setActivity = (name: string) => {
    const selected = projectMap.activities.find((item) => item.name === name) ?? projectMap.activities[0];
    setForm((prev) => ({
      ...prev,
      activityName: selected.name,
      activityCode: selected.code,
      activityType: selected.type
    }));
  };

  const setDistrict = (district: string) => {
    const selected = locations.find((item) => item.district === district) ?? firstDistrict;
    setForm((prev) => ({
      ...prev,
      district,
      upazila: selected.upazilas[0].name,
      union: selected.upazilas[0].unions[0]
    }));
  };

  const setUpazila = (upazila: string) => {
    const selected = districtMap.upazilas.find((item) => item.name === upazila) ?? districtMap.upazilas[0];
    setForm((prev) => ({ ...prev, upazila: selected.name, union: selected.unions[0] }));
  };

  const updateCount = (key: string, field: "male" | "female", value: number) => {
    setParticipants((prev) =>
      prev.map((row) => (row.categoryKey === key ? { ...row, [field]: Math.max(0, value) } : row))
    );
  };

  const onFileChange = (category: AttachmentCategory, list: FileList | null) => {
    const files = list ? Array.from(list) : [];
    setFilesByCategory((prev) => ({ ...prev, [category]: [...prev[category], ...files] }));
  };

  const removeFile = (category: AttachmentCategory, index: number) => {
    setFilesByCategory((prev) => ({
      ...prev,
      [category]: prev[category].filter((_, current) => current !== index)
    }));
  };

  const buildEntry = (status: EntryStatus): ActivityEntry => ({
    uniqueId: buildId(entries, form.date),
    status,
    date: form.date,
    project: form.project,
    activityName: form.activityName,
    activityType: form.activityType,
    activityCode: form.activityCode,
    venue: form.venue,
    district: form.district,
    upazila: form.upazila,
    union: form.union,
    implementedBy: form.implementedBy,
    participants,
    totalMale,
    totalFemale,
    grandTotal,
    totalBudget: form.budget,
    totalExpenses: form.expenses,
    variance,
    referenceLink: form.referenceLink,
    notes: form.notes,
    aiReport: form.aiReport,
    attachments: toAttachments(filesByCategory),
    createdBy: user?.username ?? "unknown",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    submittedAt: status === "Draft" ? undefined : new Date().toISOString()
  });

  const reset = () => {
    setForm({
      date: todayIso,
      project: firstProject.project,
      activityName: firstActivity.name,
      activityCode: firstActivity.code,
      activityType: firstActivity.type,
      venue: venueChoices[0],
      implementedBy: implementedByChoices[0],
      district: firstDistrict.district,
      upazila: firstDistrict.upazilas[0].name,
      union: firstDistrict.upazilas[0].unions[0],
      referenceLink: "",
      notes: "",
      aiReport: "",
      budget: 0,
      expenses: 0
    });
    setParticipants(initParticipants(firstProject.project));
    setFilesByCategory({
      "Implementation Plan": [],
      "Participants List": [],
      "Press Release": [],
      "Activity Report": [],
      "Bill Voucher": [],
      Photos: []
    });
    setConfirmed(false);
  };

  const onSaveDraft = () => {
    if (savingDraft) return;
    setSavingDraft(true);
    const entry = buildEntry("Draft");
    addEntry(entry);
    setTimeout(() => {
      setSavingDraft(false);
      window.alert(`Draft saved: ${entry.uniqueId}`);
    }, 500);
  };

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (!confirmed || submitting) return;
    setSubmitting(true);
    const entry = buildEntry("Submitted");
    addEntry(entry);

    setTimeout(() => {
      setSubmitting(false);
      setSuccessEntry(entry);
      reset();
    }, 1200);
  };

  return (
    <>
      {submitting && (
        <div className="blocking-loader">
          <div className="panel-card text-center">
            <div className="spinner-border text-success mb-2" role="status" />
            <p className="mb-0">Submitting activity and uploading files...</p>
          </div>
        </div>
      )}

      {successEntry && (
        <div className="modal-overlay">
          <div className="success-modal">
            <h3 className="mb-2">Activity Submitted Successfully</h3>
            <p className="text-muted mb-3">Unique ID: {successEntry.uniqueId}</p>
            <div className="success-grid">
              <div><small>Project</small><p>{successEntry.project}</p></div>
              <div><small>Activity</small><p>{successEntry.activityName}</p></div>
              <div><small>Budget</small><p>{formatCurrency(successEntry.totalBudget)}</p></div>
              <div><small>Male / Female</small><p>{successEntry.totalMale} / {successEntry.totalFemale}</p></div>
              <div><small>Total Files</small><p>{successEntry.attachments.length}</p></div>
              <div><small>Total Photos</small><p>{successEntry.attachments.filter((item) => item.category === "Photos").length}</p></div>
            </div>
            <button className="primary-btn w-100" onClick={() => setSuccessEntry(null)}>Continue</button>
          </div>
        </div>
      )}

      <form className="activity-form-layout" onSubmit={onSubmit}>
        <section>
          <header className="page-heading d-flex justify-content-between align-items-start flex-wrap gap-3">
            <div>
              <h1 className="page-title">Activity Entry Form</h1>
              <p className="page-subtitle mb-1">ID: <strong className="text-success mono">{generatedId}</strong> - Date: {form.date}</p>
            </div>
            <div className="d-flex gap-2">
              <button className="outline-btn" type="button" onClick={onSaveDraft}><i className="bi bi-cloud-arrow-down" /> {savingDraft ? "Saving..." : "Save Draft"}</button>
              <button type="button" className="outline-btn"><i className="bi bi-translate" /> Bangla</button>
            </div>
          </header>

          <div className="d-grid gap-3">
            <article className="section-card">
              <button className="section-header" type="button" onClick={() => setOpen((prev) => ({ ...prev, info: !prev.info }))}>
                <span className="section-title-wrap"><span className="section-index">1</span><i className="bi bi-file-earmark-text" /><span>Activity Info</span></span>
                <i className={clsx("bi", open.info ? "bi-chevron-up" : "bi-chevron-down")} />
              </button>
              {open.info && (
                <div className="section-body">
                  <div className="row g-3">
                    <div className="col-md-6"><label className="form-label">Activity Date</label><input type="date" className="form-control premium-input" value={form.date} onChange={(e) => setForm((prev) => ({ ...prev, date: e.target.value }))} /></div>
                    <div className="col-md-6"><label className="form-label">Activity ID</label><input className="form-control premium-input" value={generatedId} readOnly /></div>
                    <div className="col-md-4"><label className="form-label">Project *</label><select className="form-select premium-input" value={form.project} onChange={(e) => setProject(e.target.value)}>{projectActivityMap.map((item) => <option key={item.project}>{item.project}</option>)}</select></div>
                    <div className="col-md-4"><label className="form-label">Activity *</label><select className="form-select premium-input" value={form.activityName} onChange={(e) => setActivity(e.target.value)}>{projectMap.activities.map((item) => <option key={item.name}>{item.name}</option>)}</select></div>
                    <div className="col-md-4"><label className="form-label">Activity Code *</label><input className="form-control premium-input" value={form.activityCode} readOnly /></div>
                    <div className="col-md-6">
                      <label className="form-label">Venue *</label>
                      <input className="form-control premium-input" list="venue-options" value={form.venue} onChange={(e) => setForm((prev) => ({ ...prev, venue: e.target.value }))} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); const value = form.venue.trim(); if (value && !venueChoices.includes(value)) setVenueChoices((prev) => [...prev, value]); } }} />
                      <datalist id="venue-options">{venueChoices.map((item) => <option key={item} value={item} />)}</datalist>
                    </div>
                    <div className="col-md-6">
                      <label className="form-label">Implemented By *</label>
                      <input className="form-control premium-input" list="implemented-options" value={form.implementedBy} onChange={(e) => setForm((prev) => ({ ...prev, implementedBy: e.target.value }))} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); const value = form.implementedBy.trim(); if (value && !implementedByChoices.includes(value)) setImplementedByChoices((prev) => [...prev, value]); } }} />
                      <datalist id="implemented-options">{implementedByChoices.map((item) => <option key={item} value={item} />)}</datalist>
                    </div>
                    <div className="col-md-4"><label className="form-label">District *</label><select className="form-select premium-input" value={form.district} onChange={(e) => setDistrict(e.target.value)}>{locations.map((item) => <option key={item.district}>{item.district}</option>)}</select></div>
                    <div className="col-md-4"><label className="form-label">Upazila *</label><select className="form-select premium-input" value={form.upazila} onChange={(e) => setUpazila(e.target.value)}>{upazilaList.map((item) => <option key={item}>{item}</option>)}</select></div>
                    <div className="col-md-4"><label className="form-label">Union *</label><select className="form-select premium-input" value={form.union} onChange={(e) => setForm((prev) => ({ ...prev, union: e.target.value }))}>{unionList.map((item) => <option key={item}>{item}</option>)}</select></div>
                  </div>
                </div>
              )}
            </article>

            <article className="section-card">
              <button className="section-header" type="button" onClick={() => setOpen((prev) => ({ ...prev, participants: !prev.participants }))}>
                <span className="section-title-wrap"><span className="section-index">2</span><i className="bi bi-people" /><span>Participants</span></span>
                <i className={clsx("bi", open.participants ? "bi-chevron-up" : "bi-chevron-down")} />
              </button>
              {open.participants && (
                <div className="section-body">
                  <p className="text-muted mb-3">Enter participant counts by category and gender. Totals are calculated automatically.</p>
                  <div className="participant-table">
                    <div className="participant-head"><span>Category</span><span>Male</span><span>Female</span></div>
                    {participants.map((row) => (
                      <div key={row.categoryKey} className="participant-row">
                        <div className="participant-label"><span className="dot" /> {row.categoryLabel}</div>
                        <div className="counter-group">
                          <button type="button" className="counter-btn" onClick={() => updateCount(row.categoryKey, "male", row.male - 1)}>-</button>
                          <input className="counter-input" type="number" min={0} value={row.male} onChange={(e) => updateCount(row.categoryKey, "male", Number(e.target.value) || 0)} />
                          <button type="button" className="counter-btn" onClick={() => updateCount(row.categoryKey, "male", row.male + 1)}>+</button>
                        </div>
                        <div className="counter-group">
                          <button type="button" className="counter-btn" onClick={() => updateCount(row.categoryKey, "female", row.female - 1)}>-</button>
                          <input className="counter-input" type="number" min={0} value={row.female} onChange={(e) => updateCount(row.categoryKey, "female", Number(e.target.value) || 0)} />
                          <button type="button" className="counter-btn" onClick={() => updateCount(row.categoryKey, "female", row.female + 1)}>+</button>
                        </div>
                      </div>
                    ))}
                    <div className="participant-total-row"><strong>Total</strong><strong>{totalMale}</strong><strong>{totalFemale}</strong></div>
                  </div>
                </div>
              )}
            </article>

            <article className="section-card">
              <button className="section-header" type="button" onClick={() => setOpen((prev) => ({ ...prev, financial: !prev.financial }))}>
                <span className="section-title-wrap"><span className="section-index">3</span><i className="bi bi-cash-coin" /><span>Financial</span></span>
                <i className={clsx("bi", open.financial ? "bi-chevron-up" : "bi-chevron-down")} />
              </button>
              {open.financial && (
                <div className="section-body">
                  <p className="text-muted mb-3">Enter financial details in BDT. Variance is calculated automatically.</p>
                  <div className="row g-3">
                    <div className="col-md-6"><label className="form-label">Approved Budget (BDT) *</label><input type="number" className="form-control premium-input" min={0} value={form.budget} onChange={(e) => setForm((prev) => ({ ...prev, budget: Number(e.target.value) || 0 }))} /><small className="text-muted">{formatCurrency(form.budget)}</small></div>
                    <div className="col-md-6"><label className="form-label">Actual Expenses (BDT) *</label><input type="number" className="form-control premium-input" min={0} value={form.expenses} onChange={(e) => setForm((prev) => ({ ...prev, expenses: Number(e.target.value) || 0 }))} /><small className="text-muted">{formatCurrency(form.expenses)}</small></div>
                  </div>
                  <div className="financial-cards mt-3">
                    <article className="financial-card"><p className="metric-label">Remaining</p><p className={clsx("metric-value", form.expenses > form.budget && "text-danger")}>{formatCurrency(form.budget - form.expenses)}</p></article>
                    <article className="financial-card"><p className="metric-label">Utilization</p><p className="metric-value">{utilization.toFixed(1)}%</p><div className="progress premium-progress"><div className={clsx("progress-bar", utilization > 100 ? "bg-danger" : "bg-success")} style={{ width: `${Math.min(utilization, 100)}%` }} /></div></article>
                    <article className="financial-card"><p className="metric-label">Variance</p><p className={clsx("metric-value", variance < 0 ? "text-danger" : "text-success")}>{variance.toFixed(1)}%</p></article>
                  </div>
                </div>
              )}
            </article>

            <article className="section-card">
              <button className="section-header" type="button" onClick={() => setOpen((prev) => ({ ...prev, uploads: !prev.uploads }))}>
                <span className="section-title-wrap"><span className="section-index">4</span><i className="bi bi-paperclip" /><span>Uploads & Notes</span></span>
                <i className={clsx("bi", open.uploads ? "bi-chevron-up" : "bi-chevron-down")} />
              </button>
              {open.uploads && (
                <div className="section-body">
                  <div className="upload-grid">
                    {uploadCategories.map((category) => (
                      <article className="upload-card" key={category}>
                        <div className="d-flex justify-content-between align-items-center mb-2"><p className="mb-0 fw-semibold">{category}</p><span className="badge-count">{filesByCategory[category].length}</span></div>
                        <label className="upload-zone"><i className="bi bi-upload" /> Upload<input type="file" multiple className="d-none" onChange={(e) => onFileChange(category, e.target.files)} /></label>
                        <div className="d-grid gap-2 mt-2">
                          {filesByCategory[category].map((file, index) => (
                            <div className="file-chip" key={`${file.name}-${index}`}>
                              <div className="d-flex align-items-center gap-2 text-truncate"><i className={clsx("bi", file.type.startsWith("image/") ? "bi-image" : "bi-file-earmark-text")} /><span className="text-truncate">{file.name}</span></div>
                              <button type="button" className="chip-close" onClick={() => removeFile(category, index)}><i className="bi bi-x" /></button>
                            </div>
                          ))}
                        </div>
                      </article>
                    ))}
                  </div>

                  <div className="row g-3 mt-2">
                    <div className="col-12"><label className="form-label">Reference Link</label><input className="form-control premium-input" placeholder="https://" value={form.referenceLink} onChange={(e) => setForm((prev) => ({ ...prev, referenceLink: e.target.value }))} /></div>
                    <div className="col-12"><label className="form-label">Activity Notes / Observations</label><textarea className="form-control premium-input" rows={4} value={form.notes} onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))} /></div>
                    <div className="col-12">
                      <article className="ai-card">
                        <div className="d-flex justify-content-between align-items-start gap-3 mb-2">
                          <div><h3 className="h6 mb-1">AI Narrative Report</h3><p className="text-muted mb-0">Auto-generate based on form data</p></div>
                          <button className="primary-btn" type="button" onClick={() => setForm((prev) => ({ ...prev, aiReport: buildNarrative(prev, participants, attachmentCount) }))}><i className="bi bi-stars" /> Generate</button>
                        </div>
                        <textarea className="form-control premium-input" rows={6} value={form.aiReport} onChange={(e) => setForm((prev) => ({ ...prev, aiReport: e.target.value }))} />
                        <button className="text-btn mt-2" type="button" onClick={() => setForm((prev) => ({ ...prev, notes: prev.aiReport }))}><i className="bi bi-arrow-down-circle" /> Use as notes</button>
                      </article>
                    </div>
                  </div>
                </div>
              )}
            </article>

            <article className="section-card">
              <div className="section-body">
                <label className="confirm-box"><input type="checkbox" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} /><span>I confirm that all the information provided above is accurate and complete.</span></label>
                <button className="primary-btn submit-btn w-100 mt-3" type="submit" disabled={!confirmed || submitting}><i className="bi bi-send-fill" /> Submit Activity</button>
              </div>
            </article>
          </div>
        </section>

        <aside className="live-summary">
          <div className="panel-card sticky-panel">
            <h2 className="summary-title"><i className="bi bi-journal-text" /> Live Summary</h2>
            <div className="summary-block">
              <p className="summary-label">Participants</p>
              <p className="summary-total">{grandTotal}</p>
              <div className="gender-grid"><div className="gender-pill male"><strong>{totalMale}</strong><span>Male</span></div><div className="gender-pill female"><strong>{totalFemale}</strong><span>Female</span></div></div>
            </div>
            <div className="summary-block">
              <p className="summary-label">Financial</p>
              <div className="summary-row"><span>Budget</span><strong>{formatCurrency(form.budget)}</strong></div>
              <div className="summary-row"><span>Expenses</span><strong className={clsx(form.expenses > form.budget && "text-danger")}>{formatCurrency(form.expenses)}</strong></div>
              <div className="summary-row border-top pt-2 mt-2"><span>Variance</span><strong className={clsx(variance < 0 ? "text-danger" : "text-success")}>{variance.toFixed(1)}%</strong></div>
              <div className="progress premium-progress mt-2"><div className={clsx("progress-bar", utilization > 100 ? "bg-danger" : "bg-success")} style={{ width: `${Math.min(utilization, 100)}%` }} /></div>
            </div>
            <div className="summary-block"><div className="summary-row"><span><i className="bi bi-paperclip" /> Attachments</span><strong>{attachmentCount}</strong></div></div>
            <p className="summary-note"><i className="bi bi-info-circle" /> Complete all sections and confirm before submitting.</p>
          </div>
        </aside>
      </form>
    </>
  );
};

