import { LayoutGrid, Search } from "lucide-react";
import styles from "./WorkspaceToolbar.module.css";

interface WorkspaceToolbarProps {
  search: string;
  onSearchChange: (value: string) => void;
  total: number;
}

export default function WorkspaceToolbar({
  search,
  onSearchChange,
  total,
}: WorkspaceToolbarProps) {
  return (
    <div className={styles.toolbar}>
      <div className={styles.search}>
        <Search size={18} />

        <input
          type="search"
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Cari workspace..."
          aria-label="Cari workspace"
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
        <LayoutGrid size={17} />
        <span>{total} workspace</span>
      </div>
    </div>
  );
}