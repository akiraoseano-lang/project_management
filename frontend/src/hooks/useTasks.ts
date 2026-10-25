import { useCallback, useEffect, useMemo, useState } from "react";

import {
  claimTask as claimTaskRequest,
  createTask as createTaskRequest,
  getAllTasks,
  getMyTasks,
  getTaskCatalog,
  unclaimTask as unclaimTaskRequest,
  updateTask as updateTaskRequest,
} from "../services/taskService";

import {
  TASK_PAGE_SIZE,
} from "../utils/task";

import type {
  Task,
  TaskCreatePayload,
  TaskFeedMode,
  TaskFormData,
  TaskProjectOption,
  TaskStatusFilter,
  TaskSummary,
  TaskUpdatePayload,
  TaskWorkspaceOption,
} from "../types/task";

const SEARCH_DELAY = 350;

function isManageableRole(role: string): boolean {
  return role === "OWNER" || role === "ADMIN";
}

export function useTasks(mode: TaskFeedMode) {
  const [tasks, setTasks] = useState<TaskSummary[]>([]);
  const [projects, setProjects] = useState<TaskProjectOption[]>([]);
  const [workspaces, setWorkspaces] = useState<
    TaskWorkspaceOption[]
  >([]);
  const [catalogLoaded, setCatalogLoaded] = useState(false);

  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilterState] =
    useState<TaskStatusFilter>("ALL");
  const [projectFilter, setProjectFilterState] = useState<
    number | "ALL"
  >("ALL");
  const [workspaceFilter, setWorkspaceFilterState] = useState<
    number | "ALL"
  >("ALL");

  const [page, setPageState] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setSearch(searchInput.trim());
      setPageState(1);
    }, SEARCH_DELAY);

    return () => window.clearTimeout(timeoutId);
  }, [searchInput]);

  useEffect(() => {
    let cancelled = false;

    const loadCatalog = async () => {
      try {
        const catalog = await getTaskCatalog();

        if (cancelled) return;

        setProjects(catalog.projects);
        setWorkspaces(catalog.workspaces);
      } catch {
        if (cancelled) return;

        setProjects([]);
        setWorkspaces([]);
      } finally {
        if (!cancelled) {
          setCatalogLoaded(true);
        }
      }
    };

    void loadCatalog();

    return () => {
      cancelled = true;
    };
  }, []);

  const loadTasks = useCallback(async () => {
    setLoading(true);
    setError(null);

    const fetcher = mode === "mine" ? getMyTasks : getAllTasks;

    try {
      const result = await fetcher({
        page,
        pageSize: TASK_PAGE_SIZE,
        status: statusFilter,
        projectId:
          projectFilter === "ALL" ? undefined : projectFilter,
        workspaceId:
          workspaceFilter === "ALL"
            ? undefined
            : workspaceFilter,
        search,
      });

      setTasks(result.items);
      setTotal(result.total);
      setTotalPages(result.total_pages);
    } catch (err) {
      setTasks([]);
      setTotal(0);
      setTotalPages(0);
      setError(
        err instanceof Error
          ? err.message
          : "Gagal memuat task.",
      );
    } finally {
      setLoading(false);
    }
  }, [
    mode,
    page,
    statusFilter,
    projectFilter,
    workspaceFilter,
    search,
  ]);

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

  const projectOptions = useMemo(() => {
    if (workspaceFilter === "ALL") return projects;

    return projects.filter(
      (project) => project.workspaceId === workspaceFilter,
    );
  }, [projects, workspaceFilter]);

  const manageableProjects = useMemo(
    () =>
      projects.filter((project) =>
        isManageableRole(project.workspaceRole),
      ),
    [projects],
  );

  const setStatusFilter = (value: TaskStatusFilter) => {
    setStatusFilterState(value);
    setPageState(1);
  };

  const setProjectFilter = (value: number | "ALL") => {
    setProjectFilterState(value);
    setPageState(1);
  };

  const setWorkspaceFilter = (value: number | "ALL") => {
    setWorkspaceFilterState(value);
    setProjectFilterState((currentProject) => {
      if (currentProject === "ALL" || value === "ALL") {
        return currentProject;
      }

      const project = projects.find(
        (item) => item.id === currentProject,
      );

      return project && project.workspaceId === value
        ? currentProject
        : "ALL";
    });
    setPageState(1);
  };

  const setPage = (nextPage: number) => {
    setPageState(Math.max(1, nextPage));
  };

  const resetFilters = () => {
    setSearchInput("");
    setSearch("");
    setStatusFilterState("ALL");
    setProjectFilterState("ALL");
    setWorkspaceFilterState("ALL");
    setPageState(1);
  };

  const reload = useCallback(async () => {
    await loadTasks();
  }, [loadTasks]);

  const createTask = async (data: TaskFormData): Promise<Task> => {
    if (data.projectId === null) {
      throw new Error("Pilih project untuk task ini.");
    }

    const payload: TaskCreatePayload = {
      title: data.title.trim(),
      description: data.description.trim() || null,
      assigned_to: data.assignedTo,
    };

    setSaving(true);

    try {
      const task = await createTaskRequest(
        data.projectId,
        payload,
      );

      await loadTasks();

      return task;
    } catch (err) {
      throw new Error(
        err instanceof Error
          ? err.message
          : "Gagal membuat task.",
      );
    } finally {
      setSaving(false);
    }
  };

  const updateTask = async (
    taskId: number,
    payload: TaskUpdatePayload,
  ): Promise<Task> => {
    setSaving(true);

    try {
      const updated = await updateTaskRequest(taskId, payload);
      await loadTasks();

      return updated;
    } catch (err) {
      throw new Error(
        err instanceof Error
          ? err.message
          : "Gagal memperbarui task.",
      );
    } finally {
      setSaving(false);
    }
  };

  const claimTask = async (taskId: number): Promise<Task> => {
    setSaving(true);

    try {
      const updated = await claimTaskRequest(taskId);
      await loadTasks();

      return updated;
    } catch (err) {
      throw new Error(
        err instanceof Error
          ? err.message
          : "Gagal mengambil task.",
      );
    } finally {
      setSaving(false);
    }
  };

  const unclaimTask = async (taskId: number): Promise<Task> => {
    setSaving(true);

    try {
      const updated = await unclaimTaskRequest(taskId);
      await loadTasks();

      return updated;
    } catch (err) {
      throw new Error(
        err instanceof Error
          ? err.message
          : "Gagal melepas task.",
      );
    } finally {
      setSaving(false);
    }
  };

  const hasFilters =
    searchInput.trim().length > 0 ||
    statusFilter !== "ALL" ||
    projectFilter !== "ALL" ||
    workspaceFilter !== "ALL";

  return {
    tasks,
    projects: projectOptions,
    allProjects: projects,
    workspaces,
    manageableProjects,
    catalogLoaded,
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
  };
}
