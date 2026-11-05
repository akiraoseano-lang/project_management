import type {
  ActivityGroup,
  ActivityGroupFilter,
  ActivityIconKey,
  ActivityLog,
  ActivityTone,
} from "../types/activity";

const ACTION_LABELS: Record<string, string> = {
  WORKSPACE_CREATED: "membuat workspace",
  WORKSPACE_UPDATED: "memperbarui workspace",
  WORKSPACE_DELETED: "menghapus workspace",

  MEMBER_ADDED: "menambahkan anggota",
  MEMBER_ROLE_CHANGED: "mengubah role anggota",
  MEMBER_LEFT: "keluar dari workspace",
  MEMBER_REMOVED: "menghapus anggota",

  REQUEST_CREATED: "mengirim pengajuan",
  REQUEST_APPROVED: "menyetujui pengajuan",
  REQUEST_REJECTED: "menolak pengajuan",

  PROJECT_CREATED: "membuat project",
  PROJECT_UPDATED: "memperbarui project",
  PROJECT_DELETED: "menghapus project",
  PROJECT_MEMBER_ADDED: "menambahkan anggota project",
  PROJECT_MEMBER_REMOVED: "menghapus anggota project",
  PROJECT_MEMBER_LEFT: "keluar dari project",

  TASK_CREATED: "membuat task",
  TASK_UPDATED: "memperbarui task",
  TASK_STATUS_UPDATED: "mengubah status task",
  TASK_STATUS_CHANGED: "mengubah status task",
  TASK_ASSIGNED: "meng-assign task",
  TASK_UNCLAIMED: "melepas task",
  TASK_DELETED: "menghapus task",
  TASK_CHECKLIST_CREATION: "menambahkan checklist",
  TASK_CHECKLIST_TOGGLED: "memperbarui checklist",
};

function asString(value: unknown): string | null {
  return typeof value === "string" && value.trim()
    ? value.trim()
    : null;
}

function asNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value)
    ? value
    : null;
}

