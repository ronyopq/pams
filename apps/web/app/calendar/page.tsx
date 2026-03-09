"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import { api } from "@/lib/api";
import { PageHeader } from "@/components/shared/page-header";
import { Card } from "@/components/ui/card";

function getCalendarRange(monthValue: string) {
  const [yearPart, monthPart] = monthValue.split("-");
  const year = Number(yearPart);
  const month = Number(monthPart);
  if (!Number.isFinite(year) || !Number.isFinite(month) || month < 1 || month > 12) {
    const now = new Date();
    const fallbackYear = now.getUTCFullYear();
    const fallbackMonth = now.getUTCMonth() + 1;
    return {
      start: new Date(Date.UTC(fallbackYear, fallbackMonth - 1, 1)).toISOString(),
      end: new Date(Date.UTC(fallbackYear, fallbackMonth, 0, 23, 59, 59)).toISOString()
    };
  }
  const start = new Date(Date.UTC(year, month - 1, 1)).toISOString();
  const end = new Date(Date.UTC(year, month, 0, 23, 59, 59)).toISOString();
  return { start, end };
}

export default function CalendarPage() {
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const range = useMemo(() => getCalendarRange(month), [month]);
  const eventsQuery = useQuery({
    queryKey: ["calendar-events", month],
    queryFn: () =>
      api.getCalendarEvents(
        `?start=${encodeURIComponent(range.start)}&end=${encodeURIComponent(range.end)}`,
      )
  });

  return (
    <div className="space-y-4">
      <PageHeader title="Calendar Activity View" subtitle="Activities, work plans, and followups in one timeline" />
      <Card>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <input
            type="month"
            value={month}
            onChange={(event) => setMonth(event.target.value)}
            className="h-10 rounded-xl border px-3 text-sm"
          />
          <div className="flex items-center gap-2 text-xs">
            <span className="inline-flex items-center gap-1"><i className="h-2.5 w-2.5 rounded-full bg-blue-600" /> Activities</span>
            <span className="inline-flex items-center gap-1"><i className="h-2.5 w-2.5 rounded-full bg-green-600" /> Work Plans</span>
            <span className="inline-flex items-center gap-1"><i className="h-2.5 w-2.5 rounded-full bg-red-600" /> Followups</span>
          </div>
        </div>
        <FullCalendar
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
          initialView="dayGridMonth"
          headerToolbar={{
            left: "prev,next today",
            center: "title",
            right: "dayGridMonth,timeGridWeek,timeGridDay"
          }}
          events={eventsQuery.data ?? []}
          eventTimeFormat={{
            hour: "2-digit",
            minute: "2-digit",
            meridiem: "short"
          }}
          height="auto"
        />
      </Card>
    </div>
  );
}
