import { api } from "../api/client";

import type {
  PaginatedResponse,
  Workspace,
  WorkspaceAnalytics,
  WorkspaceCreatePayload,
  WorkspaceDiscoverItem,
  WorkspaceDiscoverQuery,
  WorkspaceMember,
  WorkspaceQuery,
  WorkspaceRequest,
  WorkspaceRequestPayload,
  WorkspaceTaskQuery,
  WorkspaceTaskSummary,
} from "../types/workspace";

export async function getWorkspaces(
  query: WorkspaceQuery = {},
): Promise<PaginatedResponse<Workspace>> {
  const page = query.page ?? 1;
  const pageSize = query.pageSize ?? 12;
  const search = query.search?.trim();

  if (search) {
    const params = new URLSearchParams({
      q: search,
      page: String(page),
      page_size: String(pageSize),
    });

    return api<PaginatedResponse<Workspace>>(
      `/workspaces/search?${params}`,
    );
  }

  const params = new URLSearchParams({
    page: String(page),
    page_size: String(pageSize),
  });

  return api<PaginatedResponse<Workspace>>(`/workspaces?${params}`);
}

export async function getWorkspace(
  workspaceId: number,
): Promise<Workspace> {
  return api<Workspace>(`/workspaces/${workspaceId}`);
}

export async function discoverWorkspaces(
  query: WorkspaceDiscoverQuery = {},
): Promise<PaginatedResponse<WorkspaceDiscoverItem>> {
  const params = new URLSearchParams({
    page: String(query.page ?? 1),
    page_size: String(query.pageSize ?? 8),
  });

  if (query.search?.trim()) {
    params.set("q", query.search.trim());
  }

  return api<PaginatedResponse<WorkspaceDiscoverItem>>(
    `/workspaces/discover?${params}`,
  );
}

export async function requestJoinWorkspace(
  workspaceId: number,
): Promise<WorkspaceRequest> {
  return api<WorkspaceRequest>(`/workspaces/${workspaceId}/join`, {
    method: "POST",
  });
}

export async function createWorkspace(
  payload: WorkspaceCreatePayload,
): Promise<Workspace> {
  return api<Workspace>("/workspaces", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateWorkspace(
  workspaceId: number,
  payload: Partial<WorkspaceCreatePayload>,
): Promise<Workspace> {
  return api<Workspace>(`/workspaces/${workspaceId}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function deleteWorkspace(
  workspaceId: number,
): Promise<void> {
  await api<unknown>(`/workspaces/${workspaceId}`, {
    method: "DELETE",
  });
}

export async function getWorkspaceAnalytics(
  workspaceId: number,
): Promise<WorkspaceAnalytics> {
  return api<WorkspaceAnalytics>(
    `/workspaces/${workspaceId}/analytics`,
  );
}

export async function getWorkspaceTasks(
  workspaceId: number,
  query: WorkspaceTaskQuery = {},
): Promise<PaginatedResponse<WorkspaceTaskSummary>> {
  const params = new URLSearchParams({
    page: String(query.page ?? 1),
    page_size: String(query.pageSize ?? 10),
  });

  if (query.status && query.status !== "ALL") {
    params.set("status", query.status);
  }

  if (query.projectId != null) {
    params.set("project_id", String(query.projectId));
  }

  if (query.mine) {
    params.set("mine", "true");
  }

  if (query.search?.trim()) {
    params.set("q", query.search.trim());
  }

  return api<PaginatedResponse<WorkspaceTaskSummary>>(
    `/workspaces/${workspaceId}/tasks?${params}`,
  );
}

export async function getWorkspaceMembers(
  workspaceId: number,
  page = 1,
  pageSize = 100,
): Promise<PaginatedResponse<WorkspaceMember>> {
  const params = new URLSearchParams({
    page: String(page),
    page_size: String(pageSize),
  });

  return api<PaginatedResponse<WorkspaceMember>>(
    `/workspaces/${workspaceId}/members?${params}`,
  );
}

export async function addWorkspaceMember(
  workspaceId: number,
  userId: number,
): Promise<WorkspaceMember> {
  return api<WorkspaceMember>(`/workspaces/${workspaceId}/members`, {
    method: "POST",
    body: JSON.stringify({ user_id: userId }),
  });
}

export async function removeWorkspaceMember(
  workspaceId: number,
  userId: number,
): Promise<void> {
  await api<unknown>(
    `/workspaces/${workspaceId}/members/${userId}`,
    { method: "DELETE" },
  );
}

export async function updateWorkspaceMemberRole(
  workspaceId: number,
  userId: number,
  role: "ADMIN" | "COLLABORATOR",
): Promise<WorkspaceMember> {
  return api<WorkspaceMember>(
    `/workspaces/${workspaceId}/members/${userId}`,
    {
      method: "PATCH",
      body: JSON.stringify({ role }),
    },
  );
}

export async function leaveWorkspace(
  workspaceId: number,
): Promise<void> {
  await api<unknown>(`/workspaces/${workspaceId}/members/me`, {
    method: "DELETE",
  });
}

export async function getWorkspaceRequests(
  workspaceId: number,
  page = 1,
  pageSize = 100,
): Promise<PaginatedResponse<WorkspaceRequest>> {
  const params = new URLSearchParams({
    page: String(page),
    page_size: String(pageSize),
  });

  return api<PaginatedResponse<WorkspaceRequest>>(
    `/workspaces/${workspaceId}/requests?${params}`,
  );
}

export async function createWorkspaceRequest(
  workspaceId: number,
  payload: WorkspaceRequestPayload,
): Promise<WorkspaceRequest> {
  return api<WorkspaceRequest>(
    `/workspaces/${workspaceId}/requests`,
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
  );
}

export async function approveWorkspaceRequest(
  workspaceId: number,
  requestId: number,
): Promise<WorkspaceRequest> {
  return api<WorkspaceRequest>(
    `/workspaces/${workspaceId}/requests/${requestId}/approve`,
    { method: "PATCH" },
  );
}

export async function rejectWorkspaceRequest(
  workspaceId: number,
  requestId: number,
): Promise<WorkspaceRequest> {
  return api<WorkspaceRequest>(
    `/workspaces/${workspaceId}/requests/${requestId}/reject`,
    { method: "PATCH" },
  );
}

export async function getAllWorkspaces(): Promise<Workspace[]> {
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
