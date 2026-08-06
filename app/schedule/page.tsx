"use client";

import { useState, useMemo, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Calendar as CalendarIcon, Clock, MapPin, AlignLeft, ChevronLeft, ChevronRight } from "lucide-react";
import {
  format,
  parseISO,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  addMonths,
  subMonths,
  addDays,
  isSameWeek,
  isAfter,
  isBefore,
  startOfDay,
  isToday as isDateToday,
  isTomorrow as isDateTomorrow,
} from "date-fns";
import { useRouter } from "next/navigation";

import { cn } from "../../lib/cn";
import { useScheduleEvents, useCreateScheduleEvent, useUpdateScheduleEvent, useDeleteScheduleEvent, ScheduleEvent } from "../../hooks/use-schedule";
import { useUser } from "../../hooks/use-user";
import { PageHeader } from "../../components/page-header";
import { SearchBar } from "../../components/search-bar";
import { SummaryStrip } from "../../components/summary-strip";
import { Button } from "../../components/ui/button";
import { Input, Label } from "../../components/ui/input";
import { ConfirmDialog } from "../../components/confirm-dialog";
import { PageSkeleton } from "../../components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "../../components/ui/dialog";

// ── Schema & Types ──────────────────────────────────────────────────────────

const scheduleSchema = z.object({
  title: z.string().min(1, "Title is required"),
  date: z.string().min(1, "Date is required"),
  time: z.string().min(1, "Time is required"),
  location: z.string().optional(),
  notes: z.string().optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH"]),
});
type ScheduleFormData = z.infer<typeof scheduleSchema>;

type ViewMode = "CALENDAR" | "TODAY" | "THIS_WEEK" | "THIS_MONTH";
type PriorityFilter = "ALL" | "HIGH" | "MEDIUM" | "LOW";

const PRIORITY_DOT: Record<string, string> = {
  LOW: "bg-primary",
  MEDIUM: "bg-warning",
  HIGH: "bg-danger",
};

const PRIORITY_BG: Record<string, string> = {
  LOW: "bg-primary/10 text-primary border-primary/20",
  MEDIUM: "bg-warning/10 text-warning border-warning/20",
  HIGH: "bg-danger/10 text-danger border-danger/20",
};

const PRIORITY_BADGE: Record<string, string> = {
  LOW: "bg-primary/10 text-primary",
  MEDIUM: "bg-warning/10 text-warning",
  HIGH: "bg-danger/10 text-danger",
};

const PRIORITY_STRIP: Record<string, string> = {
  LOW: "bg-primary",
  MEDIUM: "bg-warning",
  HIGH: "bg-danger",
};

const PRIORITY_EMOJI: Record<string, string> = {
  LOW: "🟢",
  MEDIUM: "🟡",
  HIGH: "🔴",
};

// ── Reusable Upcoming Event Card ────────────────────────────────────────────

function UpcomingEventCard({
  event,
  onView,
}: {
  event: ScheduleEvent;
  onView: (e: ScheduleEvent) => void;
}) {
  return (
    <button
      onClick={() => onView(event)}
      className="w-full text-left flex items-start gap-3 px-3 py-2.5 rounded-lg hover:bg-hover transition-colors group cursor-pointer"
    >
      <div className={cn("w-1 self-stretch rounded-full shrink-0 mt-0.5", PRIORITY_STRIP[event.priority])} />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-text truncate group-hover:text-primary transition-colors">{event.title}</p>
        <div className="flex items-center gap-2 mt-0.5">
          <Clock className="size-3 text-muted shrink-0" />
          <span className="text-xs text-muted">{event.time}</span>
          {event.location && (
            <>
              <span className="text-xs text-border">·</span>
              <MapPin className="size-3 text-muted shrink-0" />
              <span className="text-xs text-muted truncate">{event.location}</span>
            </>
          )}
        </div>
        {event.notes && (
          <p className="text-xs text-muted/70 mt-1 line-clamp-1">{event.notes}</p>
        )}
      </div>
    </button>
  );
}

