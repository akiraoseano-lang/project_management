export interface Workspace {
    id: number;
    name: string;
    description: string | null;
    owner_id: number;
    created_at: string;
}

export type WorkspaceJoinStatus = "PENDING" | "APPROVED" | "REJECTED";

export interface WorkspaceDiscoverItem extends Workspace {
    is_member: boolean;
    join_status: WorkspaceJoinStatus | null;
}

export interface WorkspaceDiscoverQuery {
    page?: number;
    pageSize?: number;
    search?: string;
}

export interface WorkspaceCreatePayload {
    name: string;
    description: string | null;
}

export interface PaginatedResponse<T> {
    items: T[];
    page: number;
    page_size: number;
    total: number;
    total_pages: number;
}

export interface WorkspaceQuery {
    page?: number;
    pageSize?: number;
    search?: string;
}

export type WorkspaceRole = "OWNER" | "ADMIN" | "COLLABORATOR";

export type TaskStatus = "TODO" | "IN_PROGRESS" | "DONE";

export type TaskStatusFilter = "ALL" | TaskStatus;

export interface WorkspaceAnalyticsStats {
    total_projects: number;
    total_tasks: number;
    todo_tasks: number;
    in_progress_tasks: number;
    done_tasks: number;
    unassigned_tasks: number;
    my_tasks: number;
    total_members: number;
    completion_rate: number;
}

export interface WorkspaceProjectSummary {
    id: number;
    name: string;
    description: string | null;
    status: string;
    owner_id: number;
    created_at: string;
    updated_at: string;
    total_tasks: number;
    todo_tasks: number;
    in_progress_tasks: number;
    done_tasks: number;
    progress: number;
    member_count: number;
}

export interface WorkspaceTaskSummary {
    id: number;
    project_id: number;
    project_name: string;
    title: string;
    description: string | null;
    status: TaskStatus;
    created_by: number;
    creator_name: string | null;
    assigned_to: number | null;
    assignee_name: string | null;
    created_at: string;
    updated_at: string;
}

export interface WorkspaceMemberSummary {
    id: number;
    user_id: number;
    name: string;
    email: string;
    role: WorkspaceRole;
    joined_at: string;
}

export interface WorkspaceMemberUser {
    id: number;
    name: string;
    email: string;
}

export interface WorkspaceMember {
    id: number;
    role: WorkspaceRole;
    joined_at: string;
    user: WorkspaceMemberUser;
}

export type WorkspaceRequestAction =
    | "JOIN"
    | "REMOVE_MEMBER"
    | "CHANGE_ROLE"
    | "UPDATE_WORKSPACE";

export type WorkspaceRequestStatus =
    | "PENDING"
    | "APPROVED"
    | "REJECTED";

export interface WorkspaceRequestPayload {
    action: WorkspaceRequestAction;
    target_user_id?: number | null;
    payload?: Record<string, unknown> | null;
}

export interface WorkspaceRequest {
    id: number;
    workspace_id: number;
    requested_by: number;
    action: WorkspaceRequestAction;
    target_user_id: number | null;
    payload: Record<string, unknown> | null;
    status: WorkspaceRequestStatus;
    reviewed_by: number | null;
    created_at: string;
    reviewed_at: string | null;
    requester_name: string | null;
    requester_email: string | null;
    target_user_name: string | null;
}

export interface WorkspaceAnalytics {
    workspace: Workspace;
    role: WorkspaceRole;
    stats: WorkspaceAnalyticsStats;
    projects: WorkspaceProjectSummary[];
    members: WorkspaceMemberSummary[];
    recent_tasks: WorkspaceTaskSummary[];
}

export interface WorkspaceTaskQuery {
    page?: number;
    pageSize?: number;
    status?: TaskStatusFilter;
    projectId?: number;
    mine?: boolean;
    search?: string;
}

export interface ApiErrorResponse {
    detail?: string;
}