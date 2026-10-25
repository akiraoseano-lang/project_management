import type { ProjectHealth } from "../types/project";
import type { WorkspaceProjectSummary } from "../types/workspace";

type ProjectHealthInput = Pick<
  WorkspaceProjectSummary,
  "total_tasks" | "progress"
>;

export type ProjectHealthState = Exclude<ProjectHealth, "ALL">;

export function getProjectHealth(
  project: ProjectHealthInput,
): ProjectHealthState {
  if (project.total_tasks === 0) return "NO_TASKS";
  if (project.progress >= 100) return "COMPLETED";
  if (project.progress >= 50) return "ON_TRACK";
  return "AT_RISK";
}

export function getProjectHealthLabel(
  health: ProjectHealthState,
): string {
  switch (health) {
    case "COMPLETED":
      return "Completed";
    case "ON_TRACK":
      return "On Track";
    case "AT_RISK":
      return "At Risk";
    default:
      return "Belum ada task";
  }
}

export function formatProjectDate(
  value: string | null | undefined,
): string {
  if (!value) return "-";

  return new Date(value).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function getInitials(name: string): string {
  return (
    name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part.charAt(0).toUpperCase())
      .join("") || "U"
  );
}
