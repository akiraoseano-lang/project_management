import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Activity,
  ChevronDown,
  CircleAlert,
  Layers3,
  RefreshCw,
  Search,
  X,
} from "lucide-react";

import ActivityTimeline from "../../components/activity/ActivityTimeline";
import Pagination from "../../components/common/Pagination";

import { useActivityLog } from "../../hooks/useActivityLog";
import { useWorkspaceOptions } from "../../hooks/useWorkspaceOptions";

import type { ActivityGroupFilter } from "../../types/activity";

import styles from "./ActivityLog.module.css";

const PAGE_SIZE = 10;
const FETCH_LIMIT = 100;
const SEARCH_DELAY = 300;

const GROUP_FILTERS: {
  value: ActivityGroupFilter;
  label: string;
}[] = [
  { value: "ALL", label: "Semua" },
  { value: "WORKSPACE", label: "Workspace" },
  { value: "PROJECT", label: "Project" },
  { value: "TASK", label: "Task" },
  { value: "MEMBER", label: "Member" },
  { value: "REQUEST", label: "Request" },
];

export default function ActivityLog() {
  const [searchParams, setSearchParams] = useSearchParams();

  const [group, setGroup] = useState<ActivityGroupFilter>("ALL");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");

  const {
    workspaces,
    loading: workspacesLoading,
    error: workspacesError,
    reload: reloadWorkspaces,
  } = useWorkspaceOptions();

  const workspaceParam = Number(searchParams.get("workspace"));

  const selectedWorkspaceId = useMemo(() => {
    if (
      Number.isFinite(workspaceParam) &&
      workspaceParam > 0 &&
      workspaces.some((workspace) => workspace.id === workspaceParam)
    ) {
      return workspaceParam;
    }

    return workspaces[0]?.id ?? null;
  }, [workspaceParam, workspaces]);

  useEffect(() => {
    if (
      selectedWorkspaceId !== null &&
      selectedWorkspaceId !== workspaceParam
    ) {
      setSearchParams(
        { workspace: String(selectedWorkspaceId) },
        { replace: true },
      );
    }
  }, [selectedWorkspaceId, workspaceParam, setSearchParams]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setSearch(searchInput.trim());
    }, SEARCH_DELAY);

    return () => window.clearTimeout(timeoutId);
  }, [searchInput]);

  const {
    activities,
    total,
    totalItems,
    counts,
    page,
    setPage,
    totalPages,
    loading,
    error,
    source,
    reload,
  } = useActivityLog(selectedWorkspaceId, {
    pageSize: PAGE_SIZE,
    fetchLimit: FETCH_LIMIT,
    group,
    search,
  });

  const selectedWorkspace =
    workspaces.find(
      (workspace) => workspace.id === selectedWorkspaceId,
    ) ?? null;

  const handleRefresh = () => {
    void reload();

    if (workspacesError) {
      void reloadWorkspaces();
    }
  };

  return (
    <main className={styles.page}>
      <section className={styles.heading}>
        <div>
          <div className={styles.eyebrow}>
            <Activity size={14} />
            COLLABORATION
          </div>

          <h1>Activity Log</h1>
          <p>
            Pantau seluruh perubahan workspace, project, task, dan
            anggota dalam satu timeline.
          </p>

          <div className={styles.meta}>
            <span>
              <Layers3 size={14} />
              {selectedWorkspace?.name ??
                (workspacesLoading
                  ? "Memuat workspace..."
                  : "Belum ada workspace")}
            </span>

            <span>
              <Activity size={14} />
              {totalItems} aktivitas terbaru
            </span>

            {source === "derived" && (
              <span className={styles.metaHint}>
                Ringkasan aktivitas
              </span>
            )}
          </div>
        </div>

        <button
          type="button"
          className={styles.refreshButton}
          onClick={handleRefresh}
          disabled={loading || workspacesLoading}
        >
          <RefreshCw size={16} />
          Refresh
        </button>
      </section>

      {workspacesError && (
        <div className={styles.errorNotice} role="alert">
          <CircleAlert size={16} />
          <span>{workspacesError}</span>
          <button
            type="button"
            onClick={() => void reloadWorkspaces()}
          >
            Coba lagi
          </button>
        </div>
      )}

      {workspacesLoading && workspaces.length === 0 ? (
        <section className={styles.panel}>
          <div className={styles.skeletonHeader} />
          <div className={styles.skeletonList}>
            {Array.from({ length: 5 }).map((_, index) => (
              <div className={styles.skeletonRow} key={index}>
                <span className={styles.skeletonIcon} />
                <div className={styles.skeletonContent}>
                  <span className={styles.skeletonLineWide} />
                  <span className={styles.skeletonLine} />
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : workspaces.length === 0 ? (
        <section className={styles.panel}>
          <div className={styles.emptyPanel}>
            <div className={styles.emptyIcon}>
              <Layers3 size={24} />
            </div>
            <h3>Belum ada workspace</h3>
            <p>
              Activity log akan tersedia setelah kamu memiliki atau
              bergabung dengan workspace.
            </p>
          </div>
        </section>
      ) : (
        <>
          <section className={styles.controls}>
            <label className={styles.workspaceSelect}>
              <Layers3 size={15} />
              <select
                value={selectedWorkspaceId ?? ""}
                onChange={(event) =>
                  setSearchParams({
                    workspace: event.target.value,
                  })
                }
                aria-label="Pilih workspace"
              >
                {workspaces.map((workspace) => (
                  <option key={workspace.id} value={workspace.id}>
                    {workspace.name}
                  </option>
                ))}
              </select>
              <ChevronDown size={14} />
            </label>

            <label className={styles.searchBox}>
              <Search size={15} />
              <input
                type="search"
                value={searchInput}
                onChange={(event) =>
                  setSearchInput(event.target.value)
                }
                placeholder="Cari aktivitas, orang, atau detail..."
                aria-label="Cari activity log"
              />

              {searchInput && (
                <button
                  type="button"
                  onClick={() => setSearchInput("")}
                  aria-label="Hapus pencarian"
                >
                  <X size={14} />
                </button>
              )}
            </label>
          </section>

          <div className={styles.filterRow}>
            <div
              className={styles.tabs}
              role="tablist"
              aria-label="Filter jenis aktivitas"
            >
              {GROUP_FILTERS.map((filter) => (
                <button
                  key={filter.value}
                  type="button"
                  role="tab"
                  aria-selected={group === filter.value}
                  className={`${styles.tab} ${
                    group === filter.value ? styles.tabActive : ""
                  }`}
                  onClick={() => setGroup(filter.value)}
                >
                  {filter.label}
                  <span>{counts[filter.value]}</span>
                </button>
              ))}
            </div>

            <span className={styles.resultCount}>
              {total} aktivitas
            </span>
          </div>

          {source === "derived" && !loading && (
            <div className={styles.notice} role="status">
              <Activity size={16} />
              <div>
                <strong>
                  Menampilkan ringkasan aktivitas terkini
                </strong>
                <p>
                  Endpoint baca activity log belum tersedia di
                  backend, jadi data dirangkum dari project, task,
                  member, dan request workspace ini.
                </p>
              </div>
            </div>
          )}

          <section className={styles.panel}>
            <div className={styles.panelHeader}>
              <div>
                <h2>Timeline Aktivitas</h2>
                <p>
                  Aktivitas terbaru dari workspace yang dipilih.
                </p>
              </div>

              <span className={styles.panelCount}>
                {loading ? "Memuat..." : `${total} aktivitas`}
              </span>
            </div>

            <ActivityTimeline
              activities={activities}
              loading={loading}
              error={error}
              onRetry={() => void reload()}
              emptyTitle={
                search
                  ? "Aktivitas tidak ditemukan"
                  : "Belum ada aktivitas"
              }
              emptyDescription={
                search
                  ? "Coba gunakan kata kunci atau filter lain."
                  : "Aktivitas workspace akan muncul di sini setelah ada perubahan pada project, task, atau anggota."
              }
            />

            <Pagination
              page={page}
              totalPages={totalPages}
              onPageChange={setPage}
              ariaLabel="Pagination activity log"
            />
          </section>
        </>
      )}
    </main>
  );
}
