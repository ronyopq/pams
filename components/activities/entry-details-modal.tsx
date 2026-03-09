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

          <div className="d-flex gap-2 align-items-start">
            <button className="outline-btn">
              <i className="bi bi-download" /> Export DOCX
            </button>
            <button className="outline-btn">
              <i className="bi bi-file-earmark-pdf" /> Export PDF
            </button>
            <button className="outline-btn" onClick={() => printEntryTextReport(entry)}>
              <i className="bi bi-printer" /> Print Text
            </button>
            <button className="icon-btn" onClick={onClose} aria-label="Close details">
              <i className="bi bi-x-lg" />
            </button>
          </div>
        </header>

        <section className="entry-modal-body d-grid gap-3">
          <article className="field-card full">
            <h4 className="h6 mb-3">Overview</h4>
            <div className="detail-grid">
              <article className="field-card">
                <p className="field-label">Date</p>
                <p className="field-value">{formatDate(entry.date)}</p>
              </article>
              <article className="field-card">
                <p className="field-label">Activity Type</p>
                <p className="field-value">{entry.activityType}</p>
              </article>
              <article className="field-card">
                <p className="field-label">Activity Code</p>
                <p className="field-value">{entry.activityCode}</p>
              </article>
              <article className="field-card">
                <p className="field-label">Venue</p>
                <p className="field-value">{entry.venue}</p>
              </article>
              <article className="field-card">
                <p className="field-label">Implemented By</p>
                <p className="field-value">{entry.implementedBy}</p>
              </article>
              <article className="field-card">
                <p className="field-label">Submitted By</p>
                <p className="field-value">{entry.createdBy}</p>
              </article>
              <article className="field-card full">
                <p className="field-label">Location</p>
                <p className="field-value">
                  {entry.district} - {entry.upazila} - {entry.union}
                </p>
              </article>
              <article className="field-card full">
                <p className="field-label">Notes</p>
                <textarea
                  className="form-control premium-input notes-preview-textarea"
                  value={entry.notes || "-"}
                  rows={4}
                  readOnly
                />
              </article>
            </div>
          </article>

          <article className="field-card full">
            <h4 className="h6 mb-3">Participants</h4>
            <div className="summary-tiles mb-3">
              <article className="metric-tile">
                <p className="field-value mb-1">{entry.grandTotal}</p>
                <p className="field-label mb-0">Total</p>
              </article>
              <article className="metric-tile">
                <p className="field-value mb-1">{entry.totalMale}</p>
                <p className="field-label mb-0">Male</p>
              </article>
              <article className="metric-tile">
                <p className="field-value mb-1">{entry.totalFemale}</p>
                <p className="field-label mb-0">Female</p>
              </article>
            </div>
            <div className="table-responsive">
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
          </article>

          <article className="field-card full">
            <h4 className="h6 mb-3">Financial</h4>
            <div className="summary-tiles mb-3">
              <article className="metric-tile">
                <p className="field-label mb-1">Budget</p>
                <p className="field-value mb-0">{formatCurrency(entry.totalBudget)}</p>
              </article>
              <article className="metric-tile">
                <p className="field-label mb-1">Expenses</p>
                <p className="field-value mb-0">{formatCurrency(entry.totalExpenses)}</p>
              </article>
              <article className="metric-tile">
                <p className="field-label mb-1">Variance</p>
                <p className={clsx("field-value mb-0", entry.variance < 0 ? "text-danger" : "text-success")}>
                  {entry.variance.toFixed(1)}%
                </p>
              </article>
            </div>
            <article className="field-card">
              <div className="d-flex justify-content-between small mb-2">
                <span>Budget Utilization</span>
                <strong>{utilization.toFixed(1)}%</strong>
              </div>
              <div className="progress premium-progress" role="progressbar" aria-valuemin={0} aria-valuemax={100}>
                <div
                  className={clsx("progress-bar", utilization > 100 ? "bg-danger" : "bg-success")}
                  style={{ width: `${Math.min(100, utilization)}%` }}
                />
              </div>
            </article>
          </article>

          <article className="field-card full">
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h4 className="h6 mb-0">Files & Attachments</h4>
              <button className="outline-btn">
                <i className="bi bi-file-zip" /> Download ZIP
              </button>
            </div>
            <div className="attachment-grid">
              {entry.attachments.map((file) => (
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
                      <small className="text-muted">{file.category}</small>
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
        </section>

        <footer className="entry-modal-footer">
          <small className="text-muted">Submitted: {entry.submittedAt ? formatDateTime(entry.submittedAt) : "Not submitted"}</small>
          <button className="outline-btn" onClick={onClose}>
            Close
          </button>
        </footer>
      </div>
    </div>
  );
};
