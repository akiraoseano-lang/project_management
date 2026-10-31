import { api } from "../api/client";

import {
  getProjectCatalog,
  getProjectMembers,
} from "./projectService";

import { getWorkspaceMembers } from "./workspaceService";

import type { PaginatedResponse } from "../types/workspace";

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
  return api<PaginatedResponse<TaskSummary>>(
    `/tasks/my?${buildQueryParams(query, 10)}`,
  );
}

export async function getAllTasks(
  query: TaskQuery = {},
): Promise<PaginatedResponse<TaskSummary>> {
  return api<PaginatedResponse<TaskSummary>>(
    `/tasks?${buildQueryParams(query, 10)}`,
  );
}

export async function searchWorkspaceTasks(
  workspaceId: number,
  query: { search: string; page?: number; pageSize?: number },
): Promise<PaginatedResponse<Task>> {
  const params = new URLSearchParams({
    q: query.search.trim(),
    page: String(query.page ?? 1),
    page_size: String(query.pageSize ?? 20),
  });

  return api<PaginatedResponse<Task>>(
    `/workspaces/${workspaceId}/tasks/search?${params}`,
  );
}

export async function getTask(taskId: number): Promise<Task> {
  return api<Task>(`/projects/tasks/${taskId}`);
}

export async function createTask(
  projectId: number,
  payload: TaskCreatePayload,
): Promise<Task> {
  return api<Task>(`/projects/${projectId}/tasks`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateTask(
  taskId: number,
  payload: TaskUpdatePayload,
): Promise<Task> {
  return api<Task>(`/projects/tasks/${taskId}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function claimTask(taskId: number): Promise<Task> {
  return api<Task>(`/projects/tasks/${taskId}/claim`, {
    method: "POST",
  });
}

export async function unclaimTask(taskId: number): Promise<Task> {
  return api<Task>(`/projects/tasks/${taskId}/unclaim`, {
    method: "POST",
  });
}

export async function getTaskChecklist(
  taskId: number,
): Promise<TaskChecklistItem[]> {
  return api<TaskChecklistItem[]>(
    `/projects/tasks/${taskId}/checklist`,
  );
}

export async function createChecklistItem(
  taskId: number,
  title: string,
): Promise<TaskChecklistItem> {
  return api<TaskChecklistItem>(
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
  return api<TaskChecklistItem>(
    `/projects/tasks/checklist/${checklistId}/toggle`,
    {
      method: "POST",
    },
  );
}

export async function getAssignableMembers(
  projectId: number,
  workspaceId: number,
): Promise<TaskAssignee[]> {
  const [projectMembers, workspaceMembers] = await Promise.all([
    getProjectMembers(projectId),
    getWorkspaceMembers(workspaceId),
  ]);

  const workspaceMemberMap = new Map(
    workspaceMembers.items.map((member) => [member.user.id, member]),
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
