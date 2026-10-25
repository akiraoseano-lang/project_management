import {
  ArrowUpRight,
  CheckCheck,
  FolderKanban,
  ListTodo,
  UserPlus,
} from "lucide-react";

import TaskStatusBadge from "../TaskStatusBadge";

import {
  formatTaskDate,
  getChecklistPercent,
  getInitials,
} from "../../../utils/task";

import type { TaskSummary } from "../../../types/task";

import styles from "./TaskTable.module.css";

interface TaskTableProps {
  tasks: TaskSummary[];
  loading: boolean;
  error: string | null;
  hasFilters: boolean;
  currentUserId?: number;
  saving?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  onOpen: (task: TaskSummary) => void;
  onClaim: (task: TaskSummary) => void;
  onUnclaim: (task: TaskSummary) => void;
  onRetry: () => void;
  onReset: () => void;
}

function isMine(task: TaskSummary, currentUserId?: number) {
  return currentUserId !== undefined && task.assigned_to === currentUserId;
}

export default function TaskTable({
  tasks,
  loading,
  error,
  hasFilters,
  currentUserId,
  saving = false,
  emptyTitle = "Belum ada task",
  emptyDescription = "Task yang dibuat di project akan otomatis tampil di sini.",
  onOpen,
  onClaim,
  onUnclaim,
  onRetry,
  onReset,
}: TaskTableProps) {
  if (error) {
    return (
      <div className={styles.errorState}>
        <div>
          <h3>Task gagal dimuat</h3>
          <p>{error}</p>
        </div>

        <button type="button" onClick={onRetry}>
          Coba lagi
        </button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className={styles.skeletonList}>
        {Array.from({ length: 5 }).map((_, index) => (
          <div className={styles.skeletonRow} key={index}>
            <div className={styles.skeletonDot} />
            <div className={styles.skeletonMain}>
              <div className={styles.skeletonTitle} />
              <div className={styles.skeletonText} />
            </div>
            <div className={styles.skeletonChip} />
            <div className={styles.skeletonChip} />
            <div className={styles.skeletonChipWide} />
          </div>
        ))}
      </div>
    );
  }

  if (tasks.length === 0) {
    return (
      <div className={styles.empty}>
        <div className={styles.emptyIcon}>
          <ListTodo size={26} />
        </div>

        <h3>
          {hasFilters ? "Task tidak ditemukan" : emptyTitle}
        </h3>

        <p>
          {hasFilters
            ? "Coba ubah kata kunci atau filter yang kamu gunakan."
            : emptyDescription}
        </p>

        {hasFilters && (
          <button type="button" onClick={onReset}>
            Reset filter
          </button>
        )}
      </div>
    );
  }

  return (
    <div className={styles.tableWrapper}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>Task</th>
            <th>Project</th>
            <th>Assignee</th>
            <th>Checklist</th>
            <th>Status</th>
            <th className={styles.actionsHeader}>Aksi</th>
          </tr>
        </thead>

        <tbody>
          {tasks.map((task) => {
            const mine = isMine(task, currentUserId);
            const checklistPercent = getChecklistPercent(
              task.checklist_done,
              task.checklist_total,
            );

            return (
              <tr
                key={task.id}
                className={styles.row}
                onClick={() => onOpen(task)}
                tabIndex={0}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    onOpen(task);
                  }
                }}
              >
                <td>
                  <div className={styles.taskCell}>
                    <span
                      className={`${styles.taskDot} ${
                        task.status === "DONE"
                          ? styles.dotDone
                          : task.status === "IN_PROGRESS"
                            ? styles.dotProgress
                            : ""
                      }`}
                    />

                    <div className={styles.taskText}>
                      <strong>{task.title}</strong>
                      <span>
                        {task.description?.trim() || "Tanpa deskripsi"}
                      </span>
                    </div>
                  </div>
                </td>

                <td>
                  <div className={styles.projectCell}>
                    <FolderKanban size={14} />
                    <div>
                      <strong>{task.project_name}</strong>
                      <span>{task.workspace_name}</span>
                    </div>
                  </div>
                </td>

                <td>
                  {task.assignee_name ? (
                    <span className={styles.assignee}>
                      <span className={styles.avatar}>
                        {getInitials(task.assignee_name)}
                      </span>
                      {task.assignee_name}
                    </span>
                  ) : (
                    <span className={styles.unassigned}>
                      Unassigned
                    </span>
                  )}
                </td>

                <td>
                  {task.checklist_total > 0 ? (
                    <div className={styles.checklistCell}>
                      <span>
                        <CheckCheck size={13} />
                        {task.checklist_done}/
                        {task.checklist_total}
                      </span>
                      <div className={styles.checklistTrack}>
                        <div
                          className={styles.checklistBar}
                          style={{ width: `${checklistPercent}%` }}
                        />
                      </div>
                    </div>
                  ) : (
                    <span className={styles.muted}>—</span>
                  )}
                </td>

                <td>
                  <TaskStatusBadge status={task.status} />
                  <span className={styles.updated}>
                    {formatTaskDate(task.updated_at)}
                  </span>
                </td>

                <td>
                  <div className={styles.rowActions}>
                    <button
                      type="button"
                      className={styles.openButton}
                      onClick={(event) => {
                        event.stopPropagation();
                        onOpen(task);
                      }}
                    >
                      <ArrowUpRight size={14} />
                      Detail
                    </button>

                    {task.assigned_to === null &&
                      task.status !== "DONE" && (
                        <button
                          type="button"
                          className={styles.claimButton}
                          disabled={saving}
                          onClick={(event) => {
                            event.stopPropagation();
                            onClaim(task);
                          }}
                        >
                          <UserPlus size={14} />
                          Ambil
                        </button>
                      )}

                    {mine && task.status !== "DONE" && (
                      <button
                        type="button"
                        className={styles.unclaimButton}
                        disabled={saving}
                        onClick={(event) => {
                          event.stopPropagation();
                          onUnclaim(task);
                        }}
                      >
                        Lepas
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
