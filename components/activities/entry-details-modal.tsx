"use client";

import clsx from "clsx";
import { ActivityEntry } from "@/lib/types";
import { formatCurrency, formatDate, formatDateTime } from "@/lib/format";
import { StatusBadge } from "@/components/common/status-badge";
import { printEntryTextReport } from "@/lib/print-report";
import { getFileIconClass, isImageFileName } from "@/lib/file-icons";

type Props = {
  entry: ActivityEntry;
  onClose: () => void;
};

export const EntryDetailsModal = ({ entry, onClose }: Props) => {
  const utilization = entry.totalBudget ? (entry.totalExpenses / entry.totalBudget) * 100 : 0;
  const participantRows = entry.participants.filter((line) => line.male + line.female > 0);
  const groupedFiles = entry.attachments.reduce<Record<string, typeof entry.attachments>>((acc, file) => {
    if (!acc[file.category]) acc[file.category] = [];
    acc[file.category].push(file);
    return acc;
  }, {});

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true">
      <div className="entry-modal-card">
        <header className="entry-modal-head">
          <div>
            <div className="d-flex gap-3 align-items-center mb-1">
              <span className="entry-id">{entry.uniqueId}</span>
              <StatusBadge status={entry.status} />
            </div>
            <h3 className="modal-title mb-1">{entry.activityName}</h3>
            <p className="text-muted mb-0">
              {entry.project} - {entry.activityType}
            </p>
          </div>

          <div className="d-flex gap-2 align-items-start flex-wrap justify-content-end">
            <button className="outline-btn">
              <i className="bi bi-download" /> Export DOCX
            </button>
            <button className="outline-btn">
              <i className="bi bi-file-earmark-pdf" /> Export PDF
            </button>
            <button className="outline-btn" onClick={() => printEntryTextReport(entry)}>
              <i className="bi bi-printer" /> Print Text Report
            </button>
            <button className="icon-btn" onClick={onClose} aria-label="Close details">
              <i className="bi bi-x-lg" />
            </button>
          </div>
        </header>

        <section className="entry-modal-body">
          <article className="entry-report-sheet">
            <section className="entry-report-section">
              <h4 className="entry-report-title">1. Activity Overview</h4>
              <div className="entry-report-grid">
                <article className="entry-kv-card"><p>Date</p><strong>{formatDate(entry.date)}</strong></article>
                <article className="entry-kv-card"><p>Activity Type</p><strong>{entry.activityType}</strong></article>
                <article className="entry-kv-card"><p>Activity Code</p><strong>{entry.activityCode}</strong></article>
                <article className="entry-kv-card"><p>Venue</p><strong>{entry.venue}</strong></article>
                <article className="entry-kv-card"><p>Implemented By</p><strong>{entry.implementedBy}</strong></article>
                <article className="entry-kv-card"><p>Submitted By</p><strong>{entry.createdBy}</strong></article>
                <article className="entry-kv-card entry-kv-full">
                  <p>Location</p>
                  <strong>{entry.district} {" -> "} {entry.upazila} {" -> "} {entry.union}</strong>
                </article>
                <article className="entry-kv-card entry-kv-full">
                  <p>Reference Link</p>
                  <strong>{entry.referenceLink || "-"}</strong>
                </article>
              </div>
              <div className="entry-text-grid mt-3">
                <div>
                  <p className="entry-report-label">Notes</p>
                  <textarea className="form-control premium-input notes-preview-textarea" value={entry.notes || "-"} rows={4} readOnly />
                </div>
                <div>
                  <p className="entry-report-label">AI Narrative</p>
                  <textarea className="form-control premium-input notes-preview-textarea" value={entry.aiReport || "-"} rows={4} readOnly />
                </div>
              </div>
            </section>

            <section className="entry-report-section">
              <h4 className="entry-report-title">2. Participants</h4>
              <div className="entry-stats-grid">
                <article className="entry-stat"><p>Total</p><strong>{entry.grandTotal}</strong></article>
                <article className="entry-stat"><p>Male</p><strong>{entry.totalMale}</strong></article>
                <article className="entry-stat"><p>Female</p><strong>{entry.totalFemale}</strong></article>
              </div>
              <div className="table-responsive mt-3">
                <table className="table align-middle mb-0 premium-table small">
                  <thead>
                    <tr>
                      <th>Category</th>
                      <th>Male</th>
                      <th>Female</th>
                      <th>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {participantRows.length === 0 && (
                      <tr>
                        <td colSpan={4} className="text-muted">No non-zero participant rows.</td>
                      </tr>
                    )}
                    {participantRows.map((line) => (
                      <tr key={line.categoryKey}>
                        <td>{line.categoryLabel}</td>
                        <td>{line.male}</td>
                        <td>{line.female}</td>
                        <td>{line.male + line.female}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="entry-report-section">
              <h4 className="entry-report-title">3. Financial</h4>
              <div className="entry-stats-grid">
                <article className="entry-stat"><p>Budget</p><strong>{formatCurrency(entry.totalBudget)}</strong></article>
                <article className="entry-stat"><p>Expenses</p><strong>{formatCurrency(entry.totalExpenses)}</strong></article>
                <article className="entry-stat">
                  <p>Variance</p>
                  <strong className={clsx(entry.variance < 0 ? "text-danger" : "text-success")}>{entry.variance.toFixed(1)}%</strong>
                </article>
              </div>
              <div className="entry-utilization mt-3">
                <div className="d-flex justify-content-between small mb-2">
                  <span>Budget Utilization</span>
                  <strong>{utilization.toFixed(1)}%</strong>
                </div>
                <div className="progress premium-progress" role="progressbar" aria-valuemin={0} aria-valuemax={100}>
                  <div className={clsx("progress-bar", utilization > 100 ? "bg-danger" : "bg-success")} style={{ width: `${Math.min(100, utilization)}%` }} />
                </div>
              </div>
            </section>

            <section className="entry-report-section">
              <div className="d-flex justify-content-between align-items-center mb-3 gap-2 flex-wrap">
                <h4 className="entry-report-title mb-0">4. Files & Attachments</h4>
                <button className="outline-btn">
                  <i className="bi bi-file-zip" /> Download ZIP
                </button>
              </div>
              {entry.attachments.length === 0 && <p className="text-muted mb-0">No attachments uploaded.</p>}
              <div className="d-grid gap-3">
                {Object.entries(groupedFiles).map(([category, files]) => (
                  <article key={category} className="entry-file-group">
                    <div className="entry-file-group-head">
                      <strong>{category}</strong>
                      <span className="soft-badge">{files.length} file(s)</span>
                    </div>
                    <div className="entry-file-list">
                      {files.map((file) => (
                        <article key={file.id} className="attachment-item">
                          <div className="d-flex align-items-center gap-3">
                            <div className="file-thumb file-thumb-large">
                              {(file.type === "image" || isImageFileName(file.name)) && file.url !== "#" ? (
                                <img src={file.url} alt={file.name} />
                              ) : (
                                <i className={`bi ${getFileIconClass(file.name)} file-type-icon-large`} />
                              )}
                            </div>
                            <div className="min-w-0 flex-grow-1">
                              <p className="mb-0 fw-semibold text-truncate">{file.name}</p>
                              <small className="text-muted">{file.sizeKb} KB</small>
                            </div>
                          </div>
                          <div className="d-flex gap-2">
                            <button className="icon-btn" aria-label="Preview file">
                              <i className="bi bi-eye" />
                            </button>
                            <button className="icon-btn" aria-label="Download file">
                              <i className="bi bi-download" />
                            </button>
                          </div>
                        </article>
                      ))}
                    </div>
                  </article>
                ))}
              </div>
            </section>
          </article>
        </section>

        <footer className="entry-modal-footer">
          <small className="text-muted">
            Submitted: {entry.submittedAt ? formatDateTime(entry.submittedAt) : "Not submitted"} | Print mode: text report
          </small>
          <button className="outline-btn" onClick={onClose}>
            Close
          </button>
        </footer>
      </div>
    </div>
  );
};
