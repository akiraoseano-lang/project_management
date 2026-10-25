import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { X } from "lucide-react";

import styles from "./WorkspaceModal.module.css";

interface WorkspaceFormData {
  name: string;
  description: string;
}

interface WorkspaceModalProps {
  open: boolean;
  loading?: boolean;
  mode?: "create" | "edit";
  initialData?: WorkspaceFormData;
  onClose: () => void;
  onSubmit: (data: WorkspaceFormData) => Promise<void> | void;
}

export default function WorkspaceModal({
  open,
  loading = false,
  mode = "create",
  initialData,
  onClose,
  onSubmit,
}: WorkspaceModalProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;

    setName(initialData?.name ?? "");
    setDescription(initialData?.description ?? "");
    setError("");
  }, [open, initialData?.name, initialData?.description]);

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

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const trimmedName = name.trim();

    if (!trimmedName) {
      setError("Nama workspace wajib diisi.");
      return;
    }

    setError("");

    try {
      await onSubmit({
        name: trimmedName,
        description: description.trim(),
      });
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : isEditing
            ? "Workspace gagal diperbarui. Silakan coba lagi."
            : "Workspace gagal dibuat. Silakan coba lagi.",
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
        aria-labelledby="workspace-modal-title"
      >
        <header className={styles.header}>
          <div>
            <h2 id="workspace-modal-title">
              {isEditing ? "Edit workspace" : "Buat workspace"}
            </h2>

            <p>
              {isEditing
                ? "Perbarui nama dan deskripsi workspace."
                : "Siapkan ruang kerja baru untuk mengelola proyekmu."}
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
            <label className={styles.label} htmlFor="workspace-name">
              Nama workspace <span>*</span>
            </label>

            <input
              id="workspace-name"
              className={styles.input}
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Contoh: Tim Pengembangan Produk"
              maxLength={100}
              autoFocus
              required
              disabled={loading}
            />

            <label
              className={styles.label}
              htmlFor="workspace-description"
            >
              Deskripsi{" "}
              <span className={styles.optional}>(opsional)</span>
            </label>

            <textarea
              id="workspace-description"
              className={styles.textarea}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Jelaskan tujuan workspace ini..."
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
              disabled={loading || !name.trim()}
            >
              {loading
                ? isEditing
                  ? "Menyimpan..."
                  : "Membuat..."
                : isEditing
                  ? "Simpan perubahan"
                  : "Buat workspace"}
            </button>
          </footer>
        </form>
      </section>
    </div>
  );
}