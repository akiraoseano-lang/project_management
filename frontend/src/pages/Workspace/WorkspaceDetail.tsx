import { useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  CheckCircle2,
  CircleDashed,
  Clock3,
  FolderKanban,
  ListTodo,
  RefreshCw,
  ShieldCheck,
  TrendingUp,
  Users,
} from "lucide-react";

import WorkspacePagination from "../../components/workspaces/WorkspacePagination";
import { useWorkspaceDashboard } from "../../hooks/useWorkspaceDashboard";

import type {
  TaskStatus,
  TaskStatusFilter,
  WorkspaceProjectSummary,
} from "../../types/workspace";

import styles from "./WorkspaceDetail.module.css";

const STATUS_LABELS: Record<TaskStatus, string> = {
  TODO: "To Do",
  IN_PROGRESS: "In Progress",
  DONE: "Done",
};

const ROLE_LABELS: Record<string, string> = {
  OWNER: "Owner",
  ADMIN: "Admin",
  COLLABORATOR: "Collaborator",
};

const formatDate = (value: string) =>
  new Date(value).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

const getInitials = (name: string) =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("") || "U";

function getTaskStatusClass(status: TaskStatus) {
  switch (status) {
    case "TODO":
      return styles.statusTodo;
    case "IN_PROGRESS":
      return styles.statusProgress;
    default:
      return styles.statusDone;
  }
}

function getProjectBadgeClass(project: WorkspaceProjectSummary) {
  if (project.total_tasks === 0) return styles.projectIdle;
  if (project.progress >= 100) return styles.projectCompleted;
  if (project.progress >= 50) return styles.projectOnTrack;
  return styles.projectAtRisk;
}

function getProjectBadgeLabel(project: WorkspaceProjectSummary) {
  if (project.total_tasks === 0) return "No tasks";
  if (project.progress >= 100) return "Completed";
  if (project.progress >= 50) return "On Track";
  return "At Risk";
}

