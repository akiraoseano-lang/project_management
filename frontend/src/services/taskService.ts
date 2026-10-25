import {
  getProjectCatalog,
  getProjectMembers,
} from "./projectService";

import type { PaginatedResponse, WorkspaceRole } from "../types/workspace";

import type {
  Task,
  TaskAssignee,
  TaskCatalog,
  TaskChecklistItem,
  TaskCreatePayload,
  TaskQuery,
  TaskSummary,
  TaskUpdatePayload,
} from "../types/task";

const API_BASE_URL =
  import.meta.env.VITE_API_URL ?? "http://127.0.0.1:8000";

interface WorkspaceMemberEntry {
  id: number;
  role: WorkspaceRole;
  joined_at: string;
  user: {
    id: number;
    name: string;
    email: string;
  };
}

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

function buildQueryParams(
  query: TaskQuery,
  defaultPageSize: number,
): URLSearchParams {
  const params = new URLSearchParams({
    page: String(query.page ?? 1),
    page_size: String(query.pageSize ?? defaultPageSize),
  });

  if (query.status && query.status !== "ALL") {
    params.set("status", query.status);
  }

  if (query.projectId != null) {
    params.set("project_id", String(query.projectId));
  }

  if (query.workspaceId != null) {
    params.set("workspace_id", String(query.workspaceId));
  }

  if (query.search?.trim()) {
    params.set("q", query.search.trim());
  }

  return params;
}

export async function getTaskCatalog(): Promise<TaskCatalog> {
  const catalog = await getProjectCatalog();

  return {
    projects: catalog.projects.map((project) => ({
      id: project.id,
      name: project.name,
      workspaceId: project.workspace_id,
      workspaceName: project.workspace_name,
      workspaceRole: project.workspace_role,
      ownerId: project.owner_id,
    })),
    workspaces: catalog.workspaces,
  };
}

export async function getMyTasks(
  query: TaskQuery = {},
): Promise<PaginatedResponse<TaskSummary>> {
  return request<PaginatedResponse<TaskSummary>>(
    `/tasks/my?${buildQueryParams(query, 10)}`,
  );
}

export async function getAllTasks(
  query: TaskQuery = {},
): Promise<PaginatedResponse<TaskSummary>> {
  return request<PaginatedResponse<TaskSummary>>(
    `/tasks?${buildQueryParams(query, 10)}`,
  );
}

export async function getTask(taskId: number): Promise<Task> {
  return request<Task>(`/projects/tasks/${taskId}`);
}

export async function createTask(
  projectId: number,
  payload: TaskCreatePayload,
): Promise<Task> {
  return request<Task>(`/projects/${projectId}/tasks`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateTask(
  taskId: number,
  payload: TaskUpdatePayload,
): Promise<Task> {
  return request<Task>(`/projects/tasks/${taskId}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function claimTask(taskId: number): Promise<Task> {
  return request<Task>(`/projects/tasks/${taskId}/claim`, {
    method: "POST",
  });
}

export async function unclaimTask(taskId: number): Promise<Task> {
  return request<Task>(`/projects/tasks/${taskId}/unclaim`, {
    method: "POST",
  });
}

export async function getTaskChecklist(
  taskId: number,
): Promise<TaskChecklistItem[]> {
  return request<TaskChecklistItem[]>(
    `/projects/tasks/${taskId}/checklist`,
  );
}

export async function createChecklistItem(
  taskId: number,
  title: string,
): Promise<TaskChecklistItem> {
  return request<TaskChecklistItem>(
    `/projects/tasks/${taskId}/checklist`,
    {
      method: "POST",
      body: JSON.stringify({ title }),
    },
  );
}

export async function toggleChecklistItem(
  checklistId: number,
): Promise<TaskChecklistItem> {
  return request<TaskChecklistItem>(
    `/projects/tasks/checklist/${checklistId}/toggle`,
    {
      method: "POST",
    },
  );
}

async function getWorkspaceMemberEntries(
  workspaceId: number,
): Promise<WorkspaceMemberEntry[]> {
  const result = await request<
    PaginatedResponse<WorkspaceMemberEntry>
  >(
    `/workspaces/${workspaceId}/members?page=1&page_size=100`,
  );

  return result.items;
}

export async function getAssignableMembers(
  projectId: number,
  workspaceId: number,
): Promise<TaskAssignee[]> {
  const [projectMembers, workspaceMembers] = await Promise.all([
    getProjectMembers(projectId),
    getWorkspaceMemberEntries(workspaceId),
  ]);

  const workspaceMemberMap = new Map(
    workspaceMembers.map((member) => [member.user.id, member]),
  );

  return projectMembers.items.flatMap((member) => {
    const workspaceMember = workspaceMemberMap.get(member.user_id);

    if (!workspaceMember) return [];

    return [
      {
        userId: member.user_id,
        name: workspaceMember.user.name,
        email: workspaceMember.user.email,
        role: workspaceMember.role,
      },
    ];
  });
}