function humanize(value: string) {
  const normalized = value.replace(/_/g, " ").toLowerCase();

  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

function humanizeRole(value: string) {
  return humanize(value);
}

function humanizeStatus(value: string) {
  switch (value) {
    case "TODO":
      return "To Do";
    case "IN_PROGRESS":
      return "In Progress";
    case "DONE":
      return "Done";
    case "ACTIVE":
      return "Active";
    default:
      return humanize(value);
  }
}

export function getActivityGroup(
  activity: ActivityLog,
): ActivityGroup {
  const action = activity.action.toUpperCase();

  if (
    action.startsWith("MEMBER_") ||
    action.startsWith("PROJECT_MEMBER")
  ) {
    return "MEMBER";
  }

  if (
    action.startsWith("REQUEST_") ||
    action.startsWith("PROJECT_REQUEST")
  ) {
    return "REQUEST";
  }

  if (action.startsWith("WORKSPACE")) return "WORKSPACE";
  if (action.startsWith("PROJECT")) return "PROJECT";
  if (action.startsWith("TASK")) return "TASK";

  return "OTHER";
}

export function getActivityIconKey(
  activity: ActivityLog,
): ActivityIconKey {
  if (
    activity.action === "TASK_CHECKLIST_CREATION" ||
    activity.action === "TASK_CHECKLIST_TOGGLED"
  ) {
    return "checklist";
  }

  switch (getActivityGroup(activity)) {
    case "WORKSPACE":
      return "workspace";
    case "PROJECT":
      return "project";
    case "TASK":
      return "task";
    case "MEMBER":
      return "member";
    case "REQUEST":
      return "request";
    default:
      return "other";
  }
}

export function getActivityTone(
  activity: ActivityLog,
): ActivityTone {
  switch (getActivityGroup(activity)) {
    case "WORKSPACE":
      return "indigo";
    case "PROJECT":
      return "blue";
    case "TASK":
      return "orange";
    case "MEMBER":
      return "purple";
    case "REQUEST":
      if (activity.action === "REQUEST_APPROVED") return "green";
      if (activity.action === "REQUEST_REJECTED") return "red";
      return "purple";
    default:
      return "slate";
  }
}

export function getActivityLabel(activity: ActivityLog) {
  return (
    ACTION_LABELS[activity.action] ?? humanize(activity.action)
  );
}

export function getActivityTarget(
  activity: ActivityLog,
): string | null {
  const details = activity.details ?? {};

  const memberName = asString(details.member_name);
  const workspaceName =
    asString(details.workspace_name) ?? activity.workspace_name;
  const projectName =
    asString(details.project_name) ?? activity.project_name;
  const taskTitle =
    asString(details.task_title) ??
    asString(details.new_title) ??
    activity.task_title;
  const checklistTitle = asString(details.checklist_title);

  const action = activity.action;

  if (
    action === "TASK_CHECKLIST_CREATION" ||
    action === "TASK_CHECKLIST_TOGGLED"
  ) {
    return checklistTitle ?? taskTitle;
  }

  if (
    action.startsWith("MEMBER_") ||
    action.startsWith("PROJECT_MEMBER")
  ) {
    return memberName ?? projectName ?? workspaceName;
  }

  if (action.startsWith("WORKSPACE")) return workspaceName;
  if (action.startsWith("PROJECT")) return projectName;
  if (action.startsWith("TASK")) return taskTitle;
  if (action.startsWith("REQUEST")) {
    return projectName ?? workspaceName;
  }

  return projectName ?? taskTitle ?? workspaceName;
}

export function getActivityDescription(
  activity: ActivityLog,
): string | null {
  const details = activity.details ?? {};
  const action = activity.action;

  if (action === "MEMBER_ROLE_CHANGED") {
    const oldRole = asString(details.old_role);
    const newRole = asString(details.new_role);

    if (oldRole && newRole) {
      return `Role berubah dari ${humanizeRole(oldRole)} ke ${humanizeRole(newRole)}.`;
    }
  }

  if (
    action === "TASK_STATUS_UPDATED" ||
    action === "TASK_STATUS_CHANGED"
  ) {
    const oldStatus = asString(details.old_status);
    const newStatus = asString(details.new_status);

    if (oldStatus && newStatus) {
      return `Status berubah dari ${humanizeStatus(oldStatus)} ke ${humanizeStatus(newStatus)}.`;
    }
  }

  if (action === "TASK_ASSIGNED") {
    const assignee =
      asString(details.assignee_name) ??
      asString(details.assigned_to_name);
    const assignedTo = asNumber(details.assigned_to);

    if (assignee) return `Ditugaskan ke ${assignee}.`;
    if (assignedTo !== null) {
      return `Ditugaskan ke user #${assignedTo}.`;
    }
  }

  if (action === "TASK_UNCLAIMED") {
    const previousAssignee = asString(details.previous_assignee);

    if (previousAssignee) {
      return `Dilepas dari ${previousAssignee}.`;
    }
  }

  if (action === "PROJECT_UPDATED") {
    const oldName = asString(details.old_name);
    const newName = asString(details.new_name);

    if (oldName && newName && oldName !== newName) {
      return `Nama project diubah dari "${oldName}" ke "${newName}".`;
    }

    return "Detail project diperbarui.";
  }

  if (action === "TASK_UPDATED") {
    const oldTitle = asString(details.old_title);
    const newTitle = asString(details.new_title);

    if (oldTitle && newTitle && oldTitle !== newTitle) {
      return `Judul task diubah dari "${oldTitle}" ke "${newTitle}".`;
    }

    return "Detail task diperbarui.";
  }

  if (action === "TASK_CHECKLIST_CREATION") {
    const title = asString(details.checklist_title);

    if (title) return `Checklist "${title}" ditambahkan.`;
  }

  if (action === "TASK_CHECKLIST_TOGGLED") {
    const title = asString(details.checklist_title);
    const completed = details.new_completed === true;

    if (title) {
      return `Checklist "${title}" ${
        completed ? "ditandai selesai" : "dibuka kembali"
      }.`;
    }
  }

  if (
    action === "PROJECT_MEMBER_REMOVED" ||
    action === "PROJECT_MEMBER_LEFT"
  ) {
    const unassignedTasks = asNumber(details.unassigned_tasks);

    if (unassignedTasks !== null && unassignedTasks > 0) {
      return `${unassignedTasks} task terkait menjadi unassigned.`;
    }
  }

  if (action === "MEMBER_ADDED") {
    const role = asString(details.role);

    if (role) {
      return `Ditambahkan sebagai ${humanizeRole(role)}.`;
    }
  }

  if (action === "REQUEST_CREATED") {
    const requestAction =
      asString(details.request_action) ?? asString(details.action);

    if (requestAction) {
      return `Pengajuan ${humanize(requestAction)}.`;
    }
  }

  if (
    action === "REQUEST_APPROVED" ||
    action === "REQUEST_REJECTED"
  ) {
    const requestAction =
      asString(details.request_action) ?? asString(details.action);

    if (requestAction) {
      return `Pengajuan ${humanize(requestAction)} ${
        action === "REQUEST_APPROVED" ? "disetujui" : "ditolak"
      }.`;
    }
  }

  return null;
}

export function filterActivities(
  activities: ActivityLog[],
  group: ActivityGroupFilter,
  search: string,
) {
  const term = search.trim().toLowerCase();

  return activities.filter((activity) => {
    if (
      group !== "ALL" &&
      getActivityGroup(activity) !== group
    ) {
      return false;
    }

    if (!term) return true;

    const haystack = [
      activity.actor_name,
      activity.actor_email,
      activity.action,
      getActivityLabel(activity),
      getActivityTarget(activity),
      getActivityDescription(activity),
      JSON.stringify(activity.details ?? {}),
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    return haystack.includes(term);
  });
}

export function getActivityCounts(
  activities: ActivityLog[],
): Record<ActivityGroupFilter, number> {
  const counts: Record<ActivityGroupFilter, number> = {
    ALL: activities.length,
    WORKSPACE: 0,
    PROJECT: 0,
    TASK: 0,
    MEMBER: 0,
    REQUEST: 0,
    OTHER: 0,
  };

  activities.forEach((activity) => {
    counts[getActivityGroup(activity)] += 1;
  });

  return counts;
}

export function getActivityDateKey(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "unknown";

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export function getActivityDateLabel(key: string) {
  if (key === "unknown") return "Tanggal tidak diketahui";

  const date = new Date(`${key}T00:00:00`);

  if (Number.isNaN(date.getTime())) {
    return "Tanggal tidak diketahui";
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  if (date.getTime() === today.getTime()) return "Hari ini";
  if (date.getTime() === yesterday.getTime()) return "Kemarin";

  return date.toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function formatActivityRelativeTime(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "-";

  const diff = Date.now() - date.getTime();
  const minutes = Math.floor(diff / 60_000);

  if (minutes < 1) return "Baru saja";
  if (minutes < 60) return `${minutes} menit lalu`;

  const hours = Math.floor(minutes / 60);

  if (hours < 24) return `${hours} jam lalu`;

  const days = Math.floor(hours / 24);

  if (days < 7) return `${days} hari lalu`;

  return date.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function formatActivityDateTime(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "-";

  return date.toLocaleString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function getActivityInitials(name: string | null) {
  return (
    name
      ?.trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part.charAt(0).toUpperCase())
      .join("") || "?"
  );
}
