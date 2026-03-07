"use client";

import { useMemo, useState } from "react";
import { ActivityEntry } from "@/lib/types";

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

  const cells = useMemo(() => {
    const firstDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
    const lastDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);
    const start = firstDay.getDay();
    const total = lastDay.getDate();

    const result: Array<{ day: number | null; entries: ActivityEntry[] }> = [];

    for (let i = 0; i < start; i += 1) {
      result.push({ day: null, entries: [] });
    }

    for (let day = 1; day <= total; day += 1) {
      const key = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day)
        .toISOString()
        .slice(0, 10);
      const dayEntries = entries.filter((entry) => entry.date === key);
      result.push({ day, entries: dayEntries });
    }

    while (result.length % 7 !== 0) result.push({ day: null, entries: [] });
    return result;
  }, [currentMonth, entries]);

  return (
    <div className="panel-card">
      <div className="panel-head align-items-center">
        <h3 className="panel-title mb-0">Activity Calendar</h3>
        <div className="d-flex gap-2">
          <button
            className="outline-btn"
            onClick={() =>
              setCurrentMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))
            }
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

      <div className="calendar-grid week-header mt-2">
        {weekDays.map((day) => (
          <div key={day} className="calendar-cell cell-head">
            {day}
          </div>
        ))}
      </div>

      <div className="calendar-grid">
        {cells.map((cell, index) => (
          <div key={index} className="calendar-cell">
            {cell.day && <span className="day-number">{cell.day}</span>}
            {cell.entries.slice(0, 2).map((entry) => (
              <button
                key={entry.uniqueId}
                className="calendar-event"
                onClick={() => onEventSelect?.(entry.uniqueId)}
              >
                {entry.activityType}
              </button>
            ))}
            {cell.entries.length > 2 && <span className="small text-muted">+{cell.entries.length - 2} more</span>}
          </div>
        ))}
      </div>
    </div>
  );
};