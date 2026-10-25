import { useEffect, useState } from "react";
import {
  AlertTriangle,
  LoaderCircle,
  Trash2,
  X,
} from "lucide-react";

import styles from "./ProjectDeleteModal.module.css";

interface ProjectDeleteModalProps {
  project: {
    id: string;
    name: string;
  } | null;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}

export default function ProjectDeleteModal({
  project,
  onClose,
  onConfirm,
}: ProjectDeleteModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (project) {
      setLoading(false);
      setError("");
    }
  }, [project?.id, project?.name]);

  useEffect(() => {
    if (!project) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !loading) {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [project, loading, onClose]);

  if (!project) return null;

  const handleConfirm = async () => {
    if (loading) return;

    setLoading(true);
    setError("");

    try {
      await onConfirm();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Project gagal dihapus. Silakan coba lagi.",
      );
    } finally {
      setLoading(false);
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
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="delete-project-title"
        aria-describedby="delete-project-description"
      >
        <header className={styles.header}>
          <div className={styles.warningIcon}>
            <AlertTriangle size={23} />
          </div>

          <button
            type="button"
            className={styles.close}
            onClick={onClose}
            disabled={loading}
            aria-label="Tutup dialog"
          >
            <X size={19} />
          </button>
        </header>

        <div className={styles.body}>
          <h2 id="delete-project-title">Hapus project?</h2>

          <p id="delete-project-description">
            Kamu yakin ingin menghapus project{" "}
            <strong>{project.name}</strong>? Seluruh task dan data
            project ini akan ikut terhapus dan tidak bisa
            dikembalikan.
          </p>

          {error && (
            <div className={styles.error} role="alert">
              {error}
            </div>
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
            type="button"
            className={styles.confirm}
            onClick={() => void handleConfirm()}
            disabled={loading}
          >
            {loading ? (
              <>
                <LoaderCircle size={16} className={styles.spinner} />
                Menghapus...
              </>
            ) : (
              <>
                <Trash2 size={16} />
                Hapus project
              </>
            )}
          </button>
        </footer>
      </section>
    </div>
  );
}
