const MS_PER_DAY = 24 * 60 * 60 * 1000;

export type AnalyticsRangeKey = "today" | "7d" | "30d" | "90d";

const RANGE_LABELS: Record<AnalyticsRangeKey, string> = {
  today: "Today",
  "7d": "Last 7 days",
  "30d": "Last 30 days",
  "90d": "Last 90 days",
};

export const parseAnalyticsRange = (raw?: string): AnalyticsRangeKey => {
  if (raw === "today" || raw === "7d" || raw === "30d" || raw === "90d") return raw;
  return "30d";
};

export const resolveDateRange = (range: AnalyticsRangeKey) => {
  const now = new Date();
  const to = now;

  if (range === "today") {
    const from = new Date(now);
    from.setHours(0, 0, 0, 0);
    const previousTo = new Date(from);
    const previousFrom = new Date(from.getTime() - MS_PER_DAY);
    return {
      from,
      to,
      label: RANGE_LABELS.today,
      previousFrom,
      previousTo,
      days: 1,
    };
  }

  const days = range === "7d" ? 7 : range === "90d" ? 90 : 30;
  const from = new Date(now.getTime() - days * MS_PER_DAY);
  const span = to.getTime() - from.getTime();
  const previousTo = new Date(from);
  const previousFrom = new Date(from.getTime() - span);

  return {
    from,
    to,
    label: RANGE_LABELS[range],
    previousFrom,
    previousTo,
    days,
  };
};

export const dayKey = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export const monthKey = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
};

export const pctChange = (current: number, previous: number): number | null => {
  if (previous === 0) return current > 0 ? 100 : null;
  return ((current - previous) / previous) * 100;
};
