import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import {
  FolderPlus,
  Info,
  Layers3,
  ShieldCheck,
  X,
} from "lucide-react";

import type {
  ProjectFormData,
  ProjectWorkspaceOption,
} from "../../../types/project";

import styles from "./ProjectModal.module.css";

interface ProjectModalProps {
  open: boolean;
  loading?: boolean;
  mode?: "create" | "edit";
  initialData?: ProjectFormData;
  workspaceName?: string;
  workspaces: ProjectWorkspaceOption[];
  onClose: () => void;
  onSubmit: (data: ProjectFormData) => Promise<void> | void;
}

const ROLE_LABELS: Record<string, string> = {
  OWNER: "Owner",
  ADMIN: "Admin",
  COLLABORATOR: "Collaborator",
};

export default function ProjectModal({
  open,
  loading = false,
  mode = "create",
  initialData,
  workspaceName,
  workspaces,
  onClose,
  onSubmit,
}: ProjectModalProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [workspaceId, setWorkspaceId] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;

    setName(initialData?.name ?? "");
    setDescription(initialData?.description ?? "");
    setWorkspaceId(
      initialData?.workspaceId
        ? String(initialData.workspaceId)
        : "",
    );
    setError("");
  }, [
    open,
    initialData?.name,
    initialData?.description,
    initialData?.workspaceId,
  ]);

  useEffect(() => {
    if (!open || workspaceId || workspaces.length === 0) return;

    setWorkspaceId(String(workspaces[0].id));
  }, [open, workspaceId, workspaces]);

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

  const isEditing = mode === "edit";
  const selectedWorkspace = workspaces.find(
    (workspace) => String(workspace.id) === workspaceId,
  );

  const handleSubmit = async (
    event: FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    const trimmedName = name.trim();

    if (!trimmedName) {
      setError("Nama project wajib diisi.");
      return;
    }

    if (!isEditing && !workspaceId) {
      setError("Pilih workspace untuk project ini.");
      return;
    }

    setError("");

    try {
      await onSubmit({
        workspaceId: workspaceId ? Number(workspaceId) : null,
        name: trimmedName,
        description: description.trim(),
      });
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : isEditing
            ? "Project gagal diperbarui. Silakan coba lagi."
            : "Project gagal dibuat. Silakan coba lagi.",
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
        aria-labelledby="project-modal-title"
      >
        <header className={styles.header}>
          <div className={styles.headerIcon}>
            <FolderPlus size={22} />
          </div>

          <div className={styles.headerText}>
            <h2 id="project-modal-title">
              {isEditing ? "Edit project" : "Buat project"}
            </h2>

            <p>
              {isEditing
                ? "Perbarui nama dan deskripsi project."
                : "Tambahkan project baru ke workspace yang kamu kelola."}
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
            <label className={styles.label} htmlFor="project-workspace">
              Workspace <span>*</span>
            </label>

            {isEditing ? (
              <div className={styles.lockedWorkspace}>
                <Layers3 size={16} />
                <span>
                  {workspaceName ??
                    selectedWorkspace?.name ??
                    "Workspace project"}
                </span>
                <span className={styles.lockBadge}>Tetap</span>
              </div>
            ) : (
              <div className={styles.selectWrapper}>
                <Layers3 size={16} />
                <select
                  id="project-workspace"
                  className={styles.select}
                  value={workspaceId}
                  onChange={(event) =>
                    setWorkspaceId(event.target.value)
                  }
                  disabled={loading || workspaces.length === 0}
                  required
                >
                  {workspaces.length === 0 ? (
                    <option value="">
                      Tidak ada workspace yang bisa dikelola
                    </option>
                  ) : (
                    workspaces.map((workspace) => (
                      <option
                        key={workspace.id}
                        value={workspace.id}
                      >
                        {workspace.name} ·{" "}
                        {ROLE_LABELS[workspace.role] ??
                          workspace.role}
                      </option>
                    ))
                  )}
                </select>
              </div>
            )}

            {!isEditing && workspaces.length === 0 && (
              <div className={styles.hint}>
                <Info size={15} />
                <p>
                  Kamu perlu menjadi owner atau admin workspace
                  untuk membuat project.
                </p>
              </div>
            )}

            {!isEditing && selectedWorkspace?.role === "ADMIN" && (
              <div className={styles.hint}>
                <ShieldCheck size={15} />
                <p>
                  Project yang dibuat admin akan menunggu
                  persetujuan owner workspace sebelum aktif.
                </p>
              </div>
            )}

            <label className={styles.label} htmlFor="project-name">
              Nama project <span>*</span>
            </label>

            <input
              id="project-name"
              className={styles.input}
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Contoh: Redesign Website Perusahaan"
              maxLength={150}
              autoFocus
              required
              disabled={loading}
            />

            <label
              className={styles.label}
              htmlFor="project-description"
            >
              Deskripsi{" "}
              <span className={styles.optional}>(opsional)</span>
            </label>

            <textarea
              id="project-description"
              className={styles.textarea}
              value={description}
              onChange={(event) =>
                setDescription(event.target.value)
              }
              placeholder="Jelaskan tujuan dan ruang lingkup project ini..."
              rows={4}
              maxLength={500}
              disabled={loading}
            />

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
                !name.trim() ||
                (!isEditing && workspaces.length === 0)
              }
            >
              {loading
                ? isEditing
                  ? "Menyimpan..."
                  : "Membuat..."
                : isEditing
                  ? "Simpan perubahan"
                  : "Buat project"}
            </button>
          </footer>
        </form>
      </section>
    </div>
  );
}
