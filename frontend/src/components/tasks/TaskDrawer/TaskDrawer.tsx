import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import {
  CalendarDays,
  CheckCheck,
  CircleCheck,
  CircleDashed,
  CircleDot,
  FolderKanban,
  Layers3,
  ListChecks,
  Pencil,
  Plus,
  UserPlus,
  UserRound,
  UserRoundMinus,
  X,
} from "lucide-react";

import { useTaskChecklist } from "../../../hooks/useTaskChecklist";

import {
  formatTaskDate,
  formatTaskDateTime,
  getInitials,
} from "../../../utils/task";

import type { TaskStatus, TaskSummary } from "../../../types/task";

import styles from "./TaskDrawer.module.css";

interface TaskDrawerProps {
  task: TaskSummary | null;
  currentUserId?: number;
  canManage: boolean;
  canChangeStatus: boolean;
  saving?: boolean;
  onClose: () => void;
  onEdit: (task: TaskSummary) => void;
  onChangeStatus: (taskId: number, status: TaskStatus) => void;
  onClaim: (taskId: number) => void;
  onUnclaim: (taskId: number) => void;
  onRefresh: () => void;
}

const STATUS_ACTIONS: {
  value: TaskStatus;
  label: string;
  icon: typeof CircleDashed;
}[] = [
  { value: "TODO", label: "To Do", icon: CircleDashed },
  { value: "IN_PROGRESS", label: "In Progress", icon: CircleDot },
  { value: "DONE", label: "Done", icon: CircleCheck },
];

