import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import {
  AlertTriangle,
  LoaderCircle,
  Trash2,
  X,
} from "lucide-react";

import styles from "./ConfirmDeleteModal.module.css";

interface ConfirmDeleteModalProps {
  open: boolean;
  title: string;
  description: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}

export default function ConfirmDeleteModal({
  open,
  title,
  description,
  confirmLabel = "Hapus",
  cancelLabel = "Batal",
  onClose,
  onConfirm,
}: ConfirmDeleteModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) {
      setLoading(false);
      setError("");
    }
  }, [open]);

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
          : "Tindakan gagal. Silakan coba lagi.",
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
        aria-labelledby="confirm-delete-title"
        aria-describedby="confirm-delete-description"
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
          <h2 id="confirm-delete-title">{title}</h2>
          <p id="confirm-delete-description">{description}</p>

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
            {cancelLabel}
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
                Memproses...
              </>
            ) : (
              <>
                <Trash2 size={16} />
                {confirmLabel}
              </>
            )}
          </button>
        </footer>
      </section>
    </div>
  );
}
