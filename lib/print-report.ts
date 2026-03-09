import { ActivityEntry, PrintSetup } from "@/lib/types";
import { formatCurrency, formatDate, formatDateTime } from "@/lib/format";

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
    window.alert("Popup blocked. Please allow popups to print the report.");
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

export const printEntryTextReport = (entry: ActivityEntry) => {
  const nonZeroParticipants = entry.participants.filter((line) => line.male + line.female > 0);
  const participantLines = nonZeroParticipants.length
    ? nonZeroParticipants
        .map((line) => `${line.categoryLabel}: Male ${line.male}, Female ${line.female}, Total ${line.male + line.female}`)
        .join("\n")
    : "No participant rows with value greater than zero.";

  const attachmentLines = entry.attachments.length
    ? entry.attachments
        .map(
          (file, index) =>
            `${index + 1}. ${file.name} | Category: ${file.category} | Type: ${file.type} | Size: ${file.sizeKb} KB`
        )
        .join("\n")
    : "No attachments uploaded.";

  const report = [
    "SECTION 1: OVERVIEW",
    `Unique ID: ${entry.uniqueId}`,
    `Status: ${entry.status}`,
    `Date: ${formatDate(entry.date)}`,
    `Project: ${entry.project}`,
    `Activity: ${entry.activityName}`,
    `Activity Type: ${entry.activityType}`,
    `Activity Code: ${entry.activityCode}`,
    `Venue: ${entry.venue}`,
    `Implemented By: ${entry.implementedBy}`,
    `Submitted By: ${entry.createdBy}`,
    `Location: ${entry.district} > ${entry.upazila} > ${entry.union}`,
    `Reference Link: ${entry.referenceLink || "-"}`,
    `Notes: ${entry.notes || "-"}`,
    "",
    "SECTION 2: PARTICIPANTS",
    `Total Participants: ${entry.grandTotal}`,
    `Male: ${entry.totalMale}`,
    `Female: ${entry.totalFemale}`,
    participantLines,
    "",
    "SECTION 3: FINANCIAL",
    `Budget: ${formatCurrency(entry.totalBudget)}`,
    `Expenses: ${formatCurrency(entry.totalExpenses)}`,
    `Variance: ${entry.variance.toFixed(1)}%`,
    "",
    "SECTION 4: FILES & ATTACHMENTS",
    attachmentLines,
    "",
    `Submitted At: ${entry.submittedAt ? formatDateTime(entry.submittedAt) : "Not submitted"}`
  ].join("\n");

  openTextPrintWindow(`PRAAN Text Report - ${entry.uniqueId}`, report);
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
