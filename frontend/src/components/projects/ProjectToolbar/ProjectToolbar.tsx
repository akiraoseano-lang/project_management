import {
  Activity,
  ChevronDown,
  Layers3,
  LayoutGrid,
  Search,
} from "lucide-react";

import type {
  ProjectHealth,
  ProjectWorkspaceOption,
} from "../../../types/project";

import styles from "./ProjectToolbar.module.css";

interface ProjectToolbarProps {
  search: string;
  onSearchChange: (value: string) => void;
  workspaceFilter: number | "ALL";
  onWorkspaceChange: (value: number | "ALL") => void;
  healthFilter: ProjectHealth;
  onHealthChange: (value: ProjectHealth) => void;
  workspaces: ProjectWorkspaceOption[];
  total: number;
}

const HEALTH_OPTIONS: {
  value: ProjectHealth;
  label: string;
}[] = [
  { value: "ALL", label: "Semua status" },
  { value: "ON_TRACK", label: "On Track" },
  { value: "AT_RISK", label: "At Risk" },
  { value: "COMPLETED", label: "Completed" },
  { value: "NO_TASKS", label: "Belum ada task" },
];

export default function ProjectToolbar({
  search,
  onSearchChange,
  workspaceFilter,
  onWorkspaceChange,
  healthFilter,
  onHealthChange,
  workspaces,
  total,
}: ProjectToolbarProps) {
  return (
    <div className={styles.toolbar}>
      <div className={styles.search}>
        <Search size={18} />

        <input
          type="search"
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Cari project..."
          aria-label="Cari project"
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

      <div className={styles.filters}>
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
          <Activity size={15} />
          <select
            className={styles.select}
            value={healthFilter}
            onChange={(event) =>
              onHealthChange(event.target.value as ProjectHealth)
            }
            aria-label="Filter berdasarkan status project"
          >
            {HEALTH_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <ChevronDown size={14} className={styles.chevron} />
        </label>

        <div className={styles.result}>
          <LayoutGrid size={16} />
          <span>{total} project</span>
        </div>
      </div>
    </div>
  );
}
