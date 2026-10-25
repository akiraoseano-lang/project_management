import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import {
  FolderKanban,
  Info,
  Layers3,
  ListTodo,
  UserRound,
  X,
} from "lucide-react";

import type {
  TaskAssignee,
  TaskFormData,
  TaskProjectOption,
} from "../../../types/task";

import styles from "./TaskModal.module.css";

interface TaskModalProps {
  open: boolean;
  loading?: boolean;
  mode?: "create" | "edit";
  initialData?: TaskFormData;
  projectName?: string;
  projects: TaskProjectOption[];
  assignees: TaskAssignee[];
  assigneesLoading?: boolean;
  lockedAssigneeName?: string | null;
  onProjectChange: (projectId: number | null) => void;
  onClose: () => void;
  onSubmit: (data: TaskFormData) => Promise<void> | void;
}

const ROLE_LABELS: Record<string, string> = {
  OWNER: "Owner",
  ADMIN: "Admin",
  COLLABORATOR: "Collaborator",
};

export default function TaskModal({
  open,
  loading = false,
  mode = "create",
  initialData,
  projectName,
  projects,
  assignees,
  assigneesLoading = false,
  lockedAssigneeName,
  onProjectChange,
  onClose,
  onSubmit,
}: TaskModalProps) {
  const [projectId, setProjectId] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [assignedTo, setAssignedTo] = useState("");
  const [error, setError] = useState("");

  const isEditing = mode === "edit";

  useEffect(() => {
    if (!open) return;

    setProjectId(
      initialData?.projectId ? String(initialData.projectId) : "",
    );
    setTitle(initialData?.title ?? "");
    setDescription(initialData?.description ?? "");
    setAssignedTo(
      initialData?.assignedTo != null
        ? String(initialData.assignedTo)
        : "",
    );
    setError("");
  }, [
    open,
    initialData?.projectId,
    initialData?.title,
    initialData?.description,
    initialData?.assignedTo,
  ]);

  useEffect(() => {
    if (!open || isEditing || projectId) return;
    if (projects.length === 0) return;

    const firstProject = projects[0];

    setProjectId(String(firstProject.id));
    onProjectChange(firstProject.id);
  }, [open, isEditing, projectId, projects, onProjectChange]);

  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !loading) {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, loading, onClose]);

  if (!open) return null;

  const selectedProject = projects.find(
    (project) => String(project.id) === projectId,
  );

  const availableAssignees = assignees;

  const handleProjectSelect = (value: string) => {
    setProjectId(value);
    setAssignedTo("");
    onProjectChange(value ? Number(value) : null);
  };

  const handleSubmit = async (
    event: FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    const trimmedTitle = title.trim();

    if (!trimmedTitle) {
      setError("Judul task wajib diisi.");
      return;
    }

    if (!isEditing && !projectId) {
      setError("Pilih project untuk task ini.");
      return;
    }

    setError("");

    try {
      await onSubmit({
        projectId: projectId ? Number(projectId) : null,
        title: trimmedTitle,
        description: description.trim(),
        assignedTo: assignedTo ? Number(assignedTo) : null,
      });
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : isEditing
            ? "Task gagal diperbarui. Silakan coba lagi."
            : "Task gagal dibuat. Silakan coba lagi.",
      );
    }
  };

  return (
    <div
      className={styles.overlay}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !loading) {
          onClose();
        }
      }}
    >
      <section
        className={styles.modal}
        role="dialog"
        aria-modal="true"
        aria-labelledby="task-modal-title"
      >
        <header className={styles.header}>
          <div className={styles.headerIcon}>
            <ListTodo size={22} />
          </div>

          <div className={styles.headerText}>
            <h2 id="task-modal-title">
              {isEditing ? "Edit task" : "Buat task"}
            </h2>

            <p>
              {isEditing
                ? "Perbarui judul dan deskripsi task."
                : "Tambahkan task baru ke project yang kamu kelola."}
            </p>
          </div>

          <button
            type="button"
            className={styles.close}
            onClick={onClose}
            disabled={loading}
            aria-label="Tutup modal"
          >
            <X size={20} />
          </button>
        </header>

        <form onSubmit={handleSubmit}>
          <div className={styles.body}>
            <label className={styles.label} htmlFor="task-project">
              Project <span>*</span>
            </label>

            {isEditing ? (
              <div className={styles.lockedField}>
                <FolderKanban size={16} />
                <span>
                  {projectName ??
                    selectedProject?.name ??
                    "Project task"}
                </span>
                <span className={styles.lockBadge}>Tetap</span>
              </div>
            ) : (
              <div className={styles.selectWrapper}>
                <FolderKanban size={16} />
                <select
                  id="task-project"
                  className={styles.select}
                  value={projectId}
                  onChange={(event) =>
                    handleProjectSelect(event.target.value)
                  }
                  disabled={loading || projects.length === 0}
                  required
                >
                  {projects.length === 0 ? (
                    <option value="">
                      Tidak ada project yang bisa dikelola
                    </option>
                  ) : (
                    projects.map((project) => (
                      <option key={project.id} value={project.id}>
                        {project.name} · {project.workspaceName}
                      </option>
                    ))
                  )}
                </select>
              </div>
            )}

            {!isEditing && projects.length === 0 && (
              <div className={styles.hint}>
                <Info size={15} />
                <p>
                  Kamu perlu menjadi owner atau admin workspace dan
                  anggota project untuk membuat task.
                </p>
              </div>
            )}

            {selectedProject && (
              <p className={styles.projectMeta}>
                <Layers3 size={13} />
                {selectedProject.workspaceName}
                <span className={styles.dot}>·</span>
                {ROLE_LABELS[selectedProject.workspaceRole] ??
                  selectedProject.workspaceRole}
              </p>
            )}

            <label className={styles.label} htmlFor="task-title">
              Judul task <span>*</span>
            </label>

            <input
              id="task-title"
              className={styles.input}
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Contoh: Implementasikan halaman login"
              maxLength={200}
              autoFocus
              required
              disabled={loading}
            />

            <label
              className={styles.label}
              htmlFor="task-description"
            >
              Deskripsi{" "}
              <span className={styles.optional}>(opsional)</span>
            </label>

            <textarea
              id="task-description"
              className={styles.textarea}
              value={description}
              onChange={(event) =>
                setDescription(event.target.value)
              }
              placeholder="Jelaskan detail pekerjaan, kriteria selesai, dan catatan penting..."
              rows={4}
              disabled={loading}
            />

            <label
              className={styles.label}
              htmlFor="task-assignee"
            >
              Assignee{" "}
              <span className={styles.optional}>(opsional)</span>
            </label>

            {isEditing ? (
              <div className={styles.lockedField}>
                <UserRound size={16} />
                <span>{lockedAssigneeName ?? "Unassigned"}</span>
                <span className={styles.lockBadge}>Tetap</span>
              </div>
            ) : (
              <div className={styles.selectWrapper}>
                <UserRound size={16} />
                <select
                  id="task-assignee"
                  className={styles.select}
                  value={assignedTo}
                  onChange={(event) =>
                    setAssignedTo(event.target.value)
                  }
                  disabled={
                    loading || !projectId || assigneesLoading
                  }
                >
                  <option value="">
                    {assigneesLoading
                      ? "Memuat anggota project..."
                      : "Biarkan unassigned"}
                  </option>
                  {availableAssignees.map((assignee) => (
                    <option
                      key={assignee.userId}
                      value={assignee.userId}
                    >
                      {assignee.name} ·{" "}
                      {ROLE_LABELS[assignee.role ?? ""] ??
                        "Member"}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {!isEditing && !assigneesLoading && projectId && (
              <p className={styles.fieldHint}>
                {availableAssignees.length === 0
                  ? "Belum ada anggota project lain yang bisa di-assign."
                  : "Task yang langsung di-assign akan berstatus In Progress."}
              </p>
            )}

            {error && (
              <p className={styles.error} role="alert">
                {error}
              </p>
            )}
          </div>

          <footer className={styles.footer}>
            <button
              type="button"
              className={styles.cancel}
              onClick={onClose}
              disabled={loading}
            >
              Batal
            </button>

            <button
              type="submit"
              className={styles.submit}
              disabled={
                loading ||
                !title.trim() ||
                (!isEditing && projects.length === 0)
              }
            >
              {loading
                ? isEditing
                  ? "Menyimpan..."
                  : "Membuat..."
                : isEditing
                  ? "Simpan perubahan"
                  : "Buat task"}
            </button>
          </footer>
        </form>
      </section>
    </div>
  );
}
