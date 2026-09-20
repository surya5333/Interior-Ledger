import { getPrisma } from "./prisma";
import {
  startOfWeek,
  startOfMonth,
  startOfYear,
  endOfWeek,
  endOfMonth,
  endOfYear,
  eachDayOfInterval,
  eachMonthOfInterval,
  format,
  differenceInDays,
  differenceInMonths,
  isBefore,
  isAfter,
  isEqual,
  startOfDay,
  endOfDay,
} from "date-fns";

export type DateRangePreset = "this_week" | "this_month" | "this_year" | "custom";

export interface ProgressDateRange {
  preset: DateRangePreset;
  startDate: string;
  endDate: string;
}

export interface ProgressTrendPoint {
  label: string;
  count: number;
  bucketStart: string;
}

export interface ProgressProjectRow {
  id: string;
  name: string;
  createdAt: string;
  isLocked: boolean;
  location: string | null;
  client: { id: string; name: string };
}

export interface ProgressData {
  totalProjects: number;
  activeProjects: number;
  draftProjects: number;
  trend: ProgressTrendPoint[];
  projects: ProgressProjectRow[];
}

function buildRange(preset: DateRangePreset, startDateStr?: string, endDateStr?: string): { start: Date; end: Date } {
  const now = new Date();

  switch (preset) {
    case "this_week": {
      const start = startOfWeek(now, { weekStartsOn: 1 });
      const end = endOfWeek(now, { weekStartsOn: 1 });
      return { start, end };
    }
    case "this_month": {
      return { start: startOfMonth(now), end: endOfMonth(now) };
    }
    case "this_year": {
      return { start: startOfYear(now), end: endOfYear(now) };
    }
    case "custom": {
      if (!startDateStr || !endDateStr) {
        return { start: startOfYear(now), end: endOfYear(now) };
      }
      const start = startOfDay(new Date(startDateStr));
      const end = endOfDay(new Date(endDateStr));
      return { start, end };
    }
  }
}

function buildBuckets(
  range: { start: Date; end: Date }
): { buckets: { start: Date; end: Date; label: string }[]; grouping: "day" | "month" } {
  const days = Math.max(0, differenceInDays(range.end, range.start)) + 1;
  const months = Math.max(0, differenceInMonths(range.end, range.start)) + 1;

  if (days <= 62) {
    const daysInRange = eachDayOfInterval({ start: range.start, end: range.end });
    const buckets = daysInRange.map((d) => ({
      start: startOfDay(d),
      end: endOfDay(d),
      label: format(d, "MMM d"),
    }));
    return { buckets, grouping: "day" };
  }

  const monthsInRange = eachMonthOfInterval({ start: range.start, end: range.end });
  const buckets = monthsInRange.map((m) => ({
    start: startOfMonth(m),
    end: endOfMonth(m),
    label: format(m, "MMM yyyy"),
  }));
  return { buckets, grouping: "month" };
}

function withinBucket(date: Date, bucketStart: Date, bucketEnd: Date): boolean {
  const d = new Date(date);
  return (
    (isEqual(d, bucketStart) || isAfter(d, bucketStart)) &&
    (isEqual(d, bucketEnd) || isBefore(d, bucketEnd))
  );
}

export async function getProgress(
  role: "ADMIN" | "MANAGER",
  params: ProgressDateRange
): Promise<ProgressData> {
  const range = buildRange(params.preset, params.startDate, params.endDate);
  const prisma = getPrisma();

  const visibilityFilter: any = role === "MANAGER" ? { visibility: "SHARED" } : {};

  const where = {
    createdAt: {
      gte: range.start,
      lte: range.end,
    },
    ...visibilityFilter,
  };

  const [allProjects, activeCount, draftCount] = await Promise.all([
    prisma.project.findMany({
      where,
      select: {
        id: true,
        name: true,
        createdAt: true,
        isLocked: true,
        location: true,
        client: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.project.count({
      where: { ...where, isLocked: false },
    }),
    prisma.project.count({
      where: { ...where, isLocked: true },
    }),
  ]);

  const { buckets } = buildBuckets(range);

  const trend: ProgressTrendPoint[] = buckets.map((bucket) => {
    const count = allProjects.filter((p) => withinBucket(p.createdAt, bucket.start, bucket.end)).length;
    return {
      label: bucket.label,
      count,
      bucketStart: bucket.start.toISOString(),
    };
  });

  return {
    totalProjects: allProjects.length,
    activeProjects: activeCount,
    draftProjects: draftCount,
    trend,
    projects: allProjects.map((p) => ({
      id: p.id,
      name: p.name,
      createdAt: p.createdAt.toISOString(),
      isLocked: p.isLocked,
      location: p.location,
      client: p.client,
    })),
  };
}
