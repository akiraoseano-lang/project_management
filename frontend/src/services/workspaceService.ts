import type {
  PaginatedResponse,
  Workspace,
  WorkspaceAnalytics,
  WorkspaceCreatePayload,
  WorkspaceQuery,
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

export async function getWorkspaces(
  query: WorkspaceQuery = {},
): Promise<PaginatedResponse<Workspace>> {
  const page = query.page ?? 1;
  const pageSize = query.pageSize ?? 12;
  const search = query.search?.trim();

  const params = new URLSearchParams({
    page: String(page),
    page_size: String(pageSize),
  });

  const path = search
    ? `/workspaces/search?${new URLSearchParams({
        q: search,
        page: String(page),
        page_size: String(pageSize),
      })}`
    : `/workspaces?${params}`;

  return request<PaginatedResponse<Workspace>>(path);
}

export async function getWorkspace(
  workspaceId: number,
): Promise<Workspace> {
  return request<Workspace>(`/workspaces/${workspaceId}`);
}

export async function createWorkspace(
  payload: WorkspaceCreatePayload,
): Promise<Workspace> {
  return request<Workspace>("/workspaces", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateWorkspace(
  workspaceId: number,
  payload: Partial<WorkspaceCreatePayload>,
): Promise<Workspace> {
  return request<Workspace>(`/workspaces/${workspaceId}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function deleteWorkspace(
  workspaceId: number,
): Promise<void> {
  await request<void>(`/workspaces/${workspaceId}`, {
    method: "DELETE",
  });
}

export async function getWorkspaceAnalytics(
  workspaceId: number,
): Promise<WorkspaceAnalytics> {
  return request<WorkspaceAnalytics>(
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

  return request<PaginatedResponse<WorkspaceTaskSummary>>(
    `/workspaces/${workspaceId}/tasks?${params}`,
  );
}