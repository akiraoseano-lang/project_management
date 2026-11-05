import {
  ArrowRight,
  ArrowUpRight,
  CheckCircle2,
  CircleDashed,
  Clock3,
  FolderKanban,
  Layers3,
  ListTodo,
  Plus,
  RefreshCw,
  Sparkles,
  Users,
  XCircle,
} from "lucide-react";

import { useNavigate } from "react-router-dom";

import ActivityTimeline from "../../components/activity/ActivityTimeline";

import { useAuth } from "../../contexts/AuthContext";
import { useDashboard } from "../../hooks/useDashboard";

import {
  formatProjectDate,
  getProjectHealth,
  getProjectHealthLabel,
} from "../../utils/project";

import type { ProjectHealthState } from "../../utils/project";
import type { TaskSummary } from "../../types/task";

import styles from "./Dashboard.module.css";

const PROJECT_COLORS = ["indigo", "blue", "green", "orange"] as const;

const TASK_STATUS_LABELS: Record<TaskSummary["status"], string> = {
  TODO: "To Do",
  IN_PROGRESS: "In Progress",
  DONE: "Done",
};

function getProjectStatusClass(health: ProjectHealthState) {
  switch (health) {
    case "COMPLETED":
      return styles.statusCompleted;
    case "ON_TRACK":
      return styles.statusOnTrack;
    case "AT_RISK":
      return styles.statusAtRisk;
    default:
      return styles.statusNoTasks;
  }
}

function getTaskStatusClass(status: TaskSummary["status"]) {
  switch (status) {
    case "IN_PROGRESS":
      return styles.taskInProgress;
    case "DONE":
      return styles.taskDone;
    default:
      return styles.taskTodo;
  }
}

function formatRelativeTime(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "-";

  const diff = Date.now() - date.getTime();
  const minutes = Math.floor(diff / 60_000);

  if (minutes < 1) return "Baru saja";
  if (minutes < 60) return `${minutes} menit lalu`;

  const hours = Math.floor(minutes / 60);

  if (hours < 24) return `${hours} jam lalu`;

  const days = Math.floor(hours / 24);

  if (days < 7) return `${days} hari lalu`;

  return formatProjectDate(value);
}