export default function TaskDrawer({
  task,
  currentUserId,
  canManage,
  canChangeStatus,
  saving = false,
  onClose,
  onEdit,
  onChangeStatus,
  onClaim,
  onUnclaim,
  onRefresh,
}: TaskDrawerProps) {
  const [newItem, setNewItem] = useState("");
  const [checklistError, setChecklistError] = useState("");

  const {
    items,
    loading: checklistLoading,
    saving: checklistSaving,
    error: checklistLoadError,
    addItem,
    toggleItem,
    reload,
  } = useTaskChecklist({
    taskId: task?.id ?? null,
    onChange: onRefresh,
  });

  useEffect(() => {
    setNewItem("");
    setChecklistError("");
  }, [task?.id]);

  useEffect(() => {
    if (!task) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [task, onClose]);

  if (!task) return null;

  const isMine =
    currentUserId !== undefined &&
    task.assigned_to === currentUserId;

  const canToggleChecklist =
    isMine && !checklistSaving && !saving;

  const handleAddItem = async (
    event: FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    const title = newItem.trim();

    if (!title) {
      setChecklistError("Judul checklist wajib diisi.");
      return;
    }

    setChecklistError("");

    try {
      await addItem(title);
      setNewItem("");
    } catch (err) {
      setChecklistError(
        err instanceof Error
          ? err.message
          : "Gagal menambah checklist.",
      );
    }
  };

  const handleToggle = async (checklistId: number) => {
    setChecklistError("");

    try {
      await toggleItem(checklistId);
    } catch (err) {
      setChecklistError(
        err instanceof Error
          ? err.message
          : "Gagal memperbarui checklist.",
      );
    }
  };

  return (
    <div
      className={styles.overlay}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <aside
        className={styles.drawer}
        role="dialog"
        aria-modal="true"
        aria-labelledby="task-drawer-title"
      >
        <header className={styles.header}>
          <div className={styles.headerMain}>
            <span className={styles.eyebrow}>TASK DETAIL</span>
            <h2 id="task-drawer-title">{task.title}</h2>

            <div className={styles.headerMeta}>
              <span>
                <FolderKanban size={13} />
                {task.project_name}
              </span>
              <span>
                <Layers3 size={13} />
                {task.workspace_name}
              </span>
            </div>
          </div>

          <div className={styles.headerActions}>
            {canManage && (
              <button
                type="button"
                className={styles.editButton}
                onClick={() => onEdit(task)}
              >
                <Pencil size={14} />
                Edit
              </button>
            )}

            <button
              type="button"
              className={styles.closeButton}
              onClick={onClose}
              aria-label="Tutup detail task"
            >
              <X size={18} />
            </button>
          </div>
        </header>

        <div className={styles.body}>
          <section className={styles.section}>
            <h3>Deskripsi</h3>
            <p className={styles.description}>
              {task.description?.trim() ||
                "Belum ada deskripsi untuk task ini."}
            </p>
          </section>

          <section className={styles.section}>
            <h3>Status</h3>

            <div
              className={styles.statusActions}
              role="group"
              aria-label="Ubah status task"
            >
              {STATUS_ACTIONS.map((action) => {
                const Icon = action.icon;
                const active = task.status === action.value;

                return (
                  <button
                    key={action.value}
                    type="button"
                    className={`${styles.statusButton} ${
                      active ? styles.statusActive : ""
                    }`}
                    disabled={
                      !canChangeStatus || saving || active
                    }
                    onClick={() =>
                      onChangeStatus(task.id, action.value)
                    }
                  >
                    <Icon size={15} />
                    {action.label}
                  </button>
                );
              })}
            </div>

            {!canChangeStatus && (
              <p className={styles.hint}>
                Hanya assignee, project owner, atau workspace owner
                yang dapat mengubah status.
              </p>
            )}
          </section>

          <section className={styles.metaGrid}>
            <div className={styles.metaItem}>
              <span>Assignee</span>
              <strong>
                {task.assignee_name ? (
                  <>
                    <span className={styles.avatar}>
                      {getInitials(task.assignee_name)}
                    </span>
                    {task.assignee_name}
                  </>
                ) : (
                  "Unassigned"
                )}
              </strong>
            </div>

            <div className={styles.metaItem}>
              <span>Dibuat oleh</span>
              <strong>
                <UserRound size={14} />
                {task.creator_name ?? "—"}
              </strong>
            </div>

            <div className={styles.metaItem}>
              <span>Dibuat</span>
              <strong>
                <CalendarDays size={14} />
                {formatTaskDate(task.created_at)}
              </strong>
            </div>

            <div className={styles.metaItem}>
              <span>Diperbarui</span>
              <strong>
                <CalendarDays size={14} />
                {formatTaskDateTime(task.updated_at)}
              </strong>
            </div>
          </section>

          <section className={styles.section}>
            <div className={styles.sectionHeader}>
              <h3>
                <ListChecks size={15} />
                Checklist
                {items.length > 0 && (
                  <span className={styles.checklistCount}>
                    {items.filter((item) => item.is_completed).length}
                    /{items.length}
                  </span>
                )}
              </h3>

              {checklistLoadError && (
                <button
                  type="button"
                  className={styles.retry}
                  onClick={() => void reload()}
                >
                  Muat ulang
                </button>
              )}
            </div>

            {checklistLoading ? (
              <div className={styles.checklistSkeletonList}>
                {Array.from({ length: 3 }).map((_, index) => (
                  <div
                    className={styles.checklistSkeleton}
                    key={index}
                  />
                ))}
              </div>
            ) : items.length === 0 ? (
              <p className={styles.emptyChecklist}>
                Belum ada checklist. Pecah task menjadi langkah kecil
                agar lebih mudah dikerjakan.
              </p>
            ) : (
              <ul className={styles.checklist}>
                {items.map((item) => (
                  <li key={item.id}>
                    <label
                      className={`${styles.checklistItem} ${
                        item.is_completed
                          ? styles.checklistDone
                          : ""
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={item.is_completed}
                        disabled={!canToggleChecklist}
                        onChange={() => void handleToggle(item.id)}
                      />
                      <span className={styles.checkbox}>
                        <CheckCheck size={12} />
                      </span>
                      <span className={styles.checklistLabel}>
                        {item.title}
                      </span>
                    </label>
                  </li>
                ))}
              </ul>
            )}

            {canManage && (
              <form
                className={styles.addChecklist}
                onSubmit={handleAddItem}
              >
                <input
                  type="text"
                  value={newItem}
                  onChange={(event) =>
                    setNewItem(event.target.value)
                  }
                  placeholder="Tambah langkah baru..."
                  maxLength={200}
                  disabled={checklistSaving}
                />
                <button
                  type="submit"
                  disabled={checklistSaving || !newItem.trim()}
                >
                  <Plus size={15} />
                  Tambah
                </button>
              </form>
            )}

            {!canManage && !isMine && (
              <p className={styles.hint}>
                Hanya assignee yang dapat mencentang checklist.
              </p>
            )}

            {checklistError && (
              <p className={styles.error} role="alert">
                {checklistError}
              </p>
            )}
          </section>
        </div>

        <footer className={styles.footer}>
          {task.assigned_to === null && task.status !== "DONE" ? (
            <button
              type="button"
              className={styles.claimButton}
              disabled={saving}
              onClick={() => onClaim(task.id)}
            >
              <UserPlus size={15} />
              Ambil task ini
            </button>
          ) : isMine && task.status !== "DONE" ? (
            <button
              type="button"
              className={styles.unclaimButton}
              disabled={saving}
              onClick={() => onUnclaim(task.id)}
            >
              <UserRoundMinus size={15} />
              Lepas task
            </button>
          ) : (
            <span className={styles.footerNote}>
              {task.status === "DONE"
                ? "Task ini sudah selesai."
                : "Task ini dikerjakan oleh anggota lain."}
            </span>
          )}
        </footer>
      </aside>
    </div>
  );
}
