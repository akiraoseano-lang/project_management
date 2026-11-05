export type ActivityGroup =
  | "WORKSPACE"
  | "PROJECT"
  | "TASK"
  | "MEMBER"
  | "REQUEST"
  | "OTHER";

export type ActivityGroupFilter = "ALL" | ActivityGroup;

export type ActivitySource = "api" | "derived";

export type ActivityTone =
  | "indigo"
  | "blue"
  | "orange"
  | "purple"
  | "green"
  | "red"
  | "slate";

export type ActivityIconKey =
  | "workspace"
  | "project"
  | "task"
  | "checklist"
  | "member"
  | "request"
  | "other";

export interface ActivityLog {
  id: number;
  workspace_id: number;
  project_id: number | null;
  task_id: number | null;
  actor_id: number | null;
  actor_name: string | null;
  actor_email: string | null;
  action: string;
  entity_type: string;
  entity_id: number | null;
  details: Record<string, unknown>;
  created_at: string;
  workspace_name: string | null;
  project_name: string | null;
  task_title: string | null;
}

export interface ActivityLogQuery {
  page?: number;
  pageSize?: number;
}

export interface ActivityFeedResult {
  items: ActivityLog[];
  source: ActivitySource;
}
