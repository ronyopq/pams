"use client";

import { useMemo, useState } from "react";
import { ActivityEntry } from "@/lib/types";
import { formatDate } from "@/lib/format";

type Props = {
  entries: ActivityEntry[];
  onEventSelect?: (id: string) => void;
};

const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export const ActivityCalendar = ({ entries, onEventSelect }: Props) => {
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const cells = useMemo(() => {
    const firstDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
    const lastDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);
    const start = firstDay.getDay();
    const total = lastDay.getDate();

    const result: Array<{ day: number | null; dateKey: string | null; entries: ActivityEntry[] }> = [];

    for (let i = 0; i < start; i += 1) {
      result.push({ day: null, dateKey: null, entries: [] });
    }

    for (let day = 1; day <= total; day += 1) {
      const key = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day)
        .toISOString()
        .slice(0, 10);
      const dayEntries = entries.filter((entry) => entry.date === key);
      result.push({ day, dateKey: key, entries: dayEntries });
    }

    while (result.length % 7 !== 0) result.push({ day: null, dateKey: null, entries: [] });
    return result;
  }, [currentMonth, entries]);

  const selectedEntries = useMemo(() => {
    if (!selectedDate) return [];
    return entries.filter((entry) => entry.date === selectedDate);
  }, [entries, selectedDate]);

  return (
    <div className="panel-card calendar-modern">
      <div className="panel-head align-items-center calendar-modern-head">
        <div>
          <h3 className="panel-title mb-0">Activity Calendar</h3>
          <p className="text-muted mb-0 small">Click any date to see the activity list and open details.</p>
        </div>
        <div className="d-flex gap-2">
          <button
            className="outline-btn"
            onClick={() => setCurrentMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))}
          >
            <i className="bi bi-chevron-left" />
          </button>
          <strong className="small text-nowrap px-1">
            {currentMonth.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
          </strong>
          <button
            className="outline-btn"
            onClick={() =>
              setCurrentMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))
            }
          >
            <i className="bi bi-chevron-right" />
          </button>
        </div>
      </div>

      <div className="calendar-modern-layout">
        <div>
          <div className="calendar-grid week-header mt-2">
            {weekDays.map((day) => (
              <div key={day} className="calendar-cell cell-head">
                {day}
              </div>
            ))}
          </div>

          <div className="calendar-grid">
            {cells.map((cell, index) => (
              <button
                key={index}
                className={`calendar-cell calendar-cell-btn ${cell.dateKey === selectedDate ? "active" : ""}`}
                onClick={() => {
                  if (!cell.dateKey) return;
                  setSelectedDate(cell.dateKey);
                }}
              >
                {cell.day && (
                  <div className="d-flex justify-content-between align-items-center mb-1">
                    <span className="day-number">{cell.day}</span>
                    {cell.entries.length > 0 && <span className="calendar-count">{cell.entries.length}</span>}
                  </div>
                )}
                <div className="calendar-dot-row">
                  {cell.entries.slice(0, 3).map((entry) => (
                    <span key={entry.uniqueId} className="calendar-dot" />
                  ))}
                </div>
                {cell.entries.length > 0 && <span className="small text-muted text-start">{cell.entries[0].activityType}</span>}
              </button>
            ))}
          </div>
        </div>

        <aside className="calendar-side-list">
          <h4 className="h6 mb-2">Selected Date</h4>
          <p className="text-muted small mb-3">{selectedDate ? formatDate(selectedDate) : "Select any date from calendar."}</p>
          <div className="d-grid gap-2">
            {selectedEntries.length === 0 && <p className="text-muted small mb-0">No entries for selected date.</p>}
            {selectedEntries.map((entry) => (
              <button key={entry.uniqueId} className="calendar-side-item" onClick={() => onEventSelect?.(entry.uniqueId)}>
                <strong>{entry.activityName}</strong>
                <span>{entry.project}</span>
                <span className="mono">{entry.uniqueId}</span>
              </button>
            ))}
          </div>
        </aside>
      </div>
    </div>
  );
};