// ── List Event Card (for Today / Week / Month views) ────────────────────────

function ListEventCard({
  event,
  onView,
}: {
  event: ScheduleEvent;
  onView: (e: ScheduleEvent) => void;
}) {
  return (
    <button
      onClick={() => onView(event)}
      className="w-full text-left bg-white border border-border rounded-xl p-4 hover:shadow-md hover:border-primary/30 transition-all group cursor-pointer"
    >
      <div className="flex items-start gap-3">
        <div className={cn("w-1.5 self-stretch rounded-full shrink-0", PRIORITY_STRIP[event.priority])} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2 mb-1">
            <h4 className="font-semibold text-text truncate group-hover:text-primary transition-colors">{event.title}</h4>
            <span className={cn("text-xs font-medium px-2 py-0.5 rounded-full shrink-0", PRIORITY_BADGE[event.priority])}>
              {event.priority}
            </span>
          </div>
          <div className="flex items-center gap-3 text-sm text-muted">
            <div className="flex items-center gap-1.5">
              <Clock className="size-3.5" />
              <span>{event.time}</span>
            </div>
            {event.location && (
              <div className="flex items-center gap-1.5">
                <MapPin className="size-3.5" />
                <span className="truncate">{event.location}</span>
              </div>
            )}
          </div>
          {event.notes && (
            <p className="text-xs text-muted/70 mt-2 line-clamp-2">{event.notes}</p>
          )}
        </div>
      </div>
    </button>
  );
}

// ── Main Component ──────────────────────────────────────────────────────────

