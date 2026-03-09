"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { FileAttachment } from "@smart-work-tracker/shared-types";
import { api } from "@/lib/api";
import { PageHeader } from "@/components/shared/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

function canInline(mimeType: string) {
  return mimeType.startsWith("image/") || mimeType === "application/pdf";
}

export default function FilesPage() {
  const [selected, setSelected] = useState<FileAttachment | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const filesQuery = useQuery({
    queryKey: ["files"],
    queryFn: () => api.listFiles("")
  });

  async function openFile(file: FileAttachment) {
    try {
      setError(null);
      const signed = await api.getSignedFileUrl(file.id);
      setSelected(file);
      setPreviewUrl(signed.url);
      if (!canInline(file.mimeType)) {
        window.open(signed.url, "_blank", "noopener,noreferrer");
      }
    } catch (err) {
      setError((err as Error).message);
    }
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Files"
        subtitle="Activity attachments with secure signed preview/download"
      />

      {error ? <Card className="border-red-200 bg-red-50 text-red-700">{error}</Card> : null}

      <div className="grid gap-4 xl:grid-cols-5">
        <Card className="xl:col-span-2">
          <h2 className="mb-3 text-lg font-bold text-blue-950">Uploaded Attachments</h2>
          <div className="space-y-2">
            {(filesQuery.data ?? []).map((file) => (
              <div key={file.id} className="rounded-xl border p-3">
                <p className="font-semibold text-slate-900">{file.originalName}</p>
                <p className="text-xs text-slate-500">
                  {(file.sizeBytes / 1024).toFixed(1)} KB · {file.mimeType}
                </p>
                <Button className="mt-2" variant="secondary" onClick={() => openFile(file)}>
                  Open
                </Button>
              </div>
            ))}
            {!filesQuery.data?.length ? (
              <p className="text-sm text-slate-500">No uploaded files found.</p>
            ) : null}
          </div>
        </Card>

        <Card className="xl:col-span-3">
          <h2 className="mb-3 text-lg font-bold text-blue-950">Preview Panel</h2>
          {selected && previewUrl ? (
            <div className="space-y-3">
              <div className="rounded-xl border bg-slate-50 p-3">
                <p className="font-semibold text-slate-900">{selected.originalName}</p>
                <p className="text-xs text-slate-500">Activity #{selected.activityId}</p>
              </div>
              {canInline(selected.mimeType) ? (
                <iframe
                  src={previewUrl}
                  className="h-[540px] w-full rounded-xl border bg-white"
                  title={selected.originalName}
                />
              ) : (
                <div className="rounded-xl border bg-slate-50 p-4">
                  <p className="text-sm text-slate-600">
                    This file type cannot be rendered inline. Use secure download.
                  </p>
                  <a
                    href={previewUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-2 inline-block text-sm font-semibold text-blue-600"
                  >
                    Download / Open File
                  </a>
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-slate-500">Select a file from the list to preview.</p>
          )}
        </Card>
      </div>
    </div>
  );
}
