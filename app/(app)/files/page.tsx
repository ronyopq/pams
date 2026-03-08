"use client";

import { useMemo, useState } from "react";
import { useAppContext } from "@/components/providers/app-context";
import { formatDate, normalizeText } from "@/lib/format";

export default function FilesPage() {
  const { visibleEntries } = useAppContext();
  const [query, setQuery] = useState("");

  const files = useMemo(() => {
    const list = visibleEntries.flatMap((entry) =>
      entry.attachments.map((file) => ({
        ...file,
        entryId: entry.uniqueId,
        date: entry.date,
        project: entry.project,
        activity: entry.activityName
      }))
    );

    const needle = normalizeText(query);
    return list.filter((file) =>
      !needle
        ? true
        : normalizeText(`${file.name} ${file.category} ${file.entryId} ${file.project} - ${file.activity}`).includes(
            needle
          )
    );
  }, [visibleEntries, query]);

  return (
    <div className="d-grid gap-3">
      <section className="page-heading">
        <h1 className="page-title">Files</h1>
        <p className="page-subtitle">Search and access all activity files based on your role permissions.</p>
      </section>

      <section className="panel-card">
        <div className="input-icon">
          <i className="bi bi-search" />
          <input
            className="form-control premium-input"
            placeholder="Search by date, project, activity, category, entry ID"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>
      </section>

      <section className="file-library-grid">
        {files.map((file) => (
          <article key={file.id + file.entryId} className="panel-card d-grid gap-2">
            <div className="d-flex justify-content-between align-items-start gap-2">
              <div className="d-flex gap-2 align-items-start">
                <span className="file-thumb">
                  {file.type === "image" && file.url !== "#" ? (
                    <img src={file.url} alt={file.name} />
                  ) : (
                    <i className={`bi ${file.type === "image" ? "bi-image" : "bi-file-earmark-text"}`} />
                  )}
                </span>
                <div>
                <p className="mb-1 fw-semibold text-truncate maxw-220">{file.name}</p>
                <small className="text-muted">{file.category}</small>
                </div>
              </div>
              <span className="soft-badge">{Math.max(1, file.sizeKb)} KB</span>
            </div>

            <small className="text-muted">
              {file.entryId} - {formatDate(file.date)}
            </small>
            <small className="text-muted text-truncate">
              {file.project} - {file.activity}
            </small>

            <div className="d-flex gap-2 mt-1">
              <button className="outline-btn flex-fill">
                <i className="bi bi-eye" /> Preview
              </button>
              <button className="outline-btn flex-fill">
                <i className="bi bi-box-arrow-up-right" /> Open
              </button>
              <button className="primary-btn flex-fill">
                <i className="bi bi-download" /> Download
              </button>
            </div>
          </article>
        ))}
      </section>
    </div>
  );
}