export default function SchedulePage() {
  const { data: user, isLoading: authLoading } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (!authLoading && user?.role === "MANAGER") {
      router.push("/");
    }
  }, [user, authLoading, router]);

  const [currentDate, setCurrentDate] = useState(new Date());
  const [query, setQuery] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>("CALENDAR");
  const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>("ALL");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [viewingEvent, setViewingEvent] = useState<ScheduleEvent | null>(null);
  const [dayEventsDialog, setDayEventsDialog] = useState<{ date: Date; events: ScheduleEvent[] } | null>(null);

  // Always fetch a wide range that covers the calendar + upcoming panel
  const fetchRange = useMemo(() => {
    const calStart = startOfWeek(startOfMonth(currentDate), { weekStartsOn: 1 });
    const calEnd = endOfWeek(endOfMonth(currentDate), { weekStartsOn: 1 });
    // Extend end to cover upcoming events (next 30 days from today)
    const upcomingEnd = addDays(new Date(), 30);
    const start = isBefore(calStart, new Date()) ? calStart : startOfDay(new Date());
    const end = isAfter(calEnd, upcomingEnd) ? calEnd : upcomingEnd;
    return {
      startDate: format(start, "yyyy-MM-dd"),
      endDate: format(end, "yyyy-MM-dd"),
    };
  }, [currentDate]);

  const { data: events = [], isLoading: eventsLoading } = useScheduleEvents(fetchRange.startDate, fetchRange.endDate);
  const createMutation = useCreateScheduleEvent();
  const updateMutation = useUpdateScheduleEvent();
  const deleteMutation = useDeleteScheduleEvent();

  const { register, handleSubmit, reset, formState: { errors } } = useForm<ScheduleFormData>({
    resolver: zodResolver(scheduleSchema),
    defaultValues: { title: "", date: format(new Date(), "yyyy-MM-dd"), time: "09:00", location: "", notes: "", priority: "MEDIUM" },
  });

  // ── Filtered events for main content ──────────────────────────────────────

  const filteredEvents = useMemo(() => {
    return events.filter(e => {
      if (priorityFilter !== "ALL" && e.priority !== priorityFilter) return false;
      if (query) {
        const q = query.toLowerCase();
        const matches = e.title.toLowerCase().includes(q) ||
          (e.location?.toLowerCase().includes(q)) ||
          (e.notes?.toLowerCase().includes(q));
        if (!matches) return false;
      }
      if (viewMode !== "CALENDAR") {
        const eventDate = parseISO(e.date);
        const today = new Date();
        if (viewMode === "TODAY" && !isSameDay(eventDate, today)) return false;
        if (viewMode === "THIS_WEEK" && !isSameWeek(eventDate, today, { weekStartsOn: 1 })) return false;
        if (viewMode === "THIS_MONTH" && !isSameMonth(eventDate, today)) return false;
      }
      return true;
    });
  }, [events, query, priorityFilter, viewMode]);

  // ── Upcoming events for sidebar (from today onwards, sorted by date+time) ─

  const upcomingEvents = useMemo(() => {
    const now = startOfDay(new Date());
    return events
      .filter(e => {
        const d = parseISO(e.date);
        return !isBefore(d, now);
      })
      .sort((a, b) => {
        const dateCompare = parseISO(a.date).getTime() - parseISO(b.date).getTime();
        if (dateCompare !== 0) return dateCompare;
        return a.time.localeCompare(b.time);
      });
  }, [events]);

  // Group upcoming events: Today, Tomorrow, Next 7 Days, Later
  const upcomingGroups = useMemo(() => {
    const groups: { label: string; events: ScheduleEvent[] }[] = [
      { label: "Today", events: [] },
      { label: "Tomorrow", events: [] },
      { label: "Next 7 Days", events: [] },
      { label: "Later", events: [] },
    ];
    const today = new Date();
    const weekEnd = addDays(today, 7);

    upcomingEvents.forEach(e => {
      const d = parseISO(e.date);
      if (isDateToday(d)) groups[0].events.push(e);
      else if (isDateTomorrow(d)) groups[1].events.push(e);
      else if (isBefore(d, weekEnd)) groups[2].events.push(e);
      else groups[3].events.push(e);
    });

    return groups.filter(g => g.events.length > 0);
  }, [upcomingEvents]);

  // ── Summary ───────────────────────────────────────────────────────────────

  const summaryItems = useMemo(() => {
    const today = new Date();
    let todaysCount = 0;
    let thisWeekCount = 0;
    let thisMonthCount = 0;
    let highPriorityCount = 0;

    events.forEach(e => {
      const date = parseISO(e.date);
      if (isSameDay(date, today)) todaysCount++;
      if (isSameWeek(date, today, { weekStartsOn: 1 })) thisWeekCount++;
      if (isSameMonth(date, today)) thisMonthCount++;
      if (e.priority === "HIGH") highPriorityCount++;
    });

    return [
      { label: "Today's Events", value: todaysCount.toString() },
      { label: "This Week", value: thisWeekCount.toString() },
      { label: "This Month", value: thisMonthCount.toString() },
      { label: "High Priority", value: highPriorityCount.toString() },
    ];
  }, [events]);

  // ── Modal helpers ─────────────────────────────────────────────────────────

  const openNewModal = (defaultDate?: Date) => {
    setEditingId(null);
    reset({
      title: "",
      date: format(defaultDate || new Date(), "yyyy-MM-dd"),
      time: "09:00",
      location: "",
      notes: "",
      priority: "MEDIUM",
    });
    setIsModalOpen(true);
  };

  const openEditModal = (e: ScheduleEvent) => {
    setEditingId(e.id);
    reset({
      title: e.title,
      date: format(parseISO(e.date), "yyyy-MM-dd"),
      time: e.time,
      location: e.location || "",
      notes: e.notes || "",
      priority: e.priority,
    });
    setViewingEvent(null);
    setIsModalOpen(true);
  };

  const onSubmit = (data: ScheduleFormData) => {
    if (editingId) {
      updateMutation.mutate({ id: editingId, ...data }, {
        onSuccess: () => {
          setIsModalOpen(false);
          toast.success("Event updated");
        },
        onError: (err: any) => toast.error(err.message || "Failed to update event"),
      });
    } else {
      createMutation.mutate({
        ...data,
        location: data.location || null,
        notes: data.notes || null,
      }, {
        onSuccess: () => {
          setIsModalOpen(false);
          toast.success("Event created");
        },
        onError: (err: any) => toast.error(err.message || "Failed to create event"),
      });
    }
  };

  // ── Calendar grid ─────────────────────────────────────────────────────────

  const calendarDays = useMemo(() => {
    const start = startOfWeek(startOfMonth(currentDate), { weekStartsOn: 1 });
    const end = endOfWeek(endOfMonth(currentDate), { weekStartsOn: 1 });
    return eachDayOfInterval({ start, end });
  }, [currentDate]);

  // ── Guards ────────────────────────────────────────────────────────────────

  if (authLoading || user?.role === "MANAGER") return <PageSkeleton />;
  if (eventsLoading) return <PageSkeleton />;

  // ── Grouped events helper for Week / Month list views ─────────────────────

  const groupEventsByDate = (evts: ScheduleEvent[]) => {
    const map = new Map<string, ScheduleEvent[]>();
    evts.forEach(e => {
      const key = format(parseISO(e.date), "yyyy-MM-dd");
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(e);
    });
    // sort by date
    return Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([dateStr, evts]) => ({
        dateStr,
        date: parseISO(dateStr),
        events: evts.sort((a, b) => a.time.localeCompare(b.time)),
      }));
  };

  // ── Render ────────────────────────────────────────────────────────────────

  const MAX_CALENDAR_EVENTS = 2;

  const renderMainContent = () => {
    if (viewMode === "CALENDAR") {
      return (
        <div className="bg-white border border-border rounded-xl shadow-sm overflow-hidden">
          {/* Calendar Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-background/50">
            <h3 className="text-base font-semibold text-text">{format(currentDate, "MMMM yyyy")}</h3>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setCurrentDate(subMonths(currentDate, 1))}>
                <ChevronLeft className="size-4" />
              </Button>
              <Button variant="secondary" size="sm" className="h-8 text-xs" onClick={() => setCurrentDate(new Date())}>Today</Button>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setCurrentDate(addMonths(currentDate, 1))}>
                <ChevronRight className="size-4" />
              </Button>
            </div>
          </div>

          {/* Weekday Headers */}
          <div className="grid grid-cols-7 border-b border-border bg-background/30">
            {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map(day => (
              <div key={day} className="py-1.5 text-center text-xs font-medium text-muted uppercase tracking-wider">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-7 bg-border gap-px">
            {calendarDays.map(day => {
              const dayEvents = filteredEvents
                .filter(e => isSameDay(parseISO(e.date), day))
                .sort((a, b) => a.time.localeCompare(b.time));
              const isCurrentMonth = isSameMonth(day, currentDate);
              const isToday = isSameDay(day, new Date());
              const visibleEvents = dayEvents.slice(0, MAX_CALENDAR_EVENTS);
              const overflowCount = dayEvents.length - MAX_CALENDAR_EVENTS;

              return (
                <div
                  key={day.toISOString()}
                  className={cn(
                    "min-h-[100px] bg-white p-1.5 transition-colors hover:bg-hover/30 cursor-pointer",
                    !isCurrentMonth && "bg-background/40 text-muted"
                  )}
                  onClick={() => openNewModal(day)}
                >
                  <div className={cn(
                    "w-6 h-6 rounded-full flex items-center justify-center text-xs mb-1",
                    isToday ? "bg-primary text-white font-bold" : "text-text font-medium"
                  )}>
                    {format(day, "d")}
                  </div>
                  <div className="space-y-0.5">
                    {visibleEvents.map(e => (
                      <div
                        key={e.id}
                        onClick={(ev) => {
                          ev.stopPropagation();
                          setViewingEvent(e);
                        }}
                        className={cn(
                          "text-[11px] leading-tight px-1.5 py-0.5 rounded border truncate cursor-pointer hover:opacity-80 transition-opacity",
                          PRIORITY_BG[e.priority]
                        )}
                        title={`${e.priority} · ${e.time} · ${e.title}${e.location ? ` · ${e.location}` : ""}${e.notes ? `\n${e.notes}` : ""}`}
                      >
                        <span className="font-semibold">{e.time}</span>
                        <span className="mx-0.5">·</span>
                        {e.title}
                      </div>
                    ))}
                    {overflowCount > 0 && (
                      <button
                        onClick={(ev) => {
                          ev.stopPropagation();
                          setDayEventsDialog({ date: day, events: dayEvents });
                        }}
                        className="text-[11px] text-primary font-medium hover:underline cursor-pointer pl-1"
                      >
                        +{overflowCount} more
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      );
    }

    // ── List views: Today / This Week / This Month ───────────────────────────

    if (filteredEvents.length === 0) {
      return (
        <div className="py-16 text-center border border-dashed border-border rounded-xl bg-white">
          <CalendarIcon className="mx-auto size-12 text-muted mb-4 opacity-20" />
          <h3 className="text-lg font-medium text-text mb-1">No events found</h3>
          <p className="text-muted text-sm">No events match your current filters.</p>
        </div>
      );
    }

    if (viewMode === "TODAY") {
      const sorted = [...filteredEvents].sort((a, b) => a.time.localeCompare(b.time));
      return (
        <div className="space-y-3">
          {sorted.map(e => (
            <ListEventCard key={e.id} event={e} onView={setViewingEvent} />
          ))}
        </div>
      );
    }

    // Week or Month: group by day
    const groups = groupEventsByDate(filteredEvents);
    return (
      <div className="space-y-6">
        {groups.map(group => (
          <div key={group.dateStr}>
            <div className="flex items-center gap-3 mb-3">
              <h3 className="text-sm font-semibold text-text">
                {isDateToday(group.date)
                  ? "Today"
                  : isDateTomorrow(group.date)
                    ? "Tomorrow"
                    : viewMode === "THIS_WEEK"
                      ? format(group.date, "EEEE")
                      : format(group.date, "d MMMM")}
              </h3>
              <div className="flex-1 h-px bg-border" />
              <span className="text-xs text-muted">{format(group.date, "EEE, d MMM")}</span>
            </div>
            <div className="space-y-2">
              {group.events.map(e => (
                <ListEventCard key={e.id} event={e} onView={setViewingEvent} />
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-8 fade-in">
      <PageHeader
        breadcrumbItems={[{ label: "Directory" }, { label: "Schedule" }]}
        title="Schedule"
        subtitle="Plan meetings, site visits and daily activities."
      >
        <Button onClick={() => openNewModal()}>
          <Plus className="size-5 mr-1.5" />
          New Event
        </Button>
      </PageHeader>

      <SummaryStrip items={summaryItems} />

      {/* Filters Row */}
      <div className="flex flex-col lg:flex-row gap-4 justify-between items-stretch lg:items-center">
        <SearchBar
          query={query}
          onQueryChange={setQuery}
          placeholder="Search events, locations, notes..."
        />
        <div className="flex flex-wrap gap-3 items-center">
          {/* Priority Filter */}
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value as PriorityFilter)}
            className="h-9 px-3 py-1.5 rounded-lg border border-input bg-white text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            <option value="ALL">All Priorities</option>
            <option value="HIGH">High</option>
            <option value="MEDIUM">Medium</option>
            <option value="LOW">Low</option>
          </select>

          {/* View Mode Toggle */}
          <div className="flex gap-1 p-1 bg-background border border-border rounded-xl shadow-xs">
            {(["CALENDAR", "TODAY", "THIS_WEEK", "THIS_MONTH"] as const).map(opt => {
              const isSelected = viewMode === opt;
              const label = opt === "CALENDAR" ? "Calendar" : opt === "TODAY" ? "Today" : opt === "THIS_WEEK" ? "This Week" : "This Month";
              return (
                <button
                  key={opt}
                  onClick={() => setViewMode(opt)}
                  className={cn(
                    "px-3 py-1.5 text-sm font-medium rounded-lg transition-all duration-150 cursor-pointer whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1",
                    isSelected
                      ? "bg-primary text-white font-semibold shadow-xs"
                      : "text-muted hover:text-text hover:bg-hover"
                  )}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Two-Column Layout ────────────────────────────────────────────── */}
      <div className="flex flex-col xl:flex-row gap-6">
        {/* Main Content: 70% */}
        <div className="flex-1 xl:max-w-[70%] min-w-0">
          {renderMainContent()}
        </div>

        {/* Upcoming Events Panel: 30% */}
        <aside className="w-full xl:w-[30%] shrink-0">
          <div className="bg-white border border-border rounded-xl shadow-sm sticky top-6">
            <div className="px-4 py-3 border-b border-border">
              <h3 className="text-sm font-semibold text-text uppercase tracking-wider">Upcoming Events</h3>
            </div>
            <div className="max-h-[calc(100vh-280px)] overflow-y-auto">
              {upcomingGroups.length === 0 ? (
                <div className="px-4 py-8 text-center">
                  <CalendarIcon className="mx-auto size-8 text-muted mb-2 opacity-20" />
                  <p className="text-sm text-muted">No upcoming events</p>
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {upcomingGroups.map(group => (
                    <div key={group.label} className="py-2">
                      <p className="px-4 py-1.5 text-xs font-semibold text-muted uppercase tracking-wider">{group.label}</p>
                      <div className="px-1">
                        {group.events.map(e => (
                          <UpcomingEventCard key={e.id} event={e} onView={setViewingEvent} />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </aside>
      </div>

      {/* ── Event Details Dialog ──────────────────────────────────────────── */}
      <Dialog open={!!viewingEvent} onOpenChange={(open) => !open && setViewingEvent(null)}>
        <DialogContent className="max-w-md">
          {viewingEvent && (
            <>
              <DialogHeader>
                <div className="flex items-start gap-3">
                  <div className={cn("w-2 h-full min-h-[24px] rounded-full shrink-0 mt-1", PRIORITY_STRIP[viewingEvent.priority])} />
                  <div>
                    <DialogTitle className="text-lg">{viewingEvent.title}</DialogTitle>
                    <span className={cn("inline-block text-xs font-medium px-2 py-0.5 rounded-full mt-1", PRIORITY_BADGE[viewingEvent.priority])}>
                      {viewingEvent.priority} Priority
                    </span>
                  </div>
                </div>
              </DialogHeader>

              <div className="space-y-3 mt-2">
                <div className="flex items-center gap-3 text-sm">
                  <CalendarIcon className="size-4 text-muted shrink-0" />
                  <span className="text-text">{format(parseISO(viewingEvent.date), "EEEE, d MMMM yyyy")}</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <Clock className="size-4 text-muted shrink-0" />
                  <span className="text-text">{viewingEvent.time}</span>
                </div>
                {viewingEvent.location && (
                  <div className="flex items-center gap-3 text-sm">
                    <MapPin className="size-4 text-muted shrink-0" />
                    <span className="text-text">{viewingEvent.location}</span>
                  </div>
                )}
                {viewingEvent.notes && (
                  <div className="flex items-start gap-3 text-sm pt-2 border-t border-border">
                    <AlignLeft className="size-4 text-muted shrink-0 mt-0.5" />
                    <p className="text-text whitespace-pre-wrap">{viewingEvent.notes}</p>
                  </div>
                )}
              </div>

              <DialogFooter className="pt-4">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-danger hover:bg-danger/10"
                  onClick={() => {
                    setDeleteId(viewingEvent.id);
                    setViewingEvent(null);
                  }}
                >
                  <Trash2 className="size-4 mr-1.5" />
                  Delete
                </Button>
                <Button variant="secondary" size="sm" onClick={() => openEditModal(viewingEvent)}>
                  <Pencil className="size-4 mr-1.5" />
                  Edit
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Day Events Dialog (+N more) ──────────────────────────────────── */}
      <Dialog open={!!dayEventsDialog} onOpenChange={(open) => !open && setDayEventsDialog(null)}>
        <DialogContent className="max-w-md">
          {dayEventsDialog && (
            <>
              <DialogHeader>
                <DialogTitle>Events on {format(dayEventsDialog.date, "EEEE, d MMMM yyyy")}</DialogTitle>
              </DialogHeader>
              <div className="space-y-2 mt-2 max-h-[400px] overflow-y-auto">
                {dayEventsDialog.events.map(e => (
                  <button
                    key={e.id}
                    onClick={() => {
                      setDayEventsDialog(null);
                      setViewingEvent(e);
                    }}
                    className="w-full text-left flex items-center gap-3 p-3 rounded-lg border border-border hover:border-primary/30 hover:shadow-sm transition-all cursor-pointer"
                  >
                    <div className={cn("w-2 h-8 rounded-full shrink-0", PRIORITY_STRIP[e.priority])} />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-text truncate">{e.title}</p>
                      <div className="flex items-center gap-2 text-xs text-muted">
                        <span>{e.time}</span>
                        {e.location && (
                          <>
                            <span>·</span>
                            <span className="truncate">{e.location}</span>
                          </>
                        )}
                      </div>
                    </div>
                    <span className={cn("text-xs font-medium px-2 py-0.5 rounded-full shrink-0", PRIORITY_BADGE[e.priority])}>
                      {e.priority}
                    </span>
                  </button>
                ))}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Add/Edit Modal ───────────────────────────────────────────────── */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit Event" : "New Event"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title *</Label>
              <Input id="title" {...register("title")} placeholder="e.g. Site Visit at XYZ" autoFocus error={!!errors.title} />
              {errors.title && <p className="text-xs text-danger">{errors.title.message}</p>}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="date">Date *</Label>
                <Input id="date" type="date" {...register("date")} error={!!errors.date} />
                {errors.date && <p className="text-xs text-danger">{errors.date.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="time">Time *</Label>
                <Input id="time" type="time" {...register("time")} error={!!errors.time} />
                {errors.time && <p className="text-xs text-danger">{errors.time.message}</p>}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="location">Location (Optional)</Label>
              <Input id="location" {...register("location")} placeholder="e.g. Main Office" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="priority">Priority</Label>
              <select
                id="priority"
                {...register("priority")}
                className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes (Optional)</Label>
              <textarea
                id="notes"
                {...register("notes")}
                placeholder="e.g. Bring blueprints..."
                className="flex min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
            </div>

            <DialogFooter className="pt-4">
              <Button type="button" variant="secondary" onClick={() => setIsModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" loading={createMutation.isPending || updateMutation.isPending}>
                {editingId ? "Save Changes" : "Create Event"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Delete Confirmation ──────────────────────────────────────────── */}
      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={(open) => !open && setDeleteId(null)}
        title="Delete Event"
        description="Are you sure you want to delete this event? This action cannot be undone."
        confirmLabel="Delete Event"
        onConfirm={() => {
          if (deleteId) {
            deleteMutation.mutate(deleteId, {
              onSuccess: () => {
                setDeleteId(null);
                toast.success("Event deleted");
              },
              onError: (err: any) => toast.error(err.message || "Failed to delete event"),
            });
          }
        }}
        loading={deleteMutation.isPending}
      />
    </div>
  );
}
