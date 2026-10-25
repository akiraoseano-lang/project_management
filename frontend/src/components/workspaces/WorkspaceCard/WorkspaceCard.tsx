
import { useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  FolderKanban,
  MoreHorizontal,
  Pencil,
  Trash2,
} from "lucide-react";
import styles from "./WorkspaceCard.module.css";

interface WorkspaceCardProps {
  id: string;
  name: string;
  description?: string | null;
  createdAt?: string;
  onOpen: (id: string) => void;
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
}

export default function WorkspaceCard({
  id,
  name,
  description,
  createdAt,
  onOpen,
  onEdit,
  onDelete,
}: WorkspaceCardProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleOutsideClick(event: MouseEvent) {
      if (
        menuRef.current &&
        !menuRef.current.contains(event.target as Node)
      ) {
        setMenuOpen(false);
      }
    }

    document.addEventListener("mousedown", handleOutsideClick);
    return () =>
      document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  return (
    <article className={styles.card} onClick={() => onOpen(id)}>
      <div className={styles.top}>
        <div className={styles.icon}>
          <FolderKanban size={22} />
        </div>

        <div
          className={styles.menu}
          ref={menuRef}
          onClick={(event) => event.stopPropagation()}
          onKeyDown={(event) => event.stopPropagation()}
        >
          <button
            type="button"
            className={styles.menuButton}
            aria-label={`Opsi ${name}`}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((open) => !open)}
          >
            <MoreHorizontal size={20} />
          </button>

          {menuOpen && (
            <div className={styles.dropdown}>
              {onEdit && (
                <button
                  type="button"
                  className={styles.dropdownItem}
                  onClick={() => {
                    setMenuOpen(false);
                    onEdit(id);
                  }}
                >
                  <Pencil size={16} />
                  Edit workspace
                </button>
              )}

              {onDelete && (
                <button
                  type="button"
                  className={`${styles.dropdownItem} ${styles.deleteItem}`}
                  onClick={() => {
                    setMenuOpen(false);
                    onDelete(id);
                  }}
                >
                  <Trash2 size={16} />
                  Hapus workspace
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      <button
        type="button"
        className={styles.titleButton}
        onClick={(event) => {
          event.stopPropagation();
          onOpen(id);
        }}
      >
        <h3 className={styles.title}>{name}</h3>
      </button>

      <p className={styles.description}>
        {description?.trim() || "Belum ada deskripsi workspace."}
      </p>

      <div className={styles.footer}>
        <div className={styles.meta}>
          <ArrowRight size={15} />
          <span>Buka analytics</span>
        </div>

        {createdAt && (
          <span className={styles.date}>
            {new Date(createdAt).toLocaleDateString("id-ID", {
              day: "numeric",
              month: "short",
              year: "numeric",
            })}
          </span>
        )}
      </div>
    </article>
  );
}
