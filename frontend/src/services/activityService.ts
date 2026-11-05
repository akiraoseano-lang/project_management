/**
 * Contract yang dipakai frontend:
 *
 * GET /workspaces/{workspace_id}/activity?page=1&page_size=100
 * Response: { items: ActivityLog[] } atau ActivityLog[].
 *
 * ActivityLog minimal berisi field model activity_log:
 * id, workspace_id, project_id, task_id, actor_id, action,
 * entity_type, entity_id, details/metadata, created_at.
 * actor_name/actor_email opsional, tetapi disarankan agar UI
 * bisa menampilkan nama pelaku aktivitas.
 *
 * Selama endpoint tersebut belum tersedia, service ini membuat
 * ringkasan aktivitas dari data project, task, member, dan request
 * yang sudah ada supaya UI tetap bisa dipakai.
 */
import { api } from "../api/client";

import { getWorkspaceProjectRequests } from "./projectService";
import {
  getWorkspaceAnalytics,
  getWorkspaceRequests,
  getWorkspaceTasks,
} from "./workspaceService";

import type {
  ActivityFeedResult,
  ActivityLog,
  ActivityLogQuery,
} from "../types/activity";

type RawRecord = Record<string, unknown>;

function isRecord(value: unknown): value is RawRecord {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  );
}

function toStringValue(value: unknown): string | null {
  return typeof value === "string" && value.trim()
    ? value.trim()
    : null;
}

function toNumberValue(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);

    if (Number.isFinite(parsed)) return parsed;
  }

  return null;
}

function normalizeActivity(
  raw: RawRecord,
  fallbackWorkspaceId: number,
  index: number,
): ActivityLog {
  const details = isRecord(raw.details)
    ? raw.details
    : isRecord(raw.metadata)
      ? raw.metadata
      : {};

  const actor = isRecord(raw.actor)
    ? raw.actor
    : isRecord(raw.user)
      ? raw.user
      : null;

  const workspace = isRecord(raw.workspace)
    ? raw.workspace
    : null;
  const project = isRecord(raw.project) ? raw.project : null;
  const task = isRecord(raw.task) ? raw.task : null;

  const workspaceName =
    toStringValue(raw.workspace_name) ??
    toStringValue(details.workspace_name) ??
    toStringValue(workspace?.name);
  const projectName =
    toStringValue(raw.project_name) ??
    toStringValue(details.project_name) ??
    toStringValue(project?.name);
  const taskTitle =
    toStringValue(raw.task_title) ??
    toStringValue(details.task_title) ??
    toStringValue(details.new_title) ??
    toStringValue(task?.title);

  return {
    id: toNumberValue(raw.id) ?? -(index + 1),
    workspace_id:
      toNumberValue(raw.workspace_id) ?? fallbackWorkspaceId,
    project_id: toNumberValue(raw.project_id),
    task_id: toNumberValue(raw.task_id),
    actor_id:
      toNumberValue(raw.actor_id) ??
      toNumberValue(actor?.id),
    actor_name:
      toStringValue(raw.actor_name) ??
      toStringValue(actor?.name) ??
      toStringValue(raw.actor),
    actor_email:
      toStringValue(raw.actor_email) ??
      toStringValue(actor?.email),
    action: toStringValue(raw.action) ?? "UNKNOWN",
    entity_type: toStringValue(raw.entity_type) ?? "",
    entity_id: toNumberValue(raw.entity_id),
    details,
    created_at:
      toStringValue(raw.created_at) ??
      toStringValue(raw.createdAt) ??
      "",
    workspace_name: workspaceName,
    project_name: projectName,
    task_title: taskTitle,
  };
}

function extractRawActivities(raw: unknown): RawRecord[] {
  if (Array.isArray(raw)) {
    return raw.filter(isRecord);
  }

  if (isRecord(raw) && Array.isArray(raw.items)) {
    return raw.items.filter(isRecord);
  }

  if (isRecord(raw) && Array.isArray(raw.data)) {
    return raw.data.filter(isRecord);
  }

  throw new Error("Format response activity log tidak dikenali.");
}

function isAfter(
  later: string,
  earlier: string,
  thresholdMs = 1000,
) {
  const laterTime = new Date(later).getTime();
  const earlierTime = new Date(earlier).getTime();

  return (
    Number.isFinite(laterTime) &&
    Number.isFinite(earlierTime) &&
    laterTime - earlierTime > thresholdMs
  );
}

