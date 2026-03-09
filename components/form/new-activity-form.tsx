"use client";

import { FormEvent, useMemo, useState } from "react";
import clsx from "clsx";
import { useRouter } from "next/navigation";
import { useAppContext } from "@/components/providers/app-context";
import { calcUtilization, calcVariance, formatCurrency } from "@/lib/format";
import { ActivityAttachment, ActivityEntry, AttachmentCategory, EntryStatus, ParticipantLine, ProjectActivityMap } from "@/lib/types";

const uploadCategories: AttachmentCategory[] = ["Implementation Plan", "Participants List", "Press Release", "Activity Report", "Bill Voucher", "Photos"];
const docUploadCategories: AttachmentCategory[] = ["Implementation Plan", "Participants List", "Press Release", "Activity Report", "Bill Voucher"];
const todayIso = new Date().toISOString().slice(0, 10);

type FormState = { date: string; project: string; activityName: string; activityCode: string; activityType: string; venue: string; implementedBy: string; district: string; upazila: string; union: string; referenceLink: string; notes: string; aiReport: string; budget: string; expenses: string; };
type UploadedItem = { file: File; previewUrl: string | null };

const initParticipants = (maps: ProjectActivityMap[], project: string): ParticipantLine[] => {
  const map = maps.find((item) => item.project === project);
  if (!map) return [];
  return map.participantCategories.map((c) => ({ categoryKey: c.key, categoryLabel: c.label, male: 0, female: 0 }));
};

const toAttachments = (filesByCategory: Record<AttachmentCategory, UploadedItem[]>) => {
  const list: ActivityAttachment[] = [];
  uploadCategories.forEach((category) => {
    (filesByCategory[category] || []).forEach((item) => list.push({ id: `file-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`, category, name: item.file.name, url: item.previewUrl || "#", type: item.file.type.startsWith("image/") ? "image" : "document", sizeKb: Math.round(item.file.size / 1024) }));
  });
  return list;
};

const shortFileName = (name: string, max = 10) => (name.length <= max ? name : `${name.slice(0, max)}...`);
const moneyInput = (value: string) => value.replace(/[^\d]/g, "");

