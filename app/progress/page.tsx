"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Calendar, FileText, FolderKanban, Inbox, Lock, TrendingUp } from "lucide-react";
import {
  BarChart,
  Bar,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Cell,
} from "recharts";
import type { DateRangePreset, ProgressProjectRow } from "../../lib/progress";
import { useProgress } from "../../hooks/use-progress";
import { PageHeader } from "../../components/page-header";
import { SummaryStrip } from "../../components/summary-strip";
import { SearchBar } from "../../components/search-bar";
import { EmptyState } from "../../components/empty-state";
import { DashboardCard, SectionHeader } from "../../components/financial-overview/dashboard-card";
import {
  DataTable,
  DataTableHeader,
  DataTableHeaderRow,
  DataTableHead,
  DataTableBody,
  DataTableRow,
  DataTableCell,
} from "../../components/ui/data-table";
import { Badge } from "../../components/ui/badge";
import { NativeSelect } from "../../components/ui/select";
import { Input, Label } from "../../components/ui/input";
import { Button } from "../../components/ui/button";
import { Skeleton, PageSkeleton, TableSkeleton } from "../../components/ui/skeleton";
import { cn } from "../../lib/cn";

type PresetOption = DateRangePreset;

const PRESET_OPTIONS: { value: PresetOption; label: string }[] = [
  { value: "this_week", label: "This Week" },
  { value: "this_month", label: "This Month" },
  { value: "this_year", label: "This Year" },
  { value: "custom", label: "Custom Range" },
];

const PROGRESS_NAVY = "#0f2544";
const PROGRESS_GOLD = "#d4af37";
const PROGRESS_GREEN = "#15803d";
const PROGRESS_RED = "#b91c1c";

