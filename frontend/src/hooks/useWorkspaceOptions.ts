import { useCallback, useEffect, useState } from "react";

import { getAllWorkspaces } from "../services/workspaceService";

import type { Workspace } from "../types/workspace";

export function useWorkspaceOptions() {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await getAllWorkspaces();
      setWorkspaces(result);
    } catch (err) {
      setWorkspaces([]);
      setError(
        err instanceof Error
          ? err.message
          : "Gagal memuat daftar workspace.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return {
    workspaces,
    loading,
    error,
    reload: load,
  };
}
