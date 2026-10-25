import { useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  CalendarDays,
  Clock3,
  FolderKanban,
  Layers3,
  ListTodo,
  MoreHorizontal,
  Pencil,
  Trash2,
  UserRound,
  Users,
} from "lucide-react";

import {
  formatProjectDate,
  getProjectHealth,
  getProjectHealthLabel,
} from "../../../utils/project";

import styles from "./ProjectCard.module.css";

interface ProjectCardProps {
  id: string;
  name: string;
  description?: string | null;
  workspaceName: string;
  ownerName?: string | null;
  totalTasks: number;
  doneTasks: number;
  inProgressTasks: number;
  progress: number;
  memberCount: number;
  createdAt?: string;
  canManage?: boolean;
  onOpen: (id: string) => void;
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
}

function getHealthClass(health: string) {
  switch (health) {
    case "COMPLETED":
      return styles.healthCompleted;
    case "ON_TRACK":
      return styles.healthOnTrack;
    case "AT_RISK":
      return styles.healthAtRisk;
    default:
      return styles.healthIdle;
  }
}

export default function ProjectCard({
  id,
  name,
  description,
  workspaceName,
  ownerName,
  totalTasks,
  doneTasks,
  inProgressTasks,
  progress,
  memberCount,
  createdAt,
  canManage = false,
  onOpen,
  onEdit,
  onDelete,
}: ProjectCardProps) {
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

  const health = getProjectHealth({ total_tasks: totalTasks, progress });
  const healthLabel = getProjectHealthLabel(health);

  return (
    <article
      className={styles.card}
      role="button"
      tabIndex={0}
      onClick={() => onOpen(id)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onOpen(id);
        }
      }}
    >
      <div className={styles.top}>
        <div className={styles.icon}>
          <FolderKanban size={22} />
        </div>

        <div className={styles.topActions}>
          <span className={styles.workspaceChip}>
            <Layers3 size={12} />
            {workspaceName}
          </span>

          {canManage && (
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
                <MoreHorizontal size={19} />
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
                      <Pencil size={15} />
                      Edit project
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
                      <Trash2 size={15} />
                      Hapus project
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className={styles.titleRow}>
        <h3>{name}</h3>
        <span
          className={`${styles.health} ${getHealthClass(health)}`}
        >
          {healthLabel}
        </span>
      </div>

      <p className={styles.description}>
        {description?.trim() || "Belum ada deskripsi project."}
      </p>

      <div className={styles.progressHeader}>
        <span>Progress</span>
        <strong>{progress}%</strong>
      </div>

      <div
        className={styles.progressTrack}
        role="progressbar"
        aria-label={`${name} progress`}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={progress}
      >
        <div
          className={styles.progressBar}
          style={{ width: `${Math.min(progress, 100)}%` }}
        />
      </div>

      <div className={styles.metaGrid}>
        <span>
          <ListTodo size={14} />
          {doneTasks}/{totalTasks} task
        </span>

        <span>
          <Clock3 size={14} />
          {inProgressTasks} in progress
        </span>

        <span>
          <Users size={14} />
          {memberCount} member
        </span>
      </div>

      <div className={styles.footer}>
        <div className={styles.footerMeta}>
          <span>
            <UserRound size={13} />
            {ownerName ?? "Project owner"}
          </span>

          <span>
            <CalendarDays size={13} />
            {formatProjectDate(createdAt)}
          </span>
        </div>

        <span className={styles.openLink}>
          Buka
          <ArrowRight size={14} />
        </span>
      </div>
    </article>
  );
}
