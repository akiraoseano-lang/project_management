import type { TaskStatus } from "../types/task";

export const TASK_PAGE_SIZE = 10;

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  TODO: "To Do",
  IN_PROGRESS: "In Progress",
  DONE: "Done",
};

export function getTaskStatusLabel(status: string): string {
  return (
    TASK_STATUS_LABELS[status as TaskStatus] ?? status
  );
}

export function formatTaskDate(
  value: string | null | undefined,
): string {
  if (!value) return "-";

  return new Date(value).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function formatTaskDateTime(
  value: string | null | undefined,
): string {
  if (!value) return "-";

  return new Date(value).toLocaleString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function getInitials(name: string | null | undefined): string {
  if (!name) return "U";

  return (
    name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part.charAt(0).toUpperCase())
      .join("") || "U"
  );
}

export function getChecklistPercent(
  done: number,
  total: number,
): number {
  if (total <= 0) return 0;

  return Math.round((done / total) * 100);
}