async function deriveWorkspaceActivity(
  workspaceId: number,
  limit: number,
): Promise<ActivityLog[]> {
  const [
    analyticsResult,
    tasksResult,
    workspaceRequestsResult,
    projectRequestsResult,
  ] = await Promise.allSettled([
    getWorkspaceAnalytics(workspaceId),
    getWorkspaceTasks(workspaceId, {
      page: 1,
      pageSize: 100,
    }),
    getWorkspaceRequests(workspaceId, 1, 100),
    getWorkspaceProjectRequests(workspaceId, 1, 100),
  ]);

  if (analyticsResult.status === "rejected") {
    throw analyticsResult.reason instanceof Error
      ? analyticsResult.reason
      : new Error("Gagal memuat aktivitas workspace.");
  }

  const analytics = analyticsResult.value;
  const tasks =
    tasksResult.status === "fulfilled"
      ? tasksResult.value.items
      : [];
  const workspaceRequests =
    workspaceRequestsResult.status === "fulfilled"
      ? workspaceRequestsResult.value.items
      : [];
  const projectRequests =
    projectRequestsResult.status === "fulfilled"
      ? projectRequestsResult.value.items
      : [];

  const memberNames = new Map<number, string>();
  const memberEmails = new Map<number, string>();

  analytics.members.forEach((member) => {
    memberNames.set(member.user_id, member.name);
    memberEmails.set(member.user_id, member.email);
  });

  const activities: ActivityLog[] = [];

  const build = (params: {
    action: string;
    entityType: string;
    entityId: number | null;
    createdAt: string;
    actorId?: number | null;
    actorName?: string | null;
    actorEmail?: string | null;
    projectId?: number | null;
    taskId?: number | null;
    details?: Record<string, unknown>;
    projectName?: string | null;
    taskTitle?: string | null;
  }): ActivityLog => ({
    id: -(activities.length + 1),
    workspace_id: workspaceId,
    project_id: params.projectId ?? null,
    task_id: params.taskId ?? null,
    actor_id: params.actorId ?? null,
    actor_name: params.actorName ?? null,
    actor_email: params.actorEmail ?? null,
    action: params.action,
    entity_type: params.entityType,
    entity_id: params.entityId,
    details: params.details ?? {},
    created_at: params.createdAt,
    workspace_name: analytics.workspace.name,
    project_name: params.projectName ?? null,
    task_title: params.taskTitle ?? null,
  });

  activities.push(
    build({
      action: "WORKSPACE_CREATED",
      entityType: "WORKSPACE",
      entityId: analytics.workspace.id,
      createdAt: analytics.workspace.created_at,
      actorId: analytics.workspace.owner_id,
      actorName:
        memberNames.get(analytics.workspace.owner_id) ?? null,
      actorEmail:
        memberEmails.get(analytics.workspace.owner_id) ?? null,
      details: {
        workspace_name: analytics.workspace.name,
      },
    }),
  );

  analytics.projects.forEach((project) => {
    const actorId = project.owner_id;
    const actorName = memberNames.get(actorId) ?? null;

    activities.push(
      build({
        action: "PROJECT_CREATED",
        entityType: "PROJECT",
        entityId: project.id,
        createdAt: project.created_at,
        actorId,
        actorName,
        actorEmail: memberEmails.get(actorId) ?? null,
        projectId: project.id,
        projectName: project.name,
        details: {
          project_name: project.name,
          status: project.status,
        },
      }),
    );

    if (isAfter(project.updated_at, project.created_at)) {
      activities.push(
        build({
          action: "PROJECT_UPDATED",
          entityType: "PROJECT",
          entityId: project.id,
          createdAt: project.updated_at,
          actorId,
          actorName,
          actorEmail: memberEmails.get(actorId) ?? null,
          projectId: project.id,
          projectName: project.name,
          details: {
            project_name: project.name,
          },
        }),
      );
    }
  });

  tasks.forEach((task) => {
    activities.push(
      build({
        action: "TASK_CREATED",
        entityType: "TASK",
        entityId: task.id,
        createdAt: task.created_at,
        actorId: task.created_by,
        actorName: task.creator_name,
        projectId: task.project_id,
        taskId: task.id,
        projectName: task.project_name,
        taskTitle: task.title,
        details: {
          task_title: task.title,
          status: task.status,
        },
      }),
    );

    if (isAfter(task.updated_at, task.created_at)) {
      activities.push(
        build({
          action: "TASK_UPDATED",
          entityType: "TASK",
          entityId: task.id,
          createdAt: task.updated_at,
          actorId: task.assigned_to ?? task.created_by,
          actorName: task.assignee_name ?? task.creator_name,
          projectId: task.project_id,
          taskId: task.id,
          projectName: task.project_name,
          taskTitle: task.title,
          details: {
            task_title: task.title,
            new_status: task.status,
          },
        }),
      );
    }
  });

  analytics.members.forEach((member) => {
    activities.push(
      build({
        action: "MEMBER_ADDED",
        entityType: "WORKSPACE_MEMBER",
        entityId: member.id,
        createdAt: member.joined_at,
        actorId: member.user_id,
        actorName: member.name,
        actorEmail: member.email,
        details: {
          member_id: member.user_id,
          member_name: member.name,
          member_email: member.email,
          role: member.role,
        },
      }),
    );
  });

  workspaceRequests.forEach((request) => {
    activities.push(
      build({
        action: "REQUEST_CREATED",
        entityType: "WORKSPACE_REQUEST",
        entityId: request.id,
        createdAt: request.created_at,
        actorId: request.requested_by,
        actorName:
          request.requester_name ??
          memberNames.get(request.requested_by) ??
          null,
        actorEmail:
          request.requester_email ??
          memberEmails.get(request.requested_by) ??
          null,
        details: {
          request_id: request.id,
          request_action: request.action,
          status: "PENDING",
        },
      }),
    );

    if (request.reviewed_at) {
      activities.push(
        build({
          action:
            request.status === "APPROVED"
              ? "REQUEST_APPROVED"
              : "REQUEST_REJECTED",
          entityType: "WORKSPACE_REQUEST",
          entityId: request.id,
          createdAt: request.reviewed_at,
          actorId: request.reviewed_by,
          details: {
            request_id: request.id,
            request_action: request.action,
            status: request.status,
          },
        }),
      );
    }
  });

  projectRequests.forEach((request) => {
    activities.push(
      build({
        action: "REQUEST_CREATED",
        entityType: "PROJECT_REQUEST",
        entityId: request.id,
        createdAt: request.created_at,
        actorId: request.requested_by,
        actorName: request.requester_name,
        actorEmail: request.requester_email,
        projectId: request.project_id,
        projectName: request.project_name,
        details: {
          action: request.action,
          project_name: request.project_name,
          status: "PENDING",
        },
      }),
    );

    if (request.reviewed_at) {
      activities.push(
        build({
          action:
            request.status === "APPROVED"
              ? "REQUEST_APPROVED"
              : "REQUEST_REJECTED",
          entityType: "PROJECT_REQUEST",
          entityId: request.id,
          createdAt: request.reviewed_at,
          actorId: request.reviewed_by,
          actorName: request.reviewer_name,
          projectId: request.project_id,
          projectName: request.project_name,
          details: {
            action: request.action,
            project_name: request.project_name,
            status: request.status,
          },
        }),
      );
    }
  });

  return activities
    .filter(
      (activity) =>
        !Number.isNaN(new Date(activity.created_at).getTime()),
    )
    .sort(
      (first, second) =>
        new Date(second.created_at).getTime() -
        new Date(first.created_at).getTime(),
    )
    .slice(0, limit);
}

export async function getWorkspaceActivity(
  workspaceId: number,
  query: ActivityLogQuery = {},
): Promise<ActivityFeedResult> {
  const page = query.page ?? 1;
  const pageSize = query.pageSize ?? 100;

  const params = new URLSearchParams({
    page: String(page),
    page_size: String(pageSize),
  });

  try {
    const raw = await api<unknown>(
      `/workspaces/${workspaceId}/activity?${params}`,
    );

    const items = extractRawActivities(raw)
      .map((activity, index) =>
        normalizeActivity(activity, workspaceId, index),
      )
      .filter(
        (activity) =>
          !Number.isNaN(new Date(activity.created_at).getTime()),
      )
      .sort(
        (first, second) =>
          new Date(second.created_at).getTime() -
          new Date(first.created_at).getTime(),
      );

    return {
      items,
      source: "api",
    };
  } catch {
    const items = await deriveWorkspaceActivity(
      workspaceId,
      pageSize,
    );

    return {
      items,
      source: "derived",
    };
  }
}
