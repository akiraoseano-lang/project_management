import { useCallback, useEffect, useState } from "react";

import {
  deleteProject as deleteProjectRequest,
  getProject,
  getProjectMembers,
  getProjectTasks,
  getProjectWorkspaceAnalytics,
  updateProject as updateProjectRequest,
} from "../services/projectService";

import type {
  Project,
  ProjectMemberSummary,
  ProjectUpdatePayload,
} from "../types/project";

import type {
  TaskStatusFilter,
  WorkspaceAnalytics,
  WorkspaceProjectSummary,
  WorkspaceTaskSummary,
} from "../types/workspace";

const TASK_PAGE_SIZE = 8;

export function useProjectDetail(projectId: number | null) {
  const [project, setProject] = useState<Project | null>(null);
  const [analytics, setAnalytics] =
    useState<WorkspaceAnalytics | null>(null);
  const [summary, setSummary] =
    useState<WorkspaceProjectSummary | null>(null);
  const [members, setMembers] = useState<ProjectMemberSummary[]>([]);

  const [tasks, setTasks] = useState<WorkspaceTaskSummary[]>([]);
  const [statusFilter, setStatusFilterState] =
    useState<TaskStatusFilter>("ALL");
  const [page, setPageState] = useState(1);
  const [totalTasks, setTotalTasks] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  const [loading, setLoading] = useState(true);
  const [tasksLoading, setTasksLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tasksError, setTasksError] = useState<string | null>(null);

  const loadProject = useCallback(async () => {
    if (projectId === null) {
      setProject(null);
      setAnalytics(null);
      setSummary(null);
      setMembers([]);
      setError("Project tidak ditemukan.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const projectData = await getProject(projectId);

      const [analyticsData, memberResult] = await Promise.all([
        getProjectWorkspaceAnalytics(projectData.workspace_id),
        getProjectMembers(projectId).catch(() => null),
      ]);

      const projectSummary =
        analyticsData.projects.find(
          (item) => item.id === projectData.id,
        ) ?? null;

      const workspaceMemberMap = new Map(
        analyticsData.members.map((member) => [
          member.user_id,
          member,
        ]),
      );

      const projectMembers: ProjectMemberSummary[] = (
        memberResult?.items ?? []
      ).map((member) => {
        const workspaceMember = workspaceMemberMap.get(
          member.user_id,
        );

        return {
          ...member,
          name:
            workspaceMember?.name ?? `User #${member.user_id}`,
          email: workspaceMember?.email ?? "",
          role: workspaceMember?.role ?? null,
        };
      });

      setProject(projectData);
      setAnalytics(analyticsData);
      setSummary(projectSummary);
      setMembers(projectMembers);
    } catch (err) {
      setProject(null);
      setAnalytics(null);
      setSummary(null);
      setMembers([]);
      setError(
        err instanceof Error
          ? err.message
          : "Gagal memuat detail project.",
      );
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    void loadProject();
  }, [loadProject]);

  const workspaceId = project?.workspace_id ?? null;
  const resolvedProjectId = project?.id ?? null;

  const loadTasks = useCallback(async () => {
    if (workspaceId === null || resolvedProjectId === null) {
      setTasks([]);
      setTotalTasks(0);
      setTotalPages(0);
      setTasksLoading(false);
      return;
    }

    setTasksLoading(true);
    setTasksError(null);

    try {
      const result = await getProjectTasks(
        workspaceId,
        resolvedProjectId,
        {
          page,
          pageSize: TASK_PAGE_SIZE,
          status: statusFilter,
        },
      );

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
          : "Gagal memuat task project.",
      );
    } finally {
      setTasksLoading(false);
    }
  }, [workspaceId, resolvedProjectId, page, statusFilter]);

  useEffect(() => {
    void loadTasks();
  }, [loadTasks]);

  const setStatusFilter = (status: TaskStatusFilter) => {
    setStatusFilterState(status);
    setPageState(1);
  };

  const setPage = (nextPage: number) => {
    setPageState(Math.max(1, nextPage));
  };

  const updateProject = async (
    payload: ProjectUpdatePayload,
  ): Promise<void> => {
    if (!project) {
      throw new Error("Project tidak ditemukan.");
    }

    setSaving(true);

    try {
      const updated = await updateProjectRequest(project.id, payload);
      setProject(updated);
      await loadProject();
    } catch (err) {
      throw new Error(
        err instanceof Error
          ? err.message
          : "Gagal memperbarui project.",
      );
    } finally {
      setSaving(false);
    }
  };

  const deleteProject = async (): Promise<void> => {
    if (!project) {
      throw new Error("Project tidak ditemukan.");
    }

    setSaving(true);

    try {
      await deleteProjectRequest(project.id);
    } catch (err) {
      throw new Error(
        err instanceof Error
          ? err.message
          : "Gagal menghapus project.",
      );
    } finally {
      setSaving(false);
    }
  };

  const reload = () => {
    void loadProject();

    if (workspaceId !== null && resolvedProjectId !== null) {
      void loadTasks();
    }
  };

  return {
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
  };
}
