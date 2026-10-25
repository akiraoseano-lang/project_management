import {
  ChevronDown,
  FolderKanban,
  Layers3,
  ListFilter,
  RotateCcw,
  Search,
} from "lucide-react";

import type {
  TaskProjectOption,
  TaskStatusFilter,
  TaskWorkspaceOption,
} from "../../../types/task";

import styles from "./TaskToolbar.module.css";

interface TaskToolbarProps {
  search: string;
  onSearchChange: (value: string) => void;
  statusFilter: TaskStatusFilter;
  onStatusChange: (value: TaskStatusFilter) => void;
  workspaceFilter: number | "ALL";
  onWorkspaceChange: (value: number | "ALL") => void;
  projectFilter: number | "ALL";
  onProjectChange: (value: number | "ALL") => void;
  workspaces: TaskWorkspaceOption[];
  projects: TaskProjectOption[];
  total: number;
  hasFilters: boolean;
  onReset: () => void;
}

const STATUS_OPTIONS: {
  value: TaskStatusFilter;
  label: string;
}[] = [
  { value: "ALL", label: "Semua status" },
  { value: "TODO", label: "To Do" },
  { value: "IN_PROGRESS", label: "In Progress" },
  { value: "DONE", label: "Done" },
];

export default function TaskToolbar({
  search,
  onSearchChange,
  statusFilter,
  onStatusChange,
  workspaceFilter,
  onWorkspaceChange,
  projectFilter,
  onProjectChange,
  workspaces,
  projects,
  total,
  hasFilters,
  onReset,
}: TaskToolbarProps) {
  return (
    <div className={styles.toolbar}>
      <div className={styles.searchRow}>
        <div className={styles.search}>
          <Search size={18} />

          <input
            type="search"
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Cari task, project, atau deskripsi..."
            aria-label="Cari task"
          />

          {search && (
            <button
              type="button"
              className={styles.clear}
              onClick={() => onSearchChange("")}
              aria-label="Hapus pencarian"
            >
              ×
            </button>
          )}
        </div>

        <div className={styles.result}>
          <ListFilter size={16} />
          <span>{total} task</span>
        </div>
      </div>

      <div className={styles.filters}>
        <label className={styles.selectWrapper}>
          <ListFilter size={15} />
          <select
            className={styles.select}
            value={statusFilter}
            onChange={(event) =>
              onStatusChange(
                event.target.value as TaskStatusFilter,
              )
            }
            aria-label="Filter berdasarkan status task"
          >
            {STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <ChevronDown size={14} className={styles.chevron} />
        </label>

        <label className={styles.selectWrapper}>
          <Layers3 size={15} />
          <select
            className={styles.select}
            value={workspaceFilter}
            onChange={(event) =>
              onWorkspaceChange(
                event.target.value === "ALL"
                  ? "ALL"
                  : Number(event.target.value),
              )
            }
            aria-label="Filter berdasarkan workspace"
          >
            <option value="ALL">Semua workspace</option>
            {workspaces.map((workspace) => (
              <option key={workspace.id} value={workspace.id}>
                {workspace.name}
              </option>
            ))}
          </select>
          <ChevronDown size={14} className={styles.chevron} />
        </label>

        <label className={styles.selectWrapper}>
          <FolderKanban size={15} />
          <select
            className={styles.select}
            value={projectFilter}
            onChange={(event) =>
              onProjectChange(
                event.target.value === "ALL"
                  ? "ALL"
                  : Number(event.target.value),
              )
            }
            aria-label="Filter berdasarkan project"
          >
            <option value="ALL">Semua project</option>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>
          <ChevronDown size={14} className={styles.chevron} />
        </label>

        {hasFilters && (
          <button
            type="button"
            className={styles.reset}
            onClick={onReset}
          >
            <RotateCcw size={14} />
            Reset filter
          </button>
        )}
      </div>
    </div>
  );
}