const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const {
    catalog,
    overviewProjects,
    myTasks,
    myTaskTotal,
    completedTaskTotal,
    pendingMyTasks,
    totalProjectTasks,
    recentActivities,
    activitiesLoading,
    activitiesError,
    loading,
    error,
    reload,
  } = useDashboard();

  const displayName =
    user?.name?.trim().split(/\s+/)[0] || "there";

  const statistics = [
    {
      label: "Total Workspace",
      value: String(catalog.workspaces.length),
      change: `${catalog.projects.length} project aktif`,
      trend: "neutral",
      icon: Layers3,
      color: "indigo",
    },
    {
      label: "Project Aktif",
      value: String(catalog.projects.length),
      change: `${totalProjectTasks} task di project`,
      trend: "up",
      icon: FolderKanban,
      color: "blue",
    },
    {
      label: "Task Saya",
      value: String(myTaskTotal),
      change: `${pendingMyTasks} belum selesai`,
      trend: "neutral",
      icon: ListTodo,
      color: "orange",
    },
    {
      label: "Task Selesai",
      value: String(completedTaskTotal),
      change: "Task kamu yang sudah selesai",
      trend: "up",
      icon: CheckCircle2,
      color: "green",
    },
  ] as const;

  return (
    <div className={styles.dashboard}>
      <section className={styles.welcome}>
        <div>
          <div className={styles.welcomeLabel}>
            <Sparkles size={15} />
            RINGKASAN WORKSPACE KAMU
          </div>

          <h1>
            Halo, {displayName}
            <span className={styles.wave}> 👋</span>
          </h1>

          <p>
            Berikut aktivitas project dan task kamu hari ini.
          </p>
        </div>

        <div className={styles.welcomeActions}>
          <button
            type="button"
            className={styles.refreshButton}
            onClick={() => void reload()}
            disabled={loading}
          >
            <RefreshCw size={16} />
            Refresh
          </button>

          <button
            type="button"
            className={styles.createButton}
            onClick={() => navigate("/projects")}
          >
            <Plus size={18} />
            Buat Project
          </button>
        </div>
      </section>

      {loading && (
        <div className={styles.statusNotice}>
          <CircleDashed size={15} />
          Memuat data dashboard...
        </div>
      )}

      {error && (
        <div className={styles.errorNotice} role="alert">
          <XCircle size={15} />
          <span>{error}</span>
          <button type="button" onClick={() => void reload()}>
            Coba lagi
          </button>
        </div>
      )}

      <section className={styles.statsGrid} aria-label="Statistics">
        {statistics.map((stat) => {
          const Icon = stat.icon;

          return (
            <article className={styles.statCard} key={stat.label}>
              <div className={styles.statTop}>
                <div
                  className={`${styles.statIcon} ${styles[stat.color]}`}
                >
                  <Icon size={21} strokeWidth={1.9} />
                </div>
              </div>

              <p className={styles.statLabel}>{stat.label}</p>

              <div className={styles.statBottom}>
                <strong className={styles.statValue}>
                  {stat.value}
                </strong>

                <span
                  className={`${styles.statChange} ${
                    stat.trend === "up" ? styles.changePositive : ""
                  }`}
                >
                  {stat.trend === "up" ? (
                    <ArrowUpRight size={14} />
                  ) : (
                    <Clock3 size={13} />
                  )}
                  {stat.change}
                </span>
              </div>
            </article>
          );
        })}
      </section>

      <section className={styles.mainGrid}>
        <div className={styles.panel}>
          <div className={styles.panelHeader}>
            <div>
              <h2>Ringkasan Project</h2>
              <p>Pantau progress seluruh project kamu.</p>
            </div>

            <button
              type="button"
              className={styles.textButton}
              onClick={() => navigate("/projects")}
            >
              Lihat semua
              <ArrowRight size={16} />
            </button>
          </div>

          {overviewProjects.length === 0 ? (
            <div className={styles.emptyPanel}>
              <FolderKanban size={24} />
              <h3>Belum ada project</h3>
              <p>
                Project yang kamu ikuti akan muncul di sini.
              </p>
            </div>
          ) : (
            <div className={styles.projectList}>
              {overviewProjects.map((project, index) => {
                const health = getProjectHealth(project);
                const color =
                  PROJECT_COLORS[index % PROJECT_COLORS.length];

                return (
                  <article
                    className={styles.projectItem}
                    key={project.id}
                  >
                    <div className={styles.projectTop}>
                      <div
                        className={`${styles.projectIcon} ${styles[color]}`}
                      >
                        <FolderKanban size={19} />
                      </div>

                      <div className={styles.projectDetails}>
                        <h3>{project.name}</h3>
                        <p>
                          {project.description?.trim() ||
                            "Tanpa deskripsi"}
                        </p>
                      </div>

                      <span
                        className={`${styles.projectStatus} ${getProjectStatusClass(
                          health,
                        )}`}
                      >
                        {getProjectHealthLabel(health)}
                      </span>
                    </div>

                    <div className={styles.progressInfo}>
                      <span>Progress</span>
                      <strong>{project.progress}%</strong>
                    </div>

                    <div
                      className={styles.progressTrack}
                      role="progressbar"
                      aria-label={`${project.name} progress`}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-valuenow={project.progress}
                    >
                      <div
                        className={`${styles.progressBar} ${
                          styles[`progress${color}`]
                        }`}
                        style={{ width: `${project.progress}%` }}
                      />
                    </div>

                    <div className={styles.projectFooter}>
                      <span>
                        {project.done_tasks} dari{" "}
                        {project.total_tasks} task
                      </span>
                      <span>
                        {project.total_tasks - project.done_tasks}{" "}
                        tersisa
                      </span>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>

        <aside className={styles.panel}>
          <div className={styles.panelHeader}>
            <div>
              <h2>Aktivitas Terbaru</h2>
              <p>Jejak aktivitas terbaru di workspace utama kamu.</p>
            </div>
          </div>

          <ActivityTimeline
            activities={recentActivities}
            loading={activitiesLoading}
            error={activitiesError}
            onRetry={() => void reload()}
            compact
            showWorkspace
            emptyTitle="Belum ada aktivitas"
            emptyDescription="Aktivitas terbaru akan muncul di sini."
          />

          <button
            type="button"
            className={styles.activityButton}
            onClick={() => navigate("/activity")}
          >
            Lihat semua aktivitas
            <ArrowRight size={16} />
          </button>
        </aside>
      </section>

      <section className={styles.panel}>
        <div className={styles.panelHeader}>
          <div>
            <h2>Task Saya</h2>
            <p>Pantau hal yang perlu kamu kerjakan.</p>
          </div>

          <button
            type="button"
            className={styles.textButton}
            onClick={() => navigate("/my-tasks")}
          >
            Lihat semua task
            <ArrowRight size={16} />
          </button>
        </div>

        <div className={styles.tableWrapper}>
          <table className={styles.taskTable}>
            <thead>
              <tr>
                <th>Nama task</th>
                <th>Project</th>
                <th>Checklist</th>
                <th>Diperbarui</th>
                <th>Status</th>
              </tr>
            </thead>

            <tbody>
              {myTasks.length === 0 ? (
                <tr>
                  <td colSpan={5} className={styles.emptyCell}>
                    Belum ada task yang di-assign ke kamu.
                  </td>
                </tr>
              ) : (
                myTasks.map((task) => (
                  <tr key={task.id}>
                    <td>
                      <div className={styles.taskName}>
                        <span
                          className={`${styles.taskCheck} ${
                            task.status === "DONE"
                              ? styles.taskCheckDone
                              : ""
                          }`}
                        >
                          {task.status === "DONE" && (
                            <CheckCircle2 size={16} />
                          )}
                        </span>
                        <span>{task.title}</span>
                      </div>
                    </td>

                    <td className={styles.projectCell}>
                      {task.project_name}
                    </td>

                    <td>
                      {task.checklist_total > 0
                        ? `${task.checklist_done}/${task.checklist_total}`
                        : "-"}
                    </td>

                    <td className={styles.dueDate}>
                      {formatRelativeTime(task.updated_at)}
                    </td>

                    <td>
                      <span
                        className={`${styles.taskStatus} ${getTaskStatusClass(
                          task.status,
                        )}`}
                      >
                        {TASK_STATUS_LABELS[task.status] ?? task.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <footer className={styles.dashboardFooter}>
        <span>NEXUS Project Management</span>
        <span>Dibuat untuk kolaborasi tim.</span>
        <span className={styles.footerTeam}>
          <Users size={14} />
          Ruang kerja tim
        </span>
      </footer>
    </div>
  );
};

export default Dashboard;
