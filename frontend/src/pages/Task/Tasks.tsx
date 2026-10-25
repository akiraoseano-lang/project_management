import { useCallback, useEffect, useState } from "react";
import {
  CheckCircle2,
  Info,
  ListTodo,
  Plus,
  RefreshCw,
  X,
} from "lucide-react";

import TaskDrawer from "../../components/tasks/TaskDrawer";
import TaskModal from "../../components/tasks/TaskModal";
import TaskPagination from "../../components/tasks/TaskPagination";
import TaskTable from "../../components/tasks/TaskTable";
import TaskToolbar from "../../components/tasks/TaskToolbar";

import { useAuth } from "../../contexts/AuthContext";
import { useTasks } from "../../hooks/useTasks";

import { getAssignableMembers } from "../../services/taskService";

import type {
  Task,
  TaskAssignee,
  TaskFeedMode,
  TaskFormData,
  TaskStatus,
  TaskSummary,
} from "../../types/task";

import styles from "./Tasks.module.css";

interface Notice {
  tone: "success" | "info" | "error";
  message: string;
}

interface TasksProps {
  mode: TaskFeedMode;
}

const COPY: Record<
  TaskFeedMode,
  {
    eyebrow: string;
    title: string;
    description: string;
  }
> = {
  mine: {
    eyebrow: "PERSONAL WORKSPACE",
    title: "My Tasks",
    description:
      "Semua task yang di-assign ke kamu dari seluruh project, dalam satu tempat.",
  },
  all: {
    eyebrow: "WORK MANAGEMENT",
    title: "All Tasks",
    description:
      "Pantau seluruh task dari project yang kamu ikuti beserta status dan penanggung jawabnya.",
  },
};

function mergeTask(
  summary: TaskSummary,
  updated: Task,
): TaskSummary {
  return { ...summary, ...updated };
}