export default function WorkspaceDetail() {
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const navigate = useNavigate();

  const parsedId = Number(workspaceId);
  const id =
    Number.isFinite(parsedId) && parsedId > 0 ? parsedId : null;

  const {
    analytics,
    tasks,
    loading,
    tasksLoading,
    error,
    tasksError,
    statusFilter,
    setStatusFilter,
    projectFilter,
    setProjectFilter,
    mineOnly,
    toggleMineOnly,
    page,
    setPage,
    totalTasks,
    totalPages,
    reload,
  } = useWorkspaceDashboard(id);

  const stats = analytics?.stats;
  const projects = analytics?.projects ?? [];
  const members = analytics?.members ?? [];
  const role = analytics?.role;

  const statusTabs: {
    value: TaskStatusFilter;
    label: string;
    count: number;
  }[] = [
    {
      value: "ALL",
      label: "All",
      count: stats?.total_tasks ?? 0,
    },
    {
      value: "TODO",
      label: "To Do",
      count: stats?.todo_tasks ?? 0,
    },
    {
      value: "IN_PROGRESS",
      label: "In Progress",
      count: stats?.in_progress_tasks ?? 0,
    },
    {
      value: "DONE",
      label: "Done",
      count: stats?.done_tasks ?? 0,
    },
  ];

  const distribution = useMemo(() => {
    const total = stats?.total_tasks ?? 0;
    const todo = stats?.todo_tasks ?? 0;
    const inProgress = stats?.in_progress_tasks ?? 0;
    const done = stats?.done_tasks ?? 0;

    const todoPercent = total ? (todo / total) * 100 : 0;
    const progressPercent = total ? (inProgress / total) * 100 : 0;

    const gradient = total
      ? `conic-gradient(
          #f59e0b 0% ${todoPercent}%,
          #6366f1 ${todoPercent}% ${todoPercent + progressPercent}%,
          #10b981 ${todoPercent + progressPercent}% 100%
        )`
      : "conic-gradient(#e2e8f0 0% 100%)";

    return {
      total,
      todo,
      inProgress,
      done,
      gradient,
      todoPercent: total ? Math.round(todoPercent) : 0,
      progressPercent: total ? Math.round(progressPercent) : 0,
      donePercent: total ? Math.round((done / total) * 100) : 0,
    };
  }, [stats]);

  const handleProjectFilter = (value: string) => {
    setProjectFilter(value === "ALL" ? "ALL" : Number(value));
  };

  if (loading && !analytics) {
    return (
      <main className={styles.page}>
        <div className={styles.skeletonHeader} />
        <div className={styles.skeletonStats}>
          {Array.from({ length: 4 }).map((_, index) => (
            <div className={styles.skeletonCard} key={index} />
          ))}
        </div>
        <div className={styles.skeletonPanel} />
      </main>
    );
  }

  if (error || !analytics) {
    return (
      <main className={styles.page}>
        <button
          type="button"
          className={styles.backButton}
          onClick={() => navigate("/workspaces")}
        >
          <ArrowLeft size={16} />
          Kembali ke workspaces
        </button>

        <div className={styles.errorState}>
          <div className={styles.errorIcon}>
            <CircleDashed size={26} />
          </div>
          <h1>Workspace tidak dapat dimuat</h1>
          <p>{error ?? "Workspace yang kamu cari tidak tersedia."}</p>

          <button type="button" onClick={() => void reload()}>
            Coba lagi
          </button>
        </div>
      </main>
    );
  }

  const workspace = analytics.workspace;

  return (
    <main className={styles.page}>
      <button
        type="button"
        className={styles.backButton}
        onClick={() => navigate("/workspaces")}
      >
        <ArrowLeft size={16} />
        Kembali ke workspaces
      </button>

      <section className={styles.heading}>
        <div>
          <div className={styles.eyebrow}>
            WORKSPACE ANALYTICS
          </div>
          <h1>{workspace.name}</h1>
          <p>
            {workspace.description?.trim() ||
              "Belum ada deskripsi untuk workspace ini."}
          </p>

          <div className={styles.meta}>
            <span
              className={`${styles.roleBadge} ${
                role === "OWNER"
                  ? styles.roleOwner
                  : role === "ADMIN"
                    ? styles.roleAdmin
                    : styles.roleCollaborator
              }`}
            >
              <ShieldCheck size={13} />
              {ROLE_LABELS[role ?? ""] ?? role ?? "Member"}
            </span>

            <span>
              <Users size={14} />
              {stats?.total_members ?? 0} anggota
            </span>

            <span>
              <Clock3 size={14} />
              Dibuat {formatDate(workspace.created_at)}
            </span>
          </div>
        </div>

        <button
          type="button"
          className={styles.refreshButton}
          onClick={() => void reload()}
          disabled={loading || tasksLoading}
        >
          <RefreshCw size={16} />
          Refresh
        </button>
      </section>

      <section className={styles.statsGrid} aria-label="Workspace statistics">
        <article className={styles.statCard}>
          <div className={`${styles.statIcon} ${styles.iconIndigo}`}>
            <FolderKanban size={21} />
          </div>
          <p className={styles.statLabel}>Total Projects</p>
          <strong className={styles.statValue}>
            {stats?.total_projects ?? 0}
          </strong>
          <span className={styles.statHint}>Active projects</span>
        </article>

        <article className={styles.statCard}>
          <div className={`${styles.statIcon} ${styles.iconBlue}`}>
            <ListTodo size={21} />
          </div>
          <p className={styles.statLabel}>Total Tasks</p>
          <strong className={styles.statValue}>
            {stats?.total_tasks ?? 0}
          </strong>
          <span className={styles.statHint}>
            {stats?.unassigned_tasks ?? 0} belum di-assign
          </span>
        </article>

        <article className={styles.statCard}>
          <div className={`${styles.statIcon} ${styles.iconOrange}`}>
            <Clock3 size={21} />
          </div>
          <p className={styles.statLabel}>In Progress</p>
          <strong className={styles.statValue}>
            {stats?.in_progress_tasks ?? 0}
          </strong>
          <span className={styles.statHint}>
            {stats?.todo_tasks ?? 0} task menunggu
          </span>
        </article>

        <article className={styles.statCard}>
          <div className={`${styles.statIcon} ${styles.iconGreen}`}>
            <CheckCircle2 size={21} />
          </div>
          <p className={styles.statLabel}>Completed</p>
          <strong className={styles.statValue}>
            {stats?.done_tasks ?? 0}
          </strong>
          <span className={styles.statHint}>
            <TrendingUp size={12} />
            {stats?.completion_rate ?? 0}% completion rate
          </span>
        </article>
      </section>

      <section className={styles.mainGrid}>
        <div className={styles.panel}>
          <div className={styles.panelHeader}>
            <div>
              <h2>Project Performance</h2>
              <p>
                Progress setiap project di workspace ini.
              </p>
            </div>
            <span className={styles.panelCount}>
              {projects.length} project
            </span>
          </div>

          {projects.length === 0 ? (
            <div className={styles.emptyPanel}>
              <FolderKanban size={24} />
              <h3>Belum ada project</h3>
              <p>
                Project yang dibuat di workspace ini akan muncul di
                sini.
              </p>
            </div>
          ) : (
            <div className={styles.projectList}>
              {projects.map((project) => (
                <article
                  className={styles.projectItem}
                  key={project.id}
                  role="button"
                  tabIndex={0}
                  title={`Buka project ${project.name}`}
                  onClick={() =>
                    navigate(`/projects/${project.id}`)
                  }
                  onKeyDown={(event) => {
                    if (
                      event.key === "Enter" ||
                      event.key === " "
                    ) {
                      event.preventDefault();
                      navigate(`/projects/${project.id}`);
                    }
                  }}
                >
                  <div className={styles.projectTop}>
                    <div className={styles.projectIcon}>
                      <FolderKanban size={18} />
                    </div>

                    <div className={styles.projectDetails}>
                      <h3>{project.name}</h3>
                      <p>
                        {project.description?.trim() ||
                          "Tanpa deskripsi"}
                      </p>
                    </div>

                    <span
                      className={`${styles.projectBadge} ${getProjectBadgeClass(
                        project,
                      )}`}
                    >
                      {getProjectBadgeLabel(project)}
                    </span>
                  </div>

                  <div className={styles.progressInfo}>
                    <span>
                      {project.done_tasks} / {project.total_tasks} task
                      selesai
                    </span>
                    <strong>{project.progress}%</strong>
                  </div>

                  <div className={styles.progressTrack}>
                    <div
                      className={styles.progressBar}
                      style={{ width: `${project.progress}%` }}
                    />
                  </div>

                  <div className={styles.projectFooter}>
                    <span>
                      <Users size={13} />
                      {project.member_count} member
                    </span>
                    <span>{project.in_progress_tasks} in progress</span>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>

        <aside className={styles.panel}>
          <div className={styles.panelHeader}>
            <div>
              <h2>Task Distribution</h2>
              <p>Ringkasan status seluruh task.</p>
            </div>
          </div>

          <div className={styles.donutWrapper}>
            <div
              className={styles.donut}
              style={{ background: distribution.gradient }}
            >
              <div className={styles.donutHole}>
                <strong>{distribution.total}</strong>
                <span>Total tasks</span>
              </div>
            </div>
          </div>

          <div className={styles.legend}>
            <div className={styles.legendItem}>
              <span className={`${styles.legendDot} ${styles.dotTodo}`} />
              <div>
                <p>To Do</p>
                <span>
                  {distribution.todo} task ·{" "}
                  {distribution.todoPercent}%
                </span>
              </div>
            </div>

            <div className={styles.legendItem}>
              <span
                className={`${styles.legendDot} ${styles.dotProgress}`}
              />
              <div>
                <p>In Progress</p>
                <span>
                  {distribution.inProgress} task ·{" "}
                  {distribution.progressPercent}%
                </span>
              </div>
            </div>

            <div className={styles.legendItem}>
              <span className={`${styles.legendDot} ${styles.dotDone}`} />
              <div>
                <p>Done</p>
                <span>
                  {distribution.done} task · {distribution.donePercent}%
                </span>
              </div>
            </div>
          </div>

          <div className={styles.completionBox}>
            <div>
              <span>Completion rate</span>
              <strong>{stats?.completion_rate ?? 0}%</strong>
            </div>
            <div className={styles.completionTrack}>
              <div
                className={styles.completionBar}
                style={{
                  width: `${stats?.completion_rate ?? 0}%`,
                }}
              />
            </div>
            <p>
              {stats?.done_tasks ?? 0} dari {stats?.total_tasks ?? 0}{" "}
              task sudah selesai.
            </p>
          </div>
        </aside>
      </section>

      <section className={styles.panel}>
        <div className={styles.panelHeader}>
          <div>
            <h2>All Tasks</h2>
            <p>
              Seluruh task di workspace, lengkap dengan status dan
              penanggung jawab.
            </p>
          </div>
          <span className={styles.panelCount}>
            {totalTasks} task
          </span>
        </div>

        <div className={styles.taskToolbar}>
          <div
            className={styles.tabs}
            role="tablist"
            aria-label="Filter status task"
          >
            {statusTabs.map((tab) => (
              <button
                key={tab.value}
                type="button"
                role="tab"
                aria-selected={statusFilter === tab.value}
                className={`${styles.tab} ${
                  statusFilter === tab.value ? styles.tabActive : ""
                }`}
                onClick={() => setStatusFilter(tab.value)}
              >
                {tab.label}
                <span>{tab.count}</span>
              </button>
            ))}
          </div>

          <div className={styles.taskFilters}>
            <select
              className={styles.select}
              value={projectFilter}
              onChange={(event) =>
                handleProjectFilter(event.target.value)
              }
              aria-label="Filter berdasarkan project"
            >
              <option value="ALL">All projects</option>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>

            <button
              type="button"
              className={`${styles.mineButton} ${
                mineOnly ? styles.mineButtonActive : ""
              }`}
              aria-pressed={mineOnly}
              onClick={toggleMineOnly}
            >
              Assigned to me
            </button>
          </div>
        </div>

        {tasksError ? (
          <div className={styles.taskError}>
            <p>{tasksError}</p>
            <button type="button" onClick={() => void reload()}>
              Coba lagi
            </button>
          </div>
        ) : tasksLoading ? (
          <div className={styles.taskSkeletonList}>
            {Array.from({ length: 4 }).map((_, index) => (
              <div className={styles.taskSkeleton} key={index} />
            ))}
          </div>
        ) : tasks.length === 0 ? (
          <div className={styles.emptyPanel}>
            <ListTodo size={24} />
            <h3>Task tidak ditemukan</h3>
            <p>
              {statusFilter === "ALL" && projectFilter === "ALL"
                ? "Belum ada task di workspace ini."
                : "Tidak ada task yang cocok dengan filter yang dipilih."}
            </p>
          </div>
        ) : (
          <>
            <div className={styles.tableWrapper}>
              <table className={styles.taskTable}>
                <thead>
                  <tr>
                    <th>Task</th>
                    <th>Project</th>
                    <th>Assignee</th>
                    <th>Created</th>
                    <th>Status</th>
                  </tr>
                </thead>

                <tbody>
                  {tasks.map((task) => (
                    <tr key={task.id}>
                      <td>
                        <div className={styles.taskName}>
                          <span
                            className={`${styles.taskDot} ${
                              task.status === "DONE"
                                ? styles.taskDotDone
                                : task.status === "IN_PROGRESS"
                                  ? styles.taskDotProgress
                                  : ""
                            }`}
                          />
                          <div>
                            <p>{task.title}</p>
                            <span>
                              {task.description?.trim() ||
                                "Tanpa deskripsi"}
                            </span>
                          </div>
                        </div>
                      </td>

                      <td className={styles.projectCell}>
                        {task.project_name}
                      </td>

                      <td>
                        {task.assignee_name ? (
                          <span className={styles.assignee}>
                            <span className={styles.avatar}>
                              {getInitials(task.assignee_name)}
                            </span>
                            {task.assignee_name}
                          </span>
                        ) : (
                          <span className={styles.unassigned}>
                            Unassigned
                          </span>
                        )}
                      </td>

                      <td className={styles.dateCell}>
                        {formatDate(task.created_at)}
                      </td>

                      <td>
                        <span
                          className={`${styles.taskStatus} ${getTaskStatusClass(
                            task.status,
                          )}`}
                        >
                          {STATUS_LABELS[task.status] ?? task.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <WorkspacePagination
              page={page}
              totalPages={totalPages}
              onPageChange={setPage}
            />
          </>
        )}
      </section>

      <section className={styles.panel}>
        <div className={styles.panelHeader}>
          <div>
            <h2>Workspace Members</h2>
            <p>Orang-orang yang berkolaborasi di workspace ini.</p>
          </div>
          <span className={styles.panelCount}>
            {members.length} member
          </span>
        </div>

        {members.length === 0 ? (
          <div className={styles.emptyPanel}>
            <Users size={24} />
            <h3>Belum ada member</h3>
          </div>
        ) : (
          <div className={styles.memberGrid}>
            {members.map((member) => (
              <article className={styles.memberCard} key={member.id}>
                <span className={styles.memberAvatar}>
                  {getInitials(member.name)}
                </span>

                <div className={styles.memberInfo}>
                  <strong>{member.name}</strong>
                  <span>{member.email}</span>
                </div>

                <span
                  className={`${styles.memberRole} ${
                    member.role === "OWNER"
                      ? styles.roleOwner
                      : member.role === "ADMIN"
                        ? styles.roleAdmin
                        : styles.roleCollaborator
                  }`}
                >
                  {ROLE_LABELS[member.role] ?? member.role}
                </span>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
