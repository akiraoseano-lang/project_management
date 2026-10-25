import {
  getWorkspaceAnalytics,
  getWorkspaceTasks,
  getWorkspaces,
} from "./workspaceService";

import type {
  Project,
  ProjectCatalog,
  ProjectCreatePayload,
  ProjectListItem,
  ProjectMember,
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

const API_BASE_URL =
  import.meta.env.VITE_API_URL ?? "http://127.0.0.1:8000";

async function request<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    credentials: "include",
    headers: {
      Accept: "application/json",
      ...(options.body
        ? { "Content-Type": "application/json" }
        : {}),
      ...options.headers,
    },
  });

  if (!response.ok) {
    let message = `Request gagal (${response.status})`;

    try {
      const body = (await response.json()) as {
        detail?: string | { msg?: string }[];
      };

      if (typeof body.detail === "string") {
        message = body.detail;
      } else if (Array.isArray(body.detail)) {
        message = body.detail
          .map((item) => item.msg ?? "Data tidak valid")
          .join(", ");
      }
    } catch {
      // Response tidak memiliki JSON yang bisa dibaca.
    }

    throw new Error(message);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

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
  return request<Project>(`/projects/${projectId}`);
}

export async function getProjectMembers(
  projectId: number,
): Promise<PaginatedResponse<ProjectMember>> {
  return request<PaginatedResponse<ProjectMember>>(
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

export async function createProject(
  workspaceId: number,
  payload: ProjectCreatePayload,
): Promise<Project> {
  return request<Project>(`/workspaces/${workspaceId}/projects`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateProject(
  projectId: number,
  payload: ProjectUpdatePayload,
): Promise<Project> {
  return request<Project>(`/projects/${projectId}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function deleteProject(
  projectId: number,
): Promise<void> {
  await request<void>(`/projects/${projectId}`, {
    method: "DELETE",
  });
}
