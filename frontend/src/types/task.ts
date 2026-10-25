import type { WorkspaceRole } from "./workspace";

export type TaskStatus = "TODO" | "IN_PROGRESS" | "DONE";

export type TaskStatusFilter = "ALL" | TaskStatus;

export type TaskFeedMode = "mine" | "all";

export interface Task {
  id: number;
  project_id: number;
  title: string;
  description: string | null;
  created_by: number;
  assigned_to: number | null;
  status: TaskStatus;
  created_at: string;
  updated_at: string;
}

export interface TaskSummary {
  id: number;
  project_id: number;
  project_name: string;
  workspace_id: number;
  workspace_name: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  created_by: number;
  creator_name: string | null;
  assigned_to: number | null;
  assignee_name: string | null;
  checklist_total: number;
  checklist_done: number;
  created_at: string;
  updated_at: string;
}

export interface TaskCreatePayload {
  title: string;
  description: string | null;
  assigned_to: number | null;
}

export interface TaskUpdatePayload {
  title?: string;
  description?: string | null;
  status?: TaskStatus;
}

export interface TaskChecklistItem {
  id: number;
  task_id: number;
  title: string;
  is_completed: boolean;
  created_at: string;
  updated_at: string;
}

export interface TaskQuery {
  page?: number;
  pageSize?: number;
  status?: TaskStatusFilter;
  projectId?: number;
  workspaceId?: number;
  search?: string;
}

export interface TaskProjectOption {
  id: number;
  name: string;
  workspaceId: number;
  workspaceName: string;
  workspaceRole: WorkspaceRole;
  ownerId: number;
}

export interface TaskWorkspaceOption {
  id: number;
  name: string;
  role: WorkspaceRole;
}

export interface TaskCatalog {
  projects: TaskProjectOption[];
  workspaces: TaskWorkspaceOption[];
}

export interface TaskAssignee {
  userId: number;
  name: string;
  email: string;
  role: WorkspaceRole | null;
}

export interface TaskFormData {
  projectId: number | null;
  title: string;
  description: string;
  assignedTo: number | null;
}
