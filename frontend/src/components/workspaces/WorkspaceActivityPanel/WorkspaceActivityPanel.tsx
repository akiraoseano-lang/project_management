import { ArrowRight, RefreshCw } from "lucide-react";
import { useNavigate } from "react-router-dom";

import ActivityTimeline from "../../activity/ActivityTimeline";

import { useActivityLog } from "../../../hooks/useActivityLog";

import styles from "./WorkspaceActivityPanel.module.css";

interface WorkspaceActivityPanelProps {
  workspaceId: number;
  workspaceName?: string;
}

export default function WorkspaceActivityPanel({
  workspaceId,
  workspaceName,
}: WorkspaceActivityPanelProps) {
  const navigate = useNavigate();

  const {
    activities,
    totalItems,
    loading,
    error,
    source,
    reload,
  } = useActivityLog(workspaceId, {
    pageSize: 6,
    fetchLimit: 10,
  });

  return (
    <section className={styles.panel}>
      <div className={styles.panelHeader}>
        <div>
          <h2>Activity Log</h2>
          <p>
            Jejak aktivitas terbaru
            {workspaceName ? ` di ${workspaceName}` : " di workspace ini"}.
          </p>
        </div>

        <div className={styles.headerActions}>
          <span className={styles.panelCount}>
            {totalItems} aktivitas
          </span>

          <button
            type="button"
            className={styles.refreshButton}
            onClick={() => void reload()}
            disabled={loading}
            aria-label="Muat ulang activity log"
          >
            <RefreshCw size={14} />
          </button>
        </div>
      </div>

      {source === "derived" && !loading && (
        <p className={styles.notice}>
          Menampilkan ringkasan aktivitas terkini. Endpoint baca log
          activity belum tersedia di backend.
        </p>
      )}

      <ActivityTimeline
        activities={activities}
        loading={loading}
        error={error}
        onRetry={() => void reload()}
        compact
        emptyTitle="Belum ada aktivitas"
        emptyDescription="Aktivitas terbaru workspace ini akan muncul di sini."
      />

      <button
        type="button"
        className={styles.viewAllButton}
        onClick={() =>
          navigate(`/activity?workspace=${workspaceId}`)
        }
      >
        Lihat semua aktivitas
        <ArrowRight size={15} />
      </button>
    </section>
  );
}
