import { useCallback, useEffect, useState } from "react";

import { useAuth } from "../contexts/AuthContext";

import {
  getWorkspaceAnalytics,
  getWorkspaceTasks,
} from "../services/workspaceService";
import { searchWorkspaceTasks } from "../services/taskService";

import type {
  TaskStatusFilter,
  WorkspaceAnalytics,
  WorkspaceTaskSummary,
} from "../types/workspace";

const TASK_PAGE_SIZE = 8;
const SEARCH_DELAY = 350;

export function useWorkspaceDashboard(workspaceId: number | null) {
  const { user } = useAuth();

  const [analytics, setAnalytics] = useState<WorkspaceAnalytics | null>(
    null,
  );
  const [tasks, setTasks] = useState<WorkspaceTaskSummary[]>([]);

  const [statusFilter, setStatusFilterState] =
    useState<TaskStatusFilter>("ALL");
  const [projectFilter, setProjectFilterState] = useState<
    number | "ALL"
  >("ALL");
  const [mineOnly, setMineOnly] = useState(false);
  const [taskSearchInput, setTaskSearchInput] = useState("");
  const [taskSearch, setTaskSearch] = useState("");

  const [page, setPageState] = useState(1);
  const [totalTasks, setTotalTasks] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  const [loading, setLoading] = useState(true);
  const [tasksLoading, setTasksLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tasksError, setTasksError] = useState<string | null>(null);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setTaskSearch(taskSearchInput.trim());
      setPageState(1);
    }, SEARCH_DELAY);

    return () => window.clearTimeout(timeoutId);
  }, [taskSearchInput]);

  const loadAnalytics = useCallback(async () => {
    if (workspaceId === null) {
      setAnalytics(null);
      setError("Workspace tidak ditemukan.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await getWorkspaceAnalytics(workspaceId);
      setAnalytics(result);
    } catch (err) {
      setAnalytics(null);
      setError(
        err instanceof Error
          ? err.message
          : "Gagal memuat analitik workspace.",
      );
    } finally {
      setLoading(false);
    }
  }, [workspaceId]);

  const loadTasks = useCallback(async () => {
    if (workspaceId === null) {
      setTasks([]);
      setTotalTasks(0);
      setTotalPages(0);
      setTasksLoading(false);
      return;
    }

    setTasksLoading(true);
    setTasksError(null);

    try {
      if (taskSearch) {
        const result = await searchWorkspaceTasks(workspaceId, {
          search: taskSearch,
          page: 1,
          pageSize: 100,
        });

        const projectNames = new Map(
          (analytics?.projects ?? []).map((project) => [
            project.id,
            project.name,
          ]),
        );

        const memberNames = new Map(
          (analytics?.members ?? []).map((member) => [
            member.user_id,
            member.name,
          ]),
        );

        const mapped: WorkspaceTaskSummary[] = result.items.map(
          (task) => ({
            ...task,
            project_name:
              projectNames.get(task.project_id) ??
              `Project #${task.project_id}`,
            creator_name:
              memberNames.get(task.created_by) ?? null,
            assignee_name: task.assigned_to
              ? memberNames.get(task.assigned_to) ?? null
              : null,
          }),
        );

        const filtered = mapped.filter((task) => {
          if (
            statusFilter !== "ALL" &&
            task.status !== statusFilter
          ) {
            return false;
          }

          if (
            projectFilter !== "ALL" &&
            task.project_id !== projectFilter
          ) {
            return false;
          }

          if (mineOnly && task.assigned_to !== user?.id) {
            return false;
          }

          return true;
        });

        const totalPagesValue = Math.ceil(
          filtered.length / TASK_PAGE_SIZE,
        );
        const offset = (page - 1) * TASK_PAGE_SIZE;

        setTasks(
          filtered.slice(offset, offset + TASK_PAGE_SIZE),
        );
        setTotalTasks(filtered.length);
        setTotalPages(totalPagesValue);
      } else {
        const result = await getWorkspaceTasks(workspaceId, {
          page,
          pageSize: TASK_PAGE_SIZE,
          status: statusFilter,
          projectId:
            projectFilter === "ALL" ? undefined : projectFilter,
          mine: mineOnly,
        });

        setTasks(result.items);
        setTotalTasks(result.total);
        setTotalPages(result.total_pages);
      }
    } catch (err) {
      setTasks([]);
      setTotalTasks(0);
      setTotalPages(0);
      setTasksError(
        err instanceof Error
          ? err.message
          : "Gagal memuat daftar task.",
      );
    } finally {
      setTasksLoading(false);
    }
  }, [
    workspaceId,
    page,
    statusFilter,
    projectFilter,
    mineOnly,
    taskSearch,
    analytics,
    user?.id,
  ]);

  useEffect(() => {
    void loadAnalytics();
  }, [loadAnalytics]);

  useEffect(() => {
    void loadTasks();
  }, [loadTasks]);

  useEffect(() => {
    if (totalPages === 0 && page !== 1) {
      setPageState(1);
    } else if (totalPages > 0 && page > totalPages) {
      setPageState(totalPages);
    }
  }, [page, totalPages]);

  const setStatusFilter = (status: TaskStatusFilter) => {
    setStatusFilterState(status);
    setPageState(1);
  };

  const setProjectFilter = (projectId: number | "ALL") => {
    setProjectFilterState(projectId);
    setPageState(1);
  };

  const toggleMineOnly = () => {
    setMineOnly((value) => !value);
    setPageState(1);
  };

  const setPage = (nextPage: number) => {
    setPageState(Math.max(1, nextPage));
  };

  const reload = () => {
    void loadAnalytics();
    void loadTasks();
  };

  return {
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
    taskSearchInput,
    setTaskSearchInput,
    taskSearch,
    page,
    setPage,
    totalTasks,
    totalPages,
    reload,
  };
}
