import type {
  WorkspaceMemberSummary,
  WorkspaceProjectSummary,
  WorkspaceRole,
} from "./workspace";

export type ProjectStatus =
  | "ACTIVE"
  | "PENDING"
  | "REJECTED"
  | "ARCHIVED";

export interface Project {
  id: number;
  workspace_id: number;
  name: string;
  description: string | null;
  created_by: number;
  owner_id: number;
  status: ProjectStatus;
  created_at: string;
  updated_at: string;
}

export interface ProjectCreatePayload {
  name: string;
  description: string | null;
}

export interface ProjectUpdatePayload {
  name?: string;
  description?: string | null;
}

export interface ProjectListItem extends WorkspaceProjectSummary {
  workspace_id: number;
  workspace_name: string;
  workspace_role: WorkspaceRole;
  owner_name: string | null;
}

export interface ProjectWorkspaceOption {
  id: number;
  name: string;
  role: WorkspaceRole;
}

export interface ProjectCatalog {
  projects: ProjectListItem[];
  workspaces: ProjectWorkspaceOption[];
}

export interface ProjectFormData {
  workspaceId: number | null;
  name: string;
  description: string;
}

export interface ProjectMember {
  id: number;
  project_id: number;
  user_id: number;
  added_by: number | null;
  created_at: string;
}

export interface ProjectMemberSummary extends ProjectMember {
  name: string;
  email: string;
  role: WorkspaceRole | null;
}

export interface ProjectDetailData {
  project: Project;
  summary: WorkspaceProjectSummary | null;
  workspaceName: string;
  role: WorkspaceRole;
  members: ProjectMemberSummary[];
  workspaceMembers: WorkspaceMemberSummary[];
}

export type ProjectHealth =
  | "ALL"
  | "ON_TRACK"
  | "AT_RISK"
  | "COMPLETED"
  | "NO_TASKS";
