import { api } from "../api/client";

import {
  getWorkspaceAnalytics,
  getWorkspaceTasks,
  getWorkspaces,
} from "./workspaceService";

import type {
  Project,
  ProjectCatalog,
  ProjectCreatePayload,
  ProjectJoinRequest,
  ProjectJoinResult,
  ProjectListItem,
  ProjectMember,
  ProjectRequest,
  ProjectUpdatePayload,
  ProjectWorkspaceOption,
} from "../types/project";

import type {
  PaginatedResponse,
  Workspace,
  WorkspaceAnalytics,
  WorkspaceTaskQuery,
  WorkspaceTaskSummary,
} from "../types/workspace";

async function getAllWorkspaces(): Promise<Workspace[]> {
  const workspaces: Workspace[] = [];
  let page = 1;
  let totalPages = 1;

  do {
    const result = await getWorkspaces({
      page,
      pageSize: 100,
    });

    workspaces.push(...result.items);
    totalPages = result.total_pages;
    page += 1;
  } while (page <= totalPages);

  return workspaces;
}

export async function getProjectCatalog(): Promise<ProjectCatalog> {
  const workspaces = await getAllWorkspaces();

  const analyticsResults = await Promise.all(
    workspaces.map(async (workspace) => {
      try {
        const analytics = await getWorkspaceAnalytics(workspace.id);
        return { workspace, analytics };
      } catch {
        return { workspace, analytics: null };
      }
    }),
  );

  const workspaceOptions: ProjectWorkspaceOption[] = [];
  const projects: ProjectListItem[] = [];

  analyticsResults.forEach(({ workspace, analytics }) => {
    if (!analytics) return;

    workspaceOptions.push({
      id: workspace.id,
      name: workspace.name,
      role: analytics.role,
    });

    const memberNames = new Map(
      analytics.members.map((member) => [
        member.user_id,
        member.name,
      ]),
    );

    analytics.projects.forEach((project) => {
      projects.push({
        ...project,
        workspace_id: workspace.id,
        workspace_name: workspace.name,
        workspace_role: analytics.role,
        owner_name: memberNames.get(project.owner_id) ?? null,
      });
    });
  });

  projects.sort((first, second) => {
    return (
      new Date(second.created_at).getTime() -
      new Date(first.created_at).getTime()
    );
  });

  return {
    projects,
    workspaces: workspaceOptions,
  };
}

export async function getProject(projectId: number): Promise<Project> {
  return api<Project>(`/projects/${projectId}`);
}

export async function getProjectMembers(
  projectId: number,
): Promise<PaginatedResponse<ProjectMember>> {
  return api<PaginatedResponse<ProjectMember>>(
    `/projects/${projectId}/members?page=1&page_size=100`,
  );
}

export async function getProjectWorkspaceAnalytics(
  workspaceId: number,
): Promise<WorkspaceAnalytics> {
  return getWorkspaceAnalytics(workspaceId);
}

export async function getProjectTasks(
  workspaceId: number,
  projectId: number,
  query: WorkspaceTaskQuery = {},
): Promise<PaginatedResponse<WorkspaceTaskSummary>> {
  return getWorkspaceTasks(workspaceId, {
    ...query,
    projectId,
  });
}

export async function searchWorkspaceProjects(
  workspaceId: number,
  query: { search: string; page?: number; pageSize?: number },
): Promise<PaginatedResponse<Project>> {
  const params = new URLSearchParams({
    q: query.search.trim(),
    page: String(query.page ?? 1),
    page_size: String(query.pageSize ?? 20),
  });

  return api<PaginatedResponse<Project>>(
    `/workspaces/${workspaceId}/projects/search?${params}`,
  );
}

export async function createProject(
  workspaceId: number,
  payload: ProjectCreatePayload,
): Promise<Project> {
  return api<Project>(`/workspaces/${workspaceId}/projects`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateProject(
  projectId: number,
  payload: ProjectUpdatePayload,
): Promise<Project> {
  return api<Project>(`/projects/${projectId}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function deleteProject(
  projectId: number,
): Promise<void> {
  await api<unknown>(`/projects/${projectId}`, {
    method: "DELETE",
  });
}

export async function addProjectMember(
  projectId: number,
  userId: number,
): Promise<ProjectMember> {
  return api<ProjectMember>(`/projects/${projectId}/members`, {
    method: "POST",
    body: JSON.stringify({ user_id: userId }),
  });
}

export async function removeProjectMember(
  projectId: number,
  userId: number,
): Promise<void> {
  await api<unknown>(`/projects/${projectId}/members/${userId}`, {
    method: "DELETE",
  });
}

export async function leaveProject(projectId: number): Promise<void> {
  await api<unknown>(`/projects/${projectId}/leave`, {
    method: "DELETE",
  });
}

export async function requestJoinProject(
  projectId: number,
): Promise<ProjectJoinResult> {
  return api<ProjectJoinResult>(`/projects/${projectId}/join`, {
    method: "POST",
  });
}

export async function getProjectJoinRequests(
  projectId: number,
  page = 1,
  pageSize = 100,
): Promise<PaginatedResponse<ProjectJoinRequest>> {
  const params = new URLSearchParams({
    page: String(page),
    page_size: String(pageSize),
  });

  return api<PaginatedResponse<ProjectJoinRequest>>(
    `/project_requests/projects/${projectId}/join?${params}`,
  );
}

export async function approveJoinRequest(
  requestId: number,
): Promise<unknown> {
  return api<unknown>(
    `/project_requests/${requestId}/approve-join`,
    { method: "POST" },
  );
}

export async function rejectJoinRequest(
  requestId: number,
): Promise<unknown> {
  return api<unknown>(
    `/project_requests/${requestId}/reject-join`,
    { method: "POST" },
  );
}

export async function getWorkspaceProjectRequests(
  workspaceId: number,
  page = 1,
  pageSize = 100,
): Promise<PaginatedResponse<ProjectRequest>> {
  const params = new URLSearchParams({
    page: String(page),
    page_size: String(pageSize),
  });

  return api<PaginatedResponse<ProjectRequest>>(
    `/project_requests/workspaces/${workspaceId}?${params}`,
  );
}

export async function getProjectRequests(
  projectId: number,
  page = 1,
  pageSize = 100,
): Promise<PaginatedResponse<ProjectRequest>> {
  const params = new URLSearchParams({
    page: String(page),
    page_size: String(pageSize),
  });

  return api<PaginatedResponse<ProjectRequest>>(
    `/project_requests/projects/${projectId}?${params}`,
  );
}

export async function approveProjectRequest(
  requestId: number,
): Promise<unknown> {
  return api<unknown>(`/project_requests/${requestId}/approve`, {
    method: "POST",
  });
}

export async function rejectProjectRequest(
  requestId: number,
): Promise<unknown> {
  return api<unknown>(`/project_requests/${requestId}/reject`, {
    method: "POST",
  });
}
