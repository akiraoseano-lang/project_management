import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  CircleDashed,
  Clock3,
  Layers3,
  ListTodo,
  Pencil,
  RefreshCw,
  ShieldCheck,
  Trash2,
  TrendingUp,
  UserRound,
  Users,
} from "lucide-react";

import ProjectDeleteModal from "../../components/projects/ProjectDeleteModal";
import ProjectModal from "../../components/projects/ProjectModal";
import ProjectPagination from "../../components/projects/ProjectPagination";

import { useAuth } from "../../contexts/AuthContext";
import { useProjectDetail } from "../../hooks/useProjectDetail";

import type { ProjectFormData } from "../../types/project";
import type {
  TaskStatus,
  TaskStatusFilter,
} from "../../types/workspace";

import {
  formatProjectDate,
  getInitials,
  getProjectHealth,
  getProjectHealthLabel,
} from "../../utils/project";

import styles from "./ProjectDetail.module.css";

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

export default function ProjectDetail() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const parsedId = Number(projectId);
  const id =
    Number.isFinite(parsedId) && parsedId > 0 ? parsedId : null;

  const {
    project,
    analytics,
    summary,
    members,
    tasks,
    statusFilter,
    setStatusFilter,
    page,
    setPage,
    totalTasks,
    totalPages,
    loading,
    tasksLoading,
    saving,
    error,
    tasksError,
    reload,
    updateProject,
    deleteProject,
  } = useProjectDetail(id);

  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const workspaceName =
    analytics?.workspace.name ??
    (project ? `Workspace #${project.workspace_id}` : "Workspace");

  const ownerMember =
    members.find((member) => member.user_id === project?.owner_id) ??
    analytics?.members.find(
      (member) => member.user_id === project?.owner_id,
    );

  const canManage = user?.id === project?.owner_id;
  const health = summary
    ? getProjectHealth(summary)
    : ("NO_TASKS" as const);
  const healthLabel = getProjectHealthLabel(health);

  const statusTabs: {
    value: TaskStatusFilter;
    label: string;
    count: number;
  }[] = [
    {
      value: "ALL",
      label: "All",
      count: summary?.total_tasks ?? 0,
    },
    {
      value: "TODO",
      label: "To Do",
      count: summary?.todo_tasks ?? 0,
    },
    {
      value: "IN_PROGRESS",
      label: "In Progress",
      count: summary?.in_progress_tasks ?? 0,
    },
    {
      value: "DONE",
      label: "Done",
      count: summary?.done_tasks ?? 0,
    },
  ];

  const distribution = useMemo(() => {
    const total = summary?.total_tasks ?? 0;
    const todo = summary?.todo_tasks ?? 0;
    const inProgress = summary?.in_progress_tasks ?? 0;
    const done = summary?.done_tasks ?? 0;

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
  }, [summary]);

  const handleUpdate = async (data: ProjectFormData) => {
    await updateProject({
      name: data.name,
      description: data.description.trim() || null,
    });

    setEditOpen(false);
  };

  const handleDelete = async () => {
    await deleteProject();
    setDeleteOpen(false);
    navigate("/projects");
  };

  if (loading && !project) {
    return (
      <main className={styles.page}>
        <div className={styles.skeletonBack} />
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

  if (!project) {
    return (
      <main className={styles.page}>
        <button
          type="button"
          className={styles.backButton}
          onClick={() => navigate("/projects")}
        >
          <ArrowLeft size={16} />
          Kembali ke projects
        </button>

        <div className={styles.errorState}>
          <div className={styles.errorIcon}>
            <CircleDashed size={26} />
          </div>
          <h1>Project tidak dapat dimuat</h1>
          <p>{error ?? "Project yang kamu cari tidak tersedia."}</p>

          <button type="button" onClick={() => void reload()}>
            Coba lagi
          </button>
        </div>
      </main>
    );
  }

  const progress = summary?.progress ?? 0;
  const totalTaskValue = summary?.total_tasks ?? 0;
  const doneTasks = summary?.done_tasks ?? 0;
  const inProgressTasks = summary?.in_progress_tasks ?? 0;
  const todoTasks = summary?.todo_tasks ?? 0;
  const completionRate = totalTaskValue
    ? Math.round((doneTasks / totalTaskValue) * 100)
    : 0;

  return (
    <main className={styles.page}>
      <button
        type="button"
        className={styles.backButton}
        onClick={() => navigate("/projects")}
      >
        <ArrowLeft size={16} />
        Kembali ke projects
      </button>

      <section className={styles.heading}>
        <div>
          <div className={styles.eyebrow}>PROJECT DETAIL</div>
          <h1>{project.name}</h1>
          <p>
            {project.description?.trim() ||
              "Belum ada deskripsi untuk project ini."}
          </p>

          <div className={styles.meta}>
            <span
              className={`${styles.healthBadge} ${getHealthClass(
                health,
              )}`}
            >
              <TrendingUp size={13} />
              {healthLabel}
            </span>

            <span>
              <Layers3 size={14} />
              {workspaceName}
            </span>

            <span>
              <UserRound size={14} />
              {ownerMember?.name ?? "Project owner"}
            </span>

            <span>
              <CalendarDays size={14} />
              Dibuat {formatProjectDate(project.created_at)}
            </span>
          </div>
        </div>

        <div className={styles.headingActions}>
          {canManage && (
            <>
              <button
                type="button"
                className={styles.editButton}
                onClick={() => setEditOpen(true)}
              >
                <Pencil size={15} />
                Edit
              </button>

              <button
                type="button"
                className={styles.deleteButton}
                onClick={() => setDeleteOpen(true)}
              >
                <Trash2 size={15} />
                Hapus
              </button>
            </>
          )}

          <button
            type="button"
            className={styles.refreshButton}
            onClick={() => void reload()}
            disabled={loading || tasksLoading}
          >
            <RefreshCw size={15} />
            Refresh
          </button>
        </div>
      </section>

      <section className={styles.statsGrid} aria-label="Project statistics">
        <article className={styles.statCard}>
          <div className={`${styles.statIcon} ${styles.iconIndigo}`}>
            <ListTodo size={21} />
          </div>
          <p className={styles.statLabel}>Total Tasks</p>
          <strong className={styles.statValue}>
            {totalTaskValue}
          </strong>
          <span className={styles.statHint}>
            {todoTasks} task menunggu
          </span>
        </article>

        <article className={styles.statCard}>
          <div className={`${styles.statIcon} ${styles.iconBlue}`}>
            <Clock3 size={21} />
          </div>
          <p className={styles.statLabel}>In Progress</p>
          <strong className={styles.statValue}>
            {inProgressTasks}
          </strong>
          <span className={styles.statHint}>
            Task yang sedang dikerjakan
          </span>
        </article>

        <article className={styles.statCard}>
          <div className={`${styles.statIcon} ${styles.iconGreen}`}>
            <CheckCircle2 size={21} />
          </div>
          <p className={styles.statLabel}>Completed</p>
          <strong className={styles.statValue}>{doneTasks}</strong>
          <span className={styles.statHint}>
            <TrendingUp size={12} />
            {completionRate}% completion rate
          </span>
        </article>

        <article className={styles.statCard}>
          <div className={`${styles.statIcon} ${styles.iconOrange}`}>
            <Users size={21} />
          </div>
          <p className={styles.statLabel}>Members</p>
          <strong className={styles.statValue}>
            {members.length}
          </strong>
          <span className={styles.statHint}>
            {summary?.member_count ?? 0} member project
          </span>
        </article>
      </section>

      <section className={styles.mainGrid}>
        <div className={styles.panel}>
          <div className={styles.panelHeader}>
            <div>
              <h2>Project Progress</h2>
              <p>Ringkasan penyelesaian pekerjaan project ini.</p>
            </div>
          </div>

          <div className={styles.progressOverview}>
            <div className={styles.progressTop}>
              <div>
                <span>Overall progress</span>
                <strong>{progress}%</strong>
              </div>

              <div className={styles.progressCount}>
                {doneTasks} dari {totalTaskValue} task selesai
              </div>
            </div>

            <div className={styles.progressTrack}>
              <div
                className={styles.progressBar}
                style={{
                  width: `${Math.min(progress, 100)}%`,
                }}
              />
            </div>

            <div className={styles.breakdown}>
              <div className={styles.breakdownItem}>
                <div className={styles.breakdownTop}>
                  <span>
                    <span
                      className={`${styles.dot} ${styles.dotTodo}`}
                    />
                    To Do
                  </span>
                  <strong>{todoTasks}</strong>
                </div>
                <div className={styles.miniTrack}>
                  <div
                    className={`${styles.miniBar} ${styles.barTodo}`}
                    style={{
                      width: `${
                        totalTaskValue
                          ? (todoTasks / totalTaskValue) * 100
                          : 0
                      }%`,
                    }}
                  />
                </div>
              </div>

              <div className={styles.breakdownItem}>
                <div className={styles.breakdownTop}>
                  <span>
                    <span
                      className={`${styles.dot} ${styles.dotProgress}`}
                    />
                    In Progress
                  </span>
                  <strong>{inProgressTasks}</strong>
                </div>
                <div className={styles.miniTrack}>
                  <div
                    className={`${styles.miniBar} ${styles.barProgress}`}
                    style={{
                      width: `${
                        totalTaskValue
                          ? (inProgressTasks / totalTaskValue) * 100
                          : 0
                      }%`,
                    }}
                  />
                </div>
              </div>

              <div className={styles.breakdownItem}>
                <div className={styles.breakdownTop}>
                  <span>
                    <span
                      className={`${styles.dot} ${styles.dotDone}`}
                    />
                    Done
                  </span>
                  <strong>{doneTasks}</strong>
                </div>
                <div className={styles.miniTrack}>
                  <div
                    className={`${styles.miniBar} ${styles.barDone}`}
                    style={{
                      width: `${
                        totalTaskValue
                          ? (doneTasks / totalTaskValue) * 100
                          : 0
                      }%`,
                    }}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className={styles.detailList}>
            <div className={styles.detailRow}>
              <Layers3 size={15} />
              <span>Workspace</span>
              <strong>{workspaceName}</strong>
            </div>

            <div className={styles.detailRow}>
              <UserRound size={15} />
              <span>Owner</span>
              <strong>{ownerMember?.name ?? "Project owner"}</strong>
            </div>

            <div className={styles.detailRow}>
              <ShieldCheck size={15} />
              <span>Role workspace</span>
              <strong>
                {ROLE_LABELS[analytics?.role ?? ""] ??
                  analytics?.role ??
                  "Member"}
              </strong>
            </div>

            <div className={styles.detailRow}>
              <CalendarDays size={15} />
              <span>Dibuat</span>
              <strong>
                {formatProjectDate(project.created_at)}
              </strong>
            </div>
          </div>
        </div>

        <aside className={styles.panel}>
          <div className={styles.panelHeader}>
            <div>
              <h2>Task Distribution</h2>
              <p>Ringkasan status seluruh task project.</p>
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
              <span
                className={`${styles.legendDot} ${styles.dotTodo}`}
              />
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
              <span
                className={`${styles.legendDot} ${styles.dotDone}`}
              />
              <div>
                <p>Done</p>
                <span>
                  {distribution.done} task ·{" "}
                  {distribution.donePercent}%
                </span>
              </div>
            </div>
          </div>

          <div className={styles.completionBox}>
            <div>
              <span>Completion rate</span>
              <strong>{completionRate}%</strong>
            </div>
            <div className={styles.completionTrack}>
              <div
                className={styles.completionBar}
                style={{ width: `${completionRate}%` }}
              />
            </div>
            <p>
              {doneTasks} dari {totalTaskValue} task sudah selesai.
            </p>
          </div>
        </aside>
      </section>

      <section className={styles.panel}>
        <div className={styles.panelHeader}>
          <div>
            <h2>Project Tasks</h2>
            <p>
              Seluruh task project, lengkap dengan status dan
              penanggung jawab.
            </p>
          </div>
          <span className={styles.panelCount}>
            {totalTasks} task
          </span>
        </div>

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
              {statusFilter === "ALL"
                ? "Belum ada task di project ini."
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
                        {formatProjectDate(task.created_at)}
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

            <ProjectPagination
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
            <h2>Project Members</h2>
            <p>Orang-orang yang tergabung di project ini.</p>
          </div>
          <span className={styles.panelCount}>
            {members.length} member
          </span>
        </div>

        {members.length === 0 ? (
          <div className={styles.emptyPanel}>
            <Users size={24} />
            <h3>Belum ada member</h3>
            <p>Anggota project akan muncul di sini.</p>
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
                  <span>{member.email || "Tanpa email"}</span>
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
                  {ROLE_LABELS[member.role ?? ""] ??
                    member.role ??
                    "Member"}
                </span>
              </article>
            ))}
          </div>
        )}
      </section>

      <ProjectModal
        open={editOpen}
        loading={saving}
        mode="edit"
        initialData={{
          workspaceId: project.workspace_id,
          name: project.name,
          description: project.description ?? "",
        }}
        workspaceName={workspaceName}
        workspaces={[
          {
            id: project.workspace_id,
            name: workspaceName,
            role: analytics?.role ?? "COLLABORATOR",
          },
        ]}
        onClose={() => {
          if (!saving) setEditOpen(false);
        }}
        onSubmit={handleUpdate}
      />

      <ProjectDeleteModal
        project={
          deleteOpen
            ? {
                id: String(project.id),
                name: project.name,
              }
            : null
        }
        onClose={() => setDeleteOpen(false)}
        onConfirm={handleDelete}
      />
    </main>
  );
}
