import { useCallback, useEffect, useMemo, useState } from "react";

import {
  createProject as createProjectRequest,
  deleteProject as deleteProjectRequest,
  getProjectCatalog,
  updateProject as updateProjectRequest,
} from "../services/projectService";

import { getProjectHealth } from "../utils/project";

import type {
  Project,
  ProjectFormData,
  ProjectHealth,
  ProjectListItem,
  ProjectUpdatePayload,
  ProjectWorkspaceOption,
} from "../types/project";

const PAGE_SIZE = 9;
const SEARCH_DELAY = 350;

export function useProjects() {
  const [projects, setProjects] = useState<ProjectListItem[]>([]);
  const [workspaces, setWorkspaces] = useState<
    ProjectWorkspaceOption[]
  >([]);

  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");

  const [workspaceFilter, setWorkspaceFilterState] = useState<
    number | "ALL"
  >("ALL");
  const [healthFilter, setHealthFilterState] =
    useState<ProjectHealth>("ALL");

  const [page, setPage] = useState(1);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, SEARCH_DELAY);

    return () => window.clearTimeout(timeoutId);
  }, [searchInput]);

  const loadProjects = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await getProjectCatalog();

      setProjects(result.projects);
      setWorkspaces(result.workspaces);
    } catch (err) {
      setProjects([]);
      setWorkspaces([]);
      setError(
        err instanceof Error
          ? err.message
          : "Gagal memuat project.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadProjects();
  }, [loadProjects]);

  const filteredProjects = useMemo(() => {
    const term = search.toLowerCase();

    return projects.filter((project) => {
      if (
        workspaceFilter !== "ALL" &&
        project.workspace_id !== workspaceFilter
      ) {
        return false;
      }

      if (
        healthFilter !== "ALL" &&
        getProjectHealth(project) !== healthFilter
      ) {
        return false;
      }

      if (!term) return true;

      return (
        project.name.toLowerCase().includes(term) ||
        (project.description ?? "").toLowerCase().includes(term) ||
        project.workspace_name.toLowerCase().includes(term) ||
        (project.owner_name ?? "").toLowerCase().includes(term)
      );
    });
  }, [projects, search, workspaceFilter, healthFilter]);

  const totalFiltered = filteredProjects.length;
  const totalPages = Math.ceil(totalFiltered / PAGE_SIZE);

  useEffect(() => {
    if (totalPages === 0 && page !== 1) {
      setPage(1);
    } else if (totalPages > 0 && page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  const visibleProjects = useMemo(() => {
    const offset = (page - 1) * PAGE_SIZE;
    return filteredProjects.slice(offset, offset + PAGE_SIZE);
  }, [filteredProjects, page]);

  const setWorkspaceFilter = (value: number | "ALL") => {
    setWorkspaceFilterState(value);
    setPage(1);
  };

  const setHealthFilter = (value: ProjectHealth) => {
    setHealthFilterState(value);
    setPage(1);
  };

  const createProject = async (
    data: ProjectFormData,
  ): Promise<Project> => {
    if (data.workspaceId === null) {
      throw new Error("Pilih workspace untuk project ini.");
    }

    setSaving(true);

    try {
      const project = await createProjectRequest(data.workspaceId, {
        name: data.name.trim(),
        description: data.description.trim() || null,
      });

      await loadProjects();

      return project;
    } catch (err) {
      throw new Error(
        err instanceof Error
          ? err.message
          : "Gagal membuat project.",
      );
    } finally {
      setSaving(false);
    }
  };

  const updateProject = async (
    projectId: number,
    payload: ProjectUpdatePayload,
  ): Promise<void> => {
    setSaving(true);

    try {
      await updateProjectRequest(projectId, payload);
      await loadProjects();
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

  const deleteProject = async (
    projectId: number,
  ): Promise<void> => {
    setSaving(true);

    try {
      await deleteProjectRequest(projectId);
      await loadProjects();
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

  const manageableWorkspaces = useMemo(
    () =>
      workspaces.filter(
        (workspace) =>
          workspace.role === "OWNER" ||
          workspace.role === "ADMIN",
      ),
    [workspaces],
  );

  return {
    projects: visibleProjects,
    workspaces,
    manageableWorkspaces,
    searchInput,
    setSearchInput,
    workspaceFilter,
    setWorkspaceFilter,
    healthFilter,
    setHealthFilter,
    page,
    setPage,
    total: totalFiltered,
    totalPages,
    loading,
    saving,
    error,
    reload: loadProjects,
    createProject,
    updateProject,
    deleteProject,
  };
}