const buildNarrative = (form: FormState, participants: ParticipantLine[], attachmentCount: number, budgetValue: number, expenseValue: number) => {
  const male = participants.reduce((sum, item) => sum + item.male, 0);
  const female = participants.reduce((sum, item) => sum + item.female, 0);
  const total = male + female;
  return [
    `On ${form.date}, PRAAN conducted ${form.activityName || "the selected activity"} under ${form.project || "the selected project"} at ${form.venue || "the selected venue"}.`,
    `Implementation was led by ${form.implementedBy || "the assigned implementing team"} in ${form.district || "district"}, ${form.upazila || "upazila"}, ${form.union || "union"}.`,
    `A total of ${total} participants attended, including ${male} male and ${female} female participants across approved project categories.`,
    `The approved budget was ${formatCurrency(budgetValue)} and the expense recorded was ${formatCurrency(expenseValue)}, resulting in a variance of ${calcVariance(budgetValue, expenseValue).toFixed(1)} percent.`,
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
  const router = useRouter();
  const { user, entries, addEntry, projectMap, locationMap, venueOptions, implementedByOptions, setVenueOptions, setImplementedByOptions, notify } = useAppContext();
  const [form, setForm] = useState<FormState>({ date: todayIso, project: "", activityName: "", activityCode: "", activityType: "", venue: "", implementedBy: "", district: "", upazila: "", union: "", referenceLink: "", notes: "", aiReport: "", budget: "", expenses: "" });
  const [participants, setParticipants] = useState<ParticipantLine[]>([]);
  const [filesByCategory, setFilesByCategory] = useState<Record<AttachmentCategory, UploadedItem[]>>({ "Implementation Plan": [], "Participants List": [], "Press Release": [], "Activity Report": [], "Bill Voucher": [], Photos: [] });
  const [confirmed, setConfirmed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const [successEntry, setSuccessEntry] = useState<ActivityEntry | null>(null);
  const [open, setOpen] = useState({ info: true, participants: true, financial: true, uploads: true });

  const selectedProjectMap = projectMap.find((item) => item.project === form.project);
  const selectedDistrictMap = locationMap.find((item) => item.district === form.district);
  const upazilaList = selectedDistrictMap ? selectedDistrictMap.upazilas.map((item) => item.name) : [];
  const selectedUpazila = selectedDistrictMap?.upazilas.find((item) => item.name === form.upazila);
  const unionList = selectedUpazila?.unions ?? [];
  const budgetValue = Number(form.budget || 0);
  const expenseValue = Number(form.expenses || 0);
  const totalMale = participants.reduce((sum, row) => sum + row.male, 0);
  const totalFemale = participants.reduce((sum, row) => sum + row.female, 0);
  const grandTotal = totalMale + totalFemale;
  const attachmentCount = uploadCategories.reduce((sum, key) => sum + (filesByCategory[key]?.length || 0), 0);
  const variance = calcVariance(budgetValue, expenseValue);
  const utilization = calcUtilization(budgetValue, expenseValue);
  const generatedId = useMemo(() => buildId(entries, form.date), [entries, form.date]);

  const addVenueChoice = (value: string) => { const item = value.trim(); if (item && !venueOptions.includes(item)) setVenueOptions([...venueOptions, item]); };
  const addImplementedByChoice = (value: string) => { const item = value.trim(); if (item && !implementedByOptions.includes(item)) setImplementedByOptions([...implementedByOptions, item]); };
  const setProject = (project: string) => { const map = projectMap.find((item) => item.project === project); const firstActivity = map?.activities[0]; setForm((prev) => ({ ...prev, project, activityName: firstActivity?.name || "", activityCode: firstActivity?.code || "", activityType: firstActivity?.type || "" })); setParticipants(project ? initParticipants(projectMap, project) : []); };
  const setActivity = (activityName: string) => { if (!selectedProjectMap) return; const selected = selectedProjectMap.activities.find((item) => item.name === activityName); setForm((prev) => ({ ...prev, activityName: selected?.name || "", activityCode: selected?.code || "", activityType: selected?.type || "" })); };
  const setDistrict = (district: string) => { if (!district) { setForm((prev) => ({ ...prev, district: "", upazila: "", union: "" })); return; } const selected = locationMap.find((item) => item.district === district); const firstUpazila = selected?.upazilas[0]; setForm((prev) => ({ ...prev, district, upazila: firstUpazila?.name || "", union: firstUpazila?.unions[0] || "" })); };
  const setUpazila = (upazila: string) => { if (!selectedDistrictMap || !upazila) { setForm((prev) => ({ ...prev, upazila: "", union: "" })); return; } const selected = selectedDistrictMap.upazilas.find((item) => item.name === upazila); setForm((prev) => ({ ...prev, upazila: selected?.name || "", union: selected?.unions[0] || "" })); };
  const updateCount = (key: string, field: "male" | "female", value: number) => setParticipants((prev) => prev.map((row) => (row.categoryKey === key ? { ...row, [field]: Math.max(0, value) } : row)));
  const onFileChange = (category: AttachmentCategory, list: FileList | null) => { const files = list ? Array.from(list) : []; const nextItems: UploadedItem[] = files.map((file) => ({ file, previewUrl: file.type.startsWith("image/") ? URL.createObjectURL(file) : null })); setFilesByCategory((prev) => ({ ...prev, [category]: [...prev[category], ...nextItems] })); };
  const removeFile = (category: AttachmentCategory, index: number) => setFilesByCategory((prev) => ({ ...prev, [category]: prev[category].filter((item, current) => { if (current !== index) return true; if (item.previewUrl) URL.revokeObjectURL(item.previewUrl); return false; }) }));

  const buildEntry = (status: EntryStatus): ActivityEntry => ({ uniqueId: buildId(entries, form.date), status, date: form.date, project: form.project, activityName: form.activityName, activityType: form.activityType, activityCode: form.activityCode, venue: form.venue, district: form.district, upazila: form.upazila, union: form.union, implementedBy: form.implementedBy, participants, totalMale, totalFemale, grandTotal, totalBudget: budgetValue, totalExpenses: expenseValue, variance, referenceLink: form.referenceLink, notes: form.notes, aiReport: form.aiReport, attachments: toAttachments(filesByCategory), createdBy: user?.username ?? "unknown", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), submittedAt: status === "Draft" ? undefined : new Date().toISOString() });
  const reset = () => {
    setForm({ date: todayIso, project: "", activityName: "", activityCode: "", activityType: "", venue: "", implementedBy: "", district: "", upazila: "", union: "", referenceLink: "", notes: "", aiReport: "", budget: "", expenses: "" });
    setParticipants([]);
    setFilesByCategory((prev) => {
      uploadCategories.forEach((category) => prev[category].forEach((item) => item.previewUrl && URL.revokeObjectURL(item.previewUrl)));
      return { "Implementation Plan": [], "Participants List": [], "Press Release": [], "Activity Report": [], "Bill Voucher": [], Photos: [] };
    });
    setConfirmed(false);
  };
  const onSaveDraft = () => { if (savingDraft) return; setSavingDraft(true); const entry = buildEntry("Draft"); addEntry(entry); setTimeout(() => { setSavingDraft(false); notify(`Draft saved: ${entry.uniqueId}`, "success"); }, 400); };
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
      window.scrollTo({ top: 0, behavior: "smooth" });
    }, 1100);
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
          <div className="success-modal success-modal-glitter">
            <button className="icon-btn success-close-btn" onClick={() => setSuccessEntry(null)} aria-label="Close">
              <i className="bi bi-x-lg" />
            </button>
            <div className="success-burst" aria-hidden="true">
              <i className="bi bi-check2-circle" />
            </div>
            <h3 className="mb-2">Activity Submitted Successfully</h3>
            <p className="text-muted mb-3">Unique ID: {successEntry.uniqueId}</p>
            <div className="success-grid">
              <div><small>Project</small><p>{successEntry.project || "-"}</p></div>
              <div><small>Activity</small><p>{successEntry.activityName || "-"}</p></div>
              <div><small>Budget</small><p>{formatCurrency(successEntry.totalBudget)}</p></div>
              <div><small>Male / Female</small><p>{successEntry.totalMale} / {successEntry.totalFemale}</p></div>
              <div><small>Total Files</small><p>{successEntry.attachments.length}</p></div>
              <div><small>Total Photos</small><p>{successEntry.attachments.filter((item) => item.category === "Photos").length}</p></div>
            </div>
            <div className="d-grid gap-2">
              <button className="primary-btn w-100" onClick={() => setSuccessEntry(null)}>
                New Entry
              </button>
              <button
                className="outline-btn w-100"
                onClick={() => {
                  const entryId = successEntry.uniqueId;
                  setSuccessEntry(null);
                  router.push(`/activities?entry=${encodeURIComponent(entryId)}`);
                }}
              >
                View Entry
              </button>
            </div>
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
                    <div className="col-md-4">
                      <label className="form-label">Project *</label>
                      <select className="form-select premium-input" value={form.project} onChange={(e) => setProject(e.target.value)}>
                        <option value="">Select project</option>
                        {projectMap.map((item) => <option key={item.project} value={item.project}>{item.project}</option>)}
                      </select>
                    </div>
                    <div className="col-md-4">
                      <label className="form-label">Activity *</label>
                      <select className="form-select premium-input" value={form.activityName} onChange={(e) => setActivity(e.target.value)} disabled={!selectedProjectMap}>
                        <option value="">{selectedProjectMap ? "Select activity" : "Select project first"}</option>
                        {selectedProjectMap?.activities.map((item) => <option key={item.name} value={item.name}>{item.name}</option>)}
                      </select>
                    </div>
                    <div className="col-md-4"><label className="form-label">Activity Code *</label><input className="form-control premium-input" value={form.activityCode} readOnly /></div>
                    <div className="col-md-6">
                      <label className="form-label">Venue *</label>
                      <input className="form-control premium-input" list="venue-options" value={form.venue} onChange={(e) => setForm((prev) => ({ ...prev, venue: e.target.value }))} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addVenueChoice(form.venue); } }} />
                      <datalist id="venue-options">{venueOptions.map((item) => <option key={item} value={item} />)}</datalist>
                    </div>
                    <div className="col-md-6">
                      <label className="form-label">Implemented By *</label>
                      <input className="form-control premium-input" list="implemented-options" value={form.implementedBy} onChange={(e) => setForm((prev) => ({ ...prev, implementedBy: e.target.value }))} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addImplementedByChoice(form.implementedBy); } }} />
                      <datalist id="implemented-options">{implementedByOptions.map((item) => <option key={item} value={item} />)}</datalist>
                    </div>
                    <div className="col-md-4">
                      <label className="form-label">District *</label>
                      <select className="form-select premium-input" value={form.district} onChange={(e) => setDistrict(e.target.value)}>
                        <option value="">Select district</option>
                        {locationMap.map((item) => <option key={item.district} value={item.district}>{item.district}</option>)}
                      </select>
                    </div>
                    <div className="col-md-4">
                      <label className="form-label">Upazila *</label>
                      <select className="form-select premium-input" value={form.upazila} onChange={(e) => setUpazila(e.target.value)} disabled={!upazilaList.length}>
                        <option value="">{upazilaList.length ? "Select upazila" : "Select district first"}</option>
                        {upazilaList.map((item) => <option key={item} value={item}>{item}</option>)}
                      </select>
                    </div>
                    <div className="col-md-4">
                      <label className="form-label">Union *</label>
                      <select className="form-select premium-input" value={form.union} onChange={(e) => setForm((prev) => ({ ...prev, union: e.target.value }))} disabled={!unionList.length}>
                        <option value="">{unionList.length ? "Select union" : "Select upazila first"}</option>
                        {unionList.map((item) => <option key={item} value={item}>{item}</option>)}
                      </select>
                    </div>
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
                  {!participants.length && <div className="empty-participant-state">Select a project first to load participant categories for that project.</div>}
                  {!!participants.length && (
                    <>
                      <div className="participant-table participant-desktop">
                        <div className="participant-head"><span>Category</span><span>Male</span><span>Female</span><span>Total</span></div>
                        {participants.map((row) => (
                          <div key={row.categoryKey} className="participant-row">
                            <div className="participant-label"><span className="dot" /> {row.categoryLabel}</div>
                            <div className="counter-group">
                              <button tabIndex={-1} type="button" className="counter-btn" onClick={() => updateCount(row.categoryKey, "male", row.male - 1)}>-</button>
                              <input className="counter-input" type="number" min={0} value={row.male} onFocus={(e) => e.currentTarget.select()} onChange={(e) => updateCount(row.categoryKey, "male", Number(e.target.value || 0))} />
                              <button tabIndex={-1} type="button" className="counter-btn" onClick={() => updateCount(row.categoryKey, "male", row.male + 1)}>+</button>
                            </div>
                            <div className="counter-group">
                              <button tabIndex={-1} type="button" className="counter-btn" onClick={() => updateCount(row.categoryKey, "female", row.female - 1)}>-</button>
                              <input className="counter-input" type="number" min={0} value={row.female} onFocus={(e) => e.currentTarget.select()} onChange={(e) => updateCount(row.categoryKey, "female", Number(e.target.value || 0))} />
                              <button tabIndex={-1} type="button" className="counter-btn" onClick={() => updateCount(row.categoryKey, "female", row.female + 1)}>+</button>
                            </div>
                            <div className="participant-row-total">{row.male + row.female}</div>
                          </div>
                        ))}
                        <div className="participant-total-row"><strong>Total</strong><strong>{totalMale}</strong><strong>{totalFemale}</strong><strong>{grandTotal}</strong></div>
                      </div>

                      <div className="participant-mobile-list">
                        {participants.map((row) => (
                          <article key={row.categoryKey} className="participant-mobile-card">
                            <p className="participant-mobile-title"><span className="dot" /> {row.categoryLabel}</p>
                            <div className="participant-mobile-controls">
                              <div>
                                <p className="participant-mobile-label">Male</p>
                                <div className="counter-group">
                                  <button tabIndex={-1} type="button" className="counter-btn" onClick={() => updateCount(row.categoryKey, "male", row.male - 1)}>-</button>
                                  <input className="counter-input" type="number" min={0} value={row.male} onFocus={(e) => e.currentTarget.select()} onChange={(e) => updateCount(row.categoryKey, "male", Number(e.target.value || 0))} />
                                  <button tabIndex={-1} type="button" className="counter-btn" onClick={() => updateCount(row.categoryKey, "male", row.male + 1)}>+</button>
                                </div>
                              </div>
                              <div>
                                <p className="participant-mobile-label">Female</p>
                                <div className="counter-group">
                                  <button tabIndex={-1} type="button" className="counter-btn" onClick={() => updateCount(row.categoryKey, "female", row.female - 1)}>-</button>
                                  <input className="counter-input" type="number" min={0} value={row.female} onFocus={(e) => e.currentTarget.select()} onChange={(e) => updateCount(row.categoryKey, "female", Number(e.target.value || 0))} />
                                  <button tabIndex={-1} type="button" className="counter-btn" onClick={() => updateCount(row.categoryKey, "female", row.female + 1)}>+</button>
                                </div>
                              </div>
                            </div>
                            <p className="participant-mobile-total-line">Total: {row.male + row.female}</p>
                          </article>
                        ))}
                        <article className="participant-mobile-total">
                          <p className="mb-1 fw-semibold">Total</p>
                          <div className="d-flex justify-content-between"><span>Male: {totalMale}</span><span>Female: {totalFemale}</span></div>
                          <div className="mt-1 fw-semibold">Grand Total: {grandTotal}</div>
                        </article>
                      </div>
                    </>
                  )}
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
                    <div className="col-md-6"><label className="form-label">Approved Budget (BDT) *</label><input type="text" inputMode="numeric" className="form-control premium-input" placeholder="0" value={form.budget} onChange={(e) => setForm((prev) => ({ ...prev, budget: moneyInput(e.target.value) }))} /><small className="text-muted">{formatCurrency(budgetValue)}</small></div>
                    <div className="col-md-6"><label className="form-label">Actual Expenses (BDT) *</label><input type="text" inputMode="numeric" className="form-control premium-input" placeholder="0" value={form.expenses} onChange={(e) => setForm((prev) => ({ ...prev, expenses: moneyInput(e.target.value) }))} /><small className="text-muted">{formatCurrency(expenseValue)}</small></div>
                  </div>
                  <div className="financial-cards mt-3">
                    <article className="financial-card"><p className="metric-label">Remaining</p><p className={clsx("metric-value", expenseValue > budgetValue && "text-danger")}>{formatCurrency(budgetValue - expenseValue)}</p>{expenseValue > budgetValue && <small className="text-danger">Over budget</small>}</article>
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
                    {docUploadCategories.map((category) => (
                      <article className="upload-card" key={category}>
                        <div className="d-flex justify-content-between align-items-center mb-2"><p className="mb-0 fw-semibold">{category}</p><span className="badge-count">{filesByCategory[category].length}</span></div>
                        <label className="upload-zone"><i className="bi bi-upload" /> Upload<input type="file" multiple className="d-none" onChange={(e) => onFileChange(category, e.target.files)} /></label>
                        <div className="d-grid gap-2 mt-2">
                          {filesByCategory[category].map((item, index) => (
                            <div className="file-chip" key={`${item.file.name}-${index}`}>
                              <div className="file-chip-main">
                                <span className="file-mini-thumb">{item.previewUrl ? <img src={item.previewUrl} alt={item.file.name} /> : <i className="bi bi-file-earmark-richtext file-type-icon" />}</span>
                                <span className="file-name-short" title={item.file.name}>{shortFileName(item.file.name, 10)}</span>
                              </div>
                              <button type="button" className="chip-close" onClick={() => removeFile(category, index)} aria-label="Remove file"><i className="bi bi-x" /></button>
                            </div>
                          ))}
                        </div>
                      </article>
                    ))}
                  </div>

                  <article className="upload-card photo-upload-card mt-3">
                    <div className="d-flex justify-content-between align-items-center mb-2"><p className="mb-0 fw-semibold">Photos</p><span className="badge-count">{filesByCategory.Photos.length}</span></div>
                    <label className="upload-zone mb-2"><i className="bi bi-image" /> Upload Photos<input type="file" accept="image/*" multiple className="d-none" onChange={(e) => onFileChange("Photos", e.target.files)} /></label>
                    <div className="photo-preview-grid">
                      {filesByCategory.Photos.map((item, index) => (
                        <div className="photo-preview-item" key={`${item.file.name}-${index}`}>
                          <div className="photo-preview-media">{item.previewUrl ? <img src={item.previewUrl} alt={item.file.name} /> : <span className="photo-fallback"><i className="bi bi-image" /></span>}</div>
                          <div className="d-flex justify-content-between align-items-start gap-2">
                            <span className="file-name-short" title={item.file.name}>{shortFileName(item.file.name, 10)}</span>
                            <button type="button" className="chip-close" onClick={() => removeFile("Photos", index)} aria-label="Remove photo"><i className="bi bi-x" /></button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </article>

                  <div className="row g-3 mt-2">
                    <div className="col-12"><label className="form-label">Reference Link</label><input className="form-control premium-input" placeholder="https://" value={form.referenceLink} onChange={(e) => setForm((prev) => ({ ...prev, referenceLink: e.target.value }))} /></div>
                    <div className="col-12"><label className="form-label">Activity Notes / Observations</label><textarea className="form-control premium-input" rows={4} value={form.notes} onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))} /></div>
                    <div className="col-12">
                      <article className="ai-card">
                        <div className="d-flex justify-content-between align-items-start gap-3 mb-2">
                          <div><h3 className="h6 mb-1">AI Narrative Report</h3><p className="text-muted mb-0">Auto-generate based on form data</p></div>
                          <button className="primary-btn" type="button" onClick={() => setForm((prev) => ({ ...prev, aiReport: buildNarrative(prev, participants, attachmentCount, budgetValue, expenseValue) }))}><i className="bi bi-stars" /> Generate</button>
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
              <div className="summary-row"><span>Budget</span><strong>{formatCurrency(budgetValue)}</strong></div>
              <div className="summary-row"><span>Expenses</span><strong className={clsx(expenseValue > budgetValue && "text-danger")}>{formatCurrency(expenseValue)}</strong></div>
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
