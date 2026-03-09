import { ActivityEntry, PrintSetup } from "@/lib/types";
import { formatCurrency, formatDate, formatDateTime } from "@/lib/format";
import { jsPDF } from "jspdf";

const escapeHtml = (value: string) =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

const openTextPrintWindow = (title: string, content: string) => {
  const printWindow = window.open("", "_blank", "noopener,noreferrer,width=900,height=980");
  if (!printWindow) {
    console.warn("Popup blocked. Please allow popups to print the report.");
    return;
  }

  const escapedTitle = escapeHtml(title);
  const escapedContent = escapeHtml(content);
  const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>${escapedTitle}</title>
    <style>
      body {
        font-family: "Segoe UI", Arial, sans-serif;
        padding: 24px;
        margin: 0;
        color: #1f2937;
        background: #ffffff;
      }
      h1 {
        font-size: 22px;
        margin: 0 0 14px;
      }
      pre {
        white-space: pre-wrap;
        word-wrap: break-word;
        font-size: 13px;
        line-height: 1.52;
        margin: 0;
      }
      @media print {
        body {
          padding: 14mm;
        }
      }
    </style>
  </head>
  <body>
    <h1>${escapedTitle}</h1>
    <pre>${escapedContent}</pre>
    <script>
      window.onload = function () {
        window.print();
      };
    </script>
  </body>
</html>`;

  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
};

const downloadBlob = (filename: string, blob: Blob) => {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
};

export const buildEntryTextReport = (entry: ActivityEntry) => {
  const nonZeroParticipants = entry.participants.filter((line) => line.male + line.female > 0);
  const participantLines = nonZeroParticipants.length
    ? [
        "Category                        Male     Female   Total",
        "---------------------------------------------------------",
        ...nonZeroParticipants.map((line) => {
          const category = line.categoryLabel.padEnd(30, " ").slice(0, 30);
          const male = String(line.male).padEnd(8, " ");
          const female = String(line.female).padEnd(9, " ");
          const total = String(line.male + line.female);
          return `${category}${male}${female}${total}`;
        }),
        "---------------------------------------------------------",
        `Total                           ${String(entry.totalMale).padEnd(8, " ")}${String(entry.totalFemale).padEnd(9, " ")}${entry.grandTotal}`
      ].join("\n")
    : "No participant rows with value greater than zero.";

  const attachmentLines = entry.attachments.length
    ? entry.attachments
        .map(
          (file, index) =>
            `${index + 1}. ${file.name} | Category: ${file.category} | Type: ${file.type} | Size: ${file.sizeKb} KB`
        )
        .join("\n")
    : "No attachments uploaded.";

  const firstFourPhotos = entry.attachments.filter((file) => file.type === "image").slice(0, 4);
  const photoGrid = firstFourPhotos.length
    ? [
        `${firstFourPhotos[0] ? `[1] ${firstFourPhotos[0].name}` : "[1] -"}`.padEnd(52, " ") +
          `${firstFourPhotos[1] ? `[2] ${firstFourPhotos[1].name}` : "[2] -"}`,
        `${firstFourPhotos[2] ? `[3] ${firstFourPhotos[2].name}` : "[3] -"}`.padEnd(52, " ") +
          `${firstFourPhotos[3] ? `[4] ${firstFourPhotos[3].name}` : "[4] -"}`
      ].join("\n")
    : "No photo files available for preview.";

  return [
    "PRAAN ACTIVITY REPORT (TEXT VERSION)",
    "Based on approved DOCX reporting format",
    "",
    "Organization: PRAAN",
    "",
    "SECTION 1: FORM OVERVIEW",
    `Date: ${formatDate(entry.date)}`,
    `Project Name: ${entry.project}`,
    `Activity Name: ${entry.activityName}`,
    `Activity Code: ${entry.activityCode}`,
    `District: ${entry.district}`,
    `Upazila: ${entry.upazila}`,
    `Union: ${entry.union}`,
    `Venue: ${entry.venue}`,
    `Implemented By: ${entry.implementedBy}`,
    "",
    `Unique ID: ${entry.uniqueId}`,
    `Status: ${entry.status}`,
    `Activity Type: ${entry.activityType}`,
    `Submitted By: ${entry.createdBy}`,
    `Reference Link: ${entry.referenceLink || "-"}`,
    "",
    "SECTION 2: NARRATIVE REPORT",
    entry.aiReport || "-",
    "",
    "SECTION 3: NOTES",
    entry.notes || "-",
    "",
    "SECTION 4: PARTICIPANTS (TABLE STYLE)",
    participantLines,
    "",
    "SECTION 5: FINANCIAL",
    `Budget: ${formatCurrency(entry.totalBudget)}`,
    `Expenses: ${formatCurrency(entry.totalExpenses)}`,
    `Variance: ${entry.variance.toFixed(1)}%`,
    "",
    "SECTION 6: FILES & ATTACHMENTS",
    attachmentLines,
    "",
    `Total Attachments: ${entry.attachments.length}`,
    "",
    `SECTION 7: SOME PICTURES FROM "${entry.activityName}"`,
    "First 4 pictures shown in 2-column text layout:",
    photoGrid,
    "",
    "SECTION 8: REPORT PREPARED BY",
    `Name: ${entry.createdBy}`,
    `Designation: ${entry.implementedBy}`,
    `Date: ${entry.submittedAt ? formatDate(entry.submittedAt) : formatDate(entry.createdAt)}`,
    "",
    `Submitted At: ${entry.submittedAt ? formatDateTime(entry.submittedAt) : "Not submitted"}`
  ].join("\n");
};

export const printEntryTextReport = (entry: ActivityEntry) => {
  openTextPrintWindow(`PRAAN Text Report - ${entry.uniqueId}`, buildEntryTextReport(entry));
};

export const exportEntryDocxReport = (entry: ActivityEntry) => {
  const content = buildEntryTextReport(entry);
  const blob = new Blob([content], {
    type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  });
  downloadBlob(`${entry.uniqueId}-report.docx`, blob);
};

export const exportEntryPdfReport = (entry: ActivityEntry) => {
  const doc = new jsPDF({ unit: "pt", format: "a4", compress: true });
  const title = `PRAAN Report - ${entry.uniqueId}`;
  const report = buildEntryTextReport(entry);
  const lines = doc.splitTextToSize(report, 520);
  let y = 40;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text(title, 36, y);
  y += 22;
  doc.setFont("courier", "normal");
  doc.setFontSize(9);
  lines.forEach((line: string) => {
    if (y > 800) {
      doc.addPage();
      y = 40;
    }
    doc.text(line, 36, y);
    y += 12;
  });
  doc.save(`${entry.uniqueId}-report.pdf`);
};

export const printTemplatePreview = (setup: PrintSetup, templateName: string) => {
  const report = [
    "PRINT TEMPLATE PREVIEW",
    `Template: ${templateName}`,
    `Preset: ${setup.preset}`,
    `Page Size: ${setup.pageSize}`,
    `Orientation: ${setup.orientation}`,
    `Header: ${setup.header}`,
    `Footer: ${setup.footer}`,
    "",
    "SECTION 1: OVERVIEW",
    "Date: [dd/mm/yyyy]",
    "Project: [project name]",
    "Activity: [activity title]",
    "Location: [district > upazila > union]",
    "",
    "SECTION 2: PARTICIPANTS",
    "Male: [count]",
    "Female: [count]",
    "Total: [count]",
    "",
    "SECTION 3: FINANCIAL",
    "Budget: [value]",
    "Expenses: [value]",
    "Variance: [value]%",
    "",
    "SECTION 4: FILES & ATTACHMENTS",
    "1. [file name and category]",
    "2. [file name and category]"
  ].join("\n");

  openTextPrintWindow("PRAAN Print Setup Preview", report);
};