export default function ProgressPage() {
  const [preset, setPreset] = useState<PresetOption>("this_year");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [query, setQuery] = useState("");

  const effectiveParams = useMemo(() => {
    if (preset === "custom") {
      if (startDate && endDate) {
        return { preset, startDate, endDate };
      }
      const today = new Date();
      const start = new Date(today.getFullYear(), 0, 1);
      return {
        preset: "custom" as PresetOption,
        startDate: start.toISOString().slice(0, 10),
        endDate: today.toISOString().slice(0, 10),
      };
    }
    return { preset };
  }, [preset, startDate, endDate]);

  const { data, isLoading, isError, error } = useProgress(effectiveParams);

  const filteredProjects = useMemo(() => {
    if (!data?.projects) return [];
    const q = query.trim().toLowerCase();
    if (!q) return data.projects;
    return data.projects.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.client?.name.toLowerCase().includes(q) ||
        p.location?.toLowerCase().includes(q)
    );
  }, [data?.projects, query]);

  if (isLoading) return <ProgressSkeleton />;

  if (isError) {
    const msg = (error as any)?.message || "Failed to load progress data.";
    toast.error(msg);
    return (
      <div className="space-y-8 fade-in">
        <PageHeader
          breadcrumbItems={[{ label: "Directory" }, { label: "Progress" }]}
          title="Progress"
          subtitle="Track your projects across different time periods."
        />
        <EmptyState
          title="Could not load progress"
          description={msg}
          actionLabel="Retry"
          onAction={() => window.location.reload()}
        />
      </div>
    );
  }

  const hasAnyProjects = !!data && data.totalProjects > 0;

  return (
    <div className="space-y-6 fade-in">
      <PageHeader
        breadcrumbItems={[{ label: "Directory" }, { label: "Progress" }]}
        title="Progress"
        subtitle="Track your projects across different time periods."
      />

      {/* Controls */}
      <div className="rounded-2xl border border-border/80 bg-white p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04)] space-y-4 md:space-y-0 md:flex md:items-end md:justify-between md:gap-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:gap-4 flex-1 flex-wrap">
          <div className="space-y-1.5 min-w-[200px]">
            <Label>Time Period</Label>
            <NativeSelect
              value={preset}
              onChange={(e) => setPreset(e.target.value as PresetOption)}
            >
              {PRESET_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </NativeSelect>
          </div>
          {preset === "custom" && (
            <>
              <div className="space-y-1.5 min-w-[200px]">
                <Label>Start Date</Label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <div className="space-y-1.5 min-w-[200px]">
                <Label>End Date</Label>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
              {(!!startDate || !!endDate) && (
                <Button
                  variant="secondary"
                  onClick={() => {
                    if (!startDate || !endDate) {
                      toast.error("Select both start and end dates.");
                    }
                  }}
                >
                  <Calendar className="size-4 mr-2" />
                  Apply Range
                </Button>
              )}
            </>
          )}
        </div>

        <div className="min-w-[240px] w-full md:max-w-[420px] shrink-0">
          <SearchBar
            query={query}
            onQueryChange={setQuery}
            placeholder="Search projects or clients..."
          />
        </div>
      </div>

      {/* Summary cards */}
      <SummaryStrip
        items={[
          {
            label: "Total Projects",
            value: String(data?.totalProjects ?? 0),
            color: "default",
          },
          {
            label: "Active Projects",
            value: String(data?.activeProjects ?? 0),
            color: "credit",
          },
          {
            label: "Project Drafts",
            value: String(data?.draftProjects ?? 0),
            color: "debit",
          },
        ]}
      />

      {/* Trend chart */}
      <DashboardCard>
        <SectionHeader
          title="Project Activity"
          subtitle="Projects created over the selected period"
        />
        {!hasAnyProjects || !data?.trend.length ? (
          <EmptyTrendChart />
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart
              data={data.trend}
              margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fill: "#707070", fontSize: 12 }}
                axisLine={false}
                tickLine={false}
                interval="preserveStartEnd"
                minTickGap={24}
              />
              <YAxis
                tick={{ fill: "#707070", fontSize: 12 }}
                axisLine={false}
                tickLine={false}
                allowDecimals={false}
              />
              <Tooltip
                cursor={{ fill: "#f5f5f5" }}
                contentStyle={{
                  borderRadius: "8px",
                  border: "1px solid #E8E8E8",
                  fontSize: "13px",
                }}
                formatter={(value) => [`${value} projects`, "Created"]}
                labelFormatter={(label) => `Period: ${label}`}
              />
              <Bar dataKey="count" name="Projects" radius={[4, 4, 0, 0]} barSize={36}>
                {data.trend.map((_, i) => (
                  <Cell key={i} fill={PROGRESS_NAVY} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </DashboardCard>

      {/* All projects table */}
      <div className="space-y-4">
        <div className="flex items-end justify-between gap-4 flex-wrap">
          <div>
            <h2 className="text-lg font-semibold tracking-tight text-text">All Projects</h2>
            <p className="text-sm text-muted mt-1">
              {data?.totalProjects ?? 0} project{data?.totalProjects === 1 ? "" : "s"} created in the selected period.
            </p>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-green-50 px-2 py-0.5 text-[11px] font-medium text-success">
              <span className="h-1.5 w-1.5 rounded-full bg-success" />
              Active
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-danger-light px-2 py-0.5 text-[11px] font-medium text-danger">
              <span className="h-1.5 w-1.5 rounded-full bg-danger" />
              Draft
            </span>
          </div>
        </div>

        {!hasAnyProjects ? (
          <div className="rounded-xl border border-border bg-white">
            <EmptyState
              title="No projects found"
              description="No projects were created during this period."
              icon={<Inbox className="size-6 text-muted" strokeWidth={1.5} />}
            />
          </div>
        ) : filteredProjects.length === 0 ? (
          <div className="rounded-xl border border-border bg-white">
            <EmptyState
              title="No matches"
              description={`No projects match "${query}" for this period.`}
              icon={<FileText className="size-6 text-muted" strokeWidth={1.5} />}
            />
          </div>
        ) : (
          <DataTable>
            <DataTableHeader>
              <DataTableHeaderRow>
                <DataTableHead>Project Name</DataTableHead>
                <DataTableHead>Client</DataTableHead>
                <DataTableHead className="hidden md:table-cell">Location</DataTableHead>
                <DataTableHead className="hidden sm:table-cell">Created</DataTableHead>
                <DataTableHead align="right">Status</DataTableHead>
              </DataTableHeaderRow>
            </DataTableHeader>
            <DataTableBody>
              {filteredProjects.map((p) => (
                <ProjectRow key={p.id} project={p} />
              ))}
            </DataTableBody>
          </DataTable>
        )}
      </div>
    </div>
  );
}

function ProjectRow({ project }: { project: ProgressProjectRow }) {
  const isDraft = project.isLocked;
  return (
    <DataTableRow
      className={cn(
        "cursor-pointer transition-colors",
        "hover:bg-primary-light/40 hover:border-primary/40"
      )}
      onClick={() => {
        window.location.href = `/projects/${project.id}`;
      }}
    >
      <DataTableCell>
        <div className="flex items-center gap-2 min-w-0">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary-light text-primary">
            <FolderKanban className="size-4" />
          </div>
          <Link
            href={`/projects/${project.id}`}
            onClick={(e) => e.stopPropagation()}
            className="font-medium text-text hover:text-primary transition-colors truncate"
          >
            {project.name}
          </Link>
        </div>
      </DataTableCell>
      <DataTableCell className="text-muted truncate">{project.client?.name || "—"}</DataTableCell>
      <DataTableCell className="hidden md:table-cell text-muted truncate">
        {project.location || "—"}
      </DataTableCell>
      <DataTableCell className="hidden sm:table-cell text-muted whitespace-nowrap">
        {new Date(project.createdAt).toLocaleDateString(undefined, {
          year: "numeric",
          month: "short",
          day: "numeric",
        })}
      </DataTableCell>
      <DataTableCell align="right">
        {isDraft ? (
          <Badge variant="danger">
            <Lock className="size-3 mr-1" />
            Draft
          </Badge>
        ) : (
          <Badge variant="success">
            <TrendingUp className="size-3 mr-1" />
            Active
          </Badge>
        )}
      </DataTableCell>
    </DataTableRow>
  );
}

function EmptyTrendChart() {
  return (
    <div className="flex h-[300px] flex-col items-center justify-center rounded-xl border border-dashed border-border/80 text-sm text-muted">
      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-hover/70">
        <TrendingUp className="size-5 text-muted" strokeWidth={1.75} />
      </div>
      <p className="font-medium text-text">No project activity yet</p>
      <p className="mt-1 text-xs">No projects were created during this period.</p>
    </div>
  );
}

function ProgressSkeleton() {
  return (
    <div className="space-y-6 fade-in">
      <PageSkeleton />
      <div className="rounded-2xl border border-border/80 bg-white p-5 space-y-4 md:flex md:items-end md:gap-6">
        <div className="flex-1 flex gap-4 flex-wrap">
          <div className="space-y-2 min-w-[200px]">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-12 w-full" />
          </div>
          <div className="space-y-2 min-w-[200px]">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-12 w-full" />
          </div>
        </div>
        <Skeleton className="h-12 w-full md:max-w-[420px]" />
      </div>
      <div className="rounded-xl border border-border bg-white overflow-hidden">
        <div className="flex flex-wrap md:flex-nowrap">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className={cn(
                "flex flex-col gap-2 px-6 py-5 flex-1 min-w-[150px]",
                i < 2 && "border-b md:border-b-0 md:border-r border-border"
              )}
            >
              <Skeleton className="h-3 w-28" />
              <Skeleton className="h-8 w-16" />
            </div>
          ))}
        </div>
      </div>
      <div className="rounded-2xl border border-border/80 bg-white p-6">
        <div className="mb-5 flex items-end justify-between gap-4">
          <div className="space-y-1">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-4 w-64" />
          </div>
        </div>
        <Skeleton className="h-[300px] w-full rounded-lg" />
      </div>
      <div className="space-y-4">
        <div className="flex items-end justify-between">
          <div className="space-y-1">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-4 w-56" />
          </div>
        </div>
        <div className="rounded-xl border border-border bg-white overflow-hidden">
          <TableSkeleton rows={6} cols={5} />
        </div>
      </div>
    </div>
  );
}