export default function Tasks({ mode }: TasksProps) {
  const { user } = useAuth();

  const {
    tasks,
    projects,
    allProjects,
    workspaces,
    manageableProjects,
    searchInput,
    setSearchInput,
    statusFilter,
    setStatusFilter,
    projectFilter,
    setProjectFilter,
    workspaceFilter,
    setWorkspaceFilter,
    page,
    setPage,
    total,
    totalPages,
    loading,
    saving,
    error,
    hasFilters,
    resetFilters,
    reload,
    createTask,
    updateTask,
    claimTask,
    unclaimTask,
  } = useTasks(mode);

  const [activeTask, setActiveTask] = useState<TaskSummary | null>(
    null,
  );
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTask, setEditingTask] =
    useState<TaskSummary | null>(null);
  const [assignees, setAssignees] = useState<TaskAssignee[]>([]);
  const [assigneesLoading, setAssigneesLoading] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);

  const copy = COPY[mode];

  const selectedTask = activeTask
    ? tasks.find((task) => task.id === activeTask.id) ?? activeTask
    : null;

  const selectedProject = selectedTask
    ? allProjects.find(
        (project) => project.id === selectedTask.project_id,
      )
    : null;

  const canManageSelected =
    user != null &&
    selectedProject != null &&
    (selectedProject.ownerId === user.id ||
      selectedProject.workspaceRole === "OWNER");

  const canChangeStatus =
    canManageSelected ||
    (user != null && selectedTask?.assigned_to === user.id);

  const editingProject = editingTask
    ? allProjects.find(
        (project) => project.id === editingTask.project_id,
      )
    : null;

  const loadAssignees = useCallback(
    async (projectId: number | null) => {
      if (projectId === null) {
        setAssignees([]);
        return;
      }

      const project = allProjects.find(
        (item) => item.id === projectId,
      );

      if (!project) {
        setAssignees([]);
        return;
      }

      setAssigneesLoading(true);

      try {
        const members = await getAssignableMembers(
          project.id,
          project.workspaceId,
        );

        setAssignees(members);
      } catch {
        setAssignees([]);
      } finally {
        setAssigneesLoading(false);
      }
    },
    [allProjects],
  );

  useEffect(() => {
    if (!modalOpen) {
      setAssignees([]);
      setAssigneesLoading(false);
    }
  }, [modalOpen]);

  const openCreateModal = () => {
    setEditingTask(null);
    setModalOpen(true);
  };

  const openEditModal = (task: TaskSummary) => {
    setEditingTask(task);
    setModalOpen(true);

    const project = allProjects.find(
      (item) => item.id === task.project_id,
    );

    if (project) {
      void loadAssignees(project.id);
    }
  };

  const closeModal = () => {
    if (saving) return;

    setModalOpen(false);
    setEditingTask(null);
  };

  const handleSubmit = async (data: TaskFormData) => {
    if (editingTask) {
      const updated = await updateTask(editingTask.id, {
        title: data.title.trim(),
        description: data.description.trim() || null,
      });

      setActiveTask((current) =>
        current && current.id === updated.id
          ? mergeTask(current, updated)
          : current,
      );

      setModalOpen(false);
      setEditingTask(null);
      setNotice({
        tone: "success",
        message: "Perubahan task berhasil disimpan.",
      });

      return;
    }

    const created = await createTask(data);

    setModalOpen(false);
    setNotice({
      tone: "success",
      message: created.assigned_to
        ? "Task berhasil dibuat dan langsung di-assign."
        : "Task berhasil dibuat.",
    });
  };

  const handleOpenTask = (task: TaskSummary) => {
    setActiveTask(task);
  };

  const handleClaim = async (task: TaskSummary) => {
    try {
      const updated = await claimTask(task.id);
      setActiveTask((current) =>
        current && current.id === task.id
          ? mergeTask(current, updated)
          : current,
      );
      setNotice({
        tone: "success",
        message: "Task berhasil diambil dan berstatus In Progress.",
      });
    } catch (err) {
      setNotice({
        tone: "error",
        message:
          err instanceof Error
            ? err.message
            : "Gagal mengambil task.",
      });
    }
  };

  const handleUnclaim = async (task: TaskSummary) => {
    try {
      const updated = await unclaimTask(task.id);
      setActiveTask((current) =>
        current && current.id === task.id
          ? mergeTask(current, updated)
          : current,
      );
      setNotice({
        tone: "success",
        message: "Task berhasil dilepas dan kembali ke To Do.",
      });
    } catch (err) {
      setNotice({
        tone: "error",
        message:
          err instanceof Error
            ? err.message
            : "Gagal melepas task.",
      });
    }
  };

  const handleChangeStatus = async (
    taskId: number,
    status: TaskStatus,
  ) => {
    try {
      const updated = await updateTask(taskId, { status });
      setActiveTask((current) =>
        current && current.id === taskId
          ? mergeTask(current, updated)
          : current,
      );
    } catch (err) {
      setNotice({
        tone: "error",
        message:
          err instanceof Error
            ? err.message
            : "Gagal mengubah status task.",
      });
    }
  };

  const canCreate = mode === "all" && manageableProjects.length > 0;

  return (
    <main className={styles.page}>
      <section className={styles.heading}>
        <div>
          <div className={styles.eyebrow}>{copy.eyebrow}</div>
          <h1>{copy.title}</h1>
          <p>{copy.description}</p>
        </div>

        <div className={styles.headingActions}>
          {canCreate && (
            <button
              type="button"
              className={styles.createButton}
              onClick={openCreateModal}
            >
              <Plus size={18} />
              <span>Buat task</span>
            </button>
          )}

          <button
            type="button"
            className={styles.refreshButton}
            onClick={() => void reload()}
            disabled={loading}
            aria-label="Muat ulang task"
            title="Muat ulang"
          >
            <RefreshCw size={17} />
          </button>
        </div>
      </section>

      <section className={styles.content}>
        <div className={styles.sectionHeading}>
          <div>
            <h2>
              {mode === "mine" ? "Task saya" : "Seluruh task"}
            </h2>
            <p>
              {mode === "mine"
                ? "Klik task untuk melihat checklist dan memperbarui status."
                : "Klik task untuk melihat detail, checklist, dan mengubah status."}
            </p>
          </div>

          <span className={styles.resultBadge}>
            <ListTodo size={15} />
            {total} task
          </span>
        </div>

        <TaskToolbar
          search={searchInput}
          onSearchChange={setSearchInput}
          statusFilter={statusFilter}
          onStatusChange={setStatusFilter}
          workspaceFilter={workspaceFilter}
          onWorkspaceChange={setWorkspaceFilter}
          projectFilter={projectFilter}
          onProjectChange={setProjectFilter}
          workspaces={workspaces}
          projects={projects}
          total={total}
          hasFilters={hasFilters}
          onReset={resetFilters}
        />

        {notice && (
          <div
            className={`${styles.notice} ${styles[notice.tone]}`}
            role="status"
          >
            {notice.tone === "success" ? (
              <CheckCircle2 size={17} />
            ) : (
              <Info size={17} />
            )}

            <p>{notice.message}</p>

            <button
              type="button"
              className={styles.noticeClose}
              onClick={() => setNotice(null)}
              aria-label="Tutup notifikasi"
            >
              <X size={16} />
            </button>
          </div>
        )}

        <TaskTable
          tasks={tasks}
          loading={loading}
          error={error}
          hasFilters={hasFilters}
          currentUserId={user?.id}
          saving={saving}
          emptyTitle={
            mode === "mine"
              ? "Belum ada task untukmu"
              : "Belum ada task"
          }
          emptyDescription={
            mode === "mine"
              ? "Task yang di-assign ke kamu akan muncul di sini. Kamu juga bisa mengambil task unassigned dari halaman All Tasks."
              : "Buat task pertama di project yang kamu kelola untuk mulai mengatur pekerjaan tim."
          }
          onOpen={handleOpenTask}
          onClaim={(task) => void handleClaim(task)}
          onUnclaim={(task) => void handleUnclaim(task)}
          onRetry={() => void reload()}
          onReset={resetFilters}
        />

        {!loading && !error && tasks.length > 0 && (
          <TaskPagination
            page={page}
            totalPages={totalPages}
            onPageChange={setPage}
          />
        )}
      </section>

      <TaskDrawer
        task={selectedTask}
        currentUserId={user?.id}
        canManage={canManageSelected}
        canChangeStatus={canChangeStatus}
        saving={saving}
        onClose={() => setActiveTask(null)}
        onEdit={openEditModal}
        onChangeStatus={(taskId, status) =>
          void handleChangeStatus(taskId, status)
        }
        onClaim={(taskId) => {
          const task = tasks.find((item) => item.id === taskId);

          if (task) void handleClaim(task);
        }}
        onUnclaim={(taskId) => {
          const task = tasks.find((item) => item.id === taskId);

          if (task) void handleUnclaim(task);
        }}
        onRefresh={() => void reload()}
      />

      <TaskModal
        open={modalOpen}
        loading={saving}
        mode={editingTask ? "edit" : "create"}
        initialData={
          editingTask
            ? {
                projectId: editingTask.project_id,
                title: editingTask.title,
                description: editingTask.description ?? "",
                assignedTo: editingTask.assigned_to,
              }
            : undefined
        }
        projectName={editingProject?.name}
        projects={manageableProjects}
        assignees={assignees}
        assigneesLoading={assigneesLoading}
        lockedAssigneeName={editingTask?.assignee_name ?? null}
        onProjectChange={(projectId) =>
          void loadAssignees(projectId)
        }
        onClose={closeModal}
        onSubmit={handleSubmit}
      />
    </main>
  );
}
