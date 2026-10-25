import { useCallback, useEffect, useState } from "react";

import {
  getWorkspaceAnalytics,
  getWorkspaceTasks,
} from "../services/workspaceService";

import type {
  TaskStatusFilter,
  WorkspaceAnalytics,
  WorkspaceTaskSummary,
} from "../types/workspace";

const TASK_PAGE_SIZE = 8;

export function useWorkspaceDashboard(workspaceId: number | null) {
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

  const [page, setPageState] = useState(1);
  const [totalTasks, setTotalTasks] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  const [loading, setLoading] = useState(true);
  const [tasksLoading, setTasksLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tasksError, setTasksError] = useState<string | null>(null);

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
  }, [workspaceId, page, statusFilter, projectFilter, mineOnly]);

  useEffect(() => {
    void loadAnalytics();
  }, [loadAnalytics]);

  useEffect(() => {
    void loadTasks();
  }, [loadTasks]);

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
    page,
    setPage,
    totalTasks,
    totalPages,
    reload,
  };
}
