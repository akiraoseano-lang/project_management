import { useCallback, useEffect, useState } from "react";

import {
  createWorkspace as createWorkspaceRequest,
  deleteWorkspace as deleteWorkspaceRequest,
  getWorkspaces,
  updateWorkspace as updateWorkspaceRequest,
} from "../services/workspaceService";

import type {
  Workspace,
  WorkspaceCreatePayload,
} from "../types/workspace";

const PAGE_SIZE = 12;
const SEARCH_DELAY = 350;

export function useWorkspace() {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, SEARCH_DELAY);

    return () => window.clearTimeout(timeoutId);
  }, [searchInput]);

  const loadWorkspaces = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await getWorkspaces({
        page,
        pageSize: PAGE_SIZE,
        search,
      });

      setWorkspaces(result.items);
      setTotal(result.total);
      setTotalPages(result.total_pages);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Gagal memuat workspace.",
      );
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => {
    void loadWorkspaces();
  }, [loadWorkspaces]);

  const createWorkspace = async (
    payload: WorkspaceCreatePayload,
  ): Promise<boolean> => {
    setCreating(true);
    setError(null);

    try {
      await createWorkspaceRequest(payload);

      setPage(1);

      const result = await getWorkspaces({
        page: 1,
        pageSize: PAGE_SIZE,
        search,
      });

      setWorkspaces(result.items);
      setTotal(result.total);
      setTotalPages(result.total_pages);

      return true;
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Gagal membuat workspace.",
      );

      return false;
    } finally {
      setCreating(false);
    }
  };

  const updateWorkspace = async (
    workspaceId: number,
    payload: WorkspaceCreatePayload,
  ): Promise<void> => {
    setError(null);

    try {
      await updateWorkspaceRequest(workspaceId, payload);
      await loadWorkspaces();
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Gagal memperbarui workspace.";

      setError(message);
      throw new Error(message);
    }
  };

  const deleteWorkspace = async (
    workspaceId: number,
  ): Promise<void> => {
    setError(null);

    try {
      await deleteWorkspaceRequest(workspaceId);

      if (workspaces.length === 1 && page > 1) {
        setPage((currentPage) => currentPage - 1);
        return;
      }

      await loadWorkspaces();
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Gagal menghapus workspace.";

      setError(message);
      throw new Error(message);
    }
  };

  return {
    workspaces,
    searchInput,
    setSearchInput,
    page,
    setPage,
    total,
    totalPages,
    loading,
    creating,
    error,
    reload: loadWorkspaces,
    createWorkspace,
    updateWorkspace,
    deleteWorkspace,
  };
}