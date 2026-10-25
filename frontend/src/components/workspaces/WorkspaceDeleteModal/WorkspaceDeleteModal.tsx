import { useEffect, useState } from "react";
import { AlertTriangle, LoaderCircle, Trash2, X } from "lucide-react";

import styles from "./WorkspaceDeleteModal.module.css";

interface WorkspaceDeleteModalProps {
  workspace: {
    id: string;
    name: string;
  } | null;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}

export default function WorkspaceDeleteModal({
  workspace,
  onClose,
  onConfirm,
}: WorkspaceDeleteModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (workspace) {
      setLoading(false);
      setError("");
    }
  }, [workspace?.id, workspace?.name]);

  useEffect(() => {
    if (!workspace) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !loading) {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [workspace, loading, onClose]);

  if (!workspace) return null;

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
          : "Workspace gagal dihapus. Silakan coba lagi.",
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
        aria-labelledby="delete-workspace-title"
        aria-describedby="delete-workspace-description"
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
          <h2 id="delete-workspace-title">Hapus workspace?</h2>

          <p id="delete-workspace-description">
            Lu yakin ingin menghapus workspace{" "}
            <strong>{workspace.name}</strong>? Tindakan ini mungkin
            memengaruhi data yang terkait dengan workspace tersebut.
            Pastikan lu sudah memeriksa data sebelum melanjutkan.
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
                Hapus workspace
              </>
            )}
          </button>
        </footer>
      </section>
    </div>
  );
}