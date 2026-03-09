import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import type { MonthlyReportSummary } from "@smart-work-tracker/shared-types";

function asLines(report: MonthlyReportSummary): string[] {
  const lines: string[] = [];
  lines.push(`SMART WORK TRACKER Monthly Report (${report.month})`);
  lines.push(`Total Activities: ${report.summary.totalActivities}`);
  lines.push(`Total Hours: ${report.summary.totalHours}`);
  lines.push("");
  lines.push("Completed Tasks:");
  for (const task of report.completedTasks) {
    lines.push(
      `- ${task.date}: ${task.taskDescription} | ${task.output} | ${task.hours}h`,
    );
  }
  lines.push("");
  lines.push("Ongoing Tasks:");
  for (const task of report.ongoingTasks) {
    lines.push(`- ${task.date}: ${task.activity} (${task.status})`);
  }
  lines.push("");
  lines.push("Category Breakdown:");
  for (const category of report.summary.categoryBreakdown) {
    lines.push(`- ${category.category}: ${category.totalHours}h`);
  }
  return lines;
}

export async function exportReportPdf(report: MonthlyReportSummary) {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([595, 842]);
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const titleFont = await pdf.embedFont(StandardFonts.HelveticaBold);
  const lines = asLines(report);

  let y = 810;
  page.drawText(lines[0] ?? "Monthly Report", {
    x: 40,
    y,
    size: 14,
    color: rgb(0.1, 0.1, 0.4),
    font: titleFont,
  });
  y -= 24;

  for (const line of lines.slice(1)) {
    if (y < 40) break;
    page.drawText(line, { x: 40, y, size: 10, font });
    y -= 14;
  }

  return new Uint8Array(await pdf.save());
}

export function exportReportWord(report: MonthlyReportSummary) {
  const lines = asLines(report);
  const html = `
    <html>
      <head><meta charset="utf-8" /></head>
      <body>
        <pre>${lines.join("\n")}</pre>
      </body>
    </html>
  `;
  return new TextEncoder().encode(html);
}

export function exportReportExcel(report: MonthlyReportSummary) {
  const rows: string[] = [
    "Section,Date,Task,OutputOrStatus,Hours",
    ...report.completedTasks.map(
      (task) =>
        `Completed,${task.date},"${task.taskDescription.replaceAll('"', '""')}","${task.output.replaceAll('"', '""')}",${task.hours}`,
    ),
    ...report.ongoingTasks.map(
      (task) =>
        `Ongoing,${task.date},"${task.activity.replaceAll('"', '""')}",${task.status},`,
    ),
    ...report.summary.categoryBreakdown.map(
      (c) => `Category,,"${c.category.replaceAll('"', '""')}",,${c.totalHours}`,
    ),
  ];
  return new TextEncoder().encode(rows.join("\n"));
}
