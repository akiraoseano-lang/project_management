import { useCallback, useEffect, useState } from "react";

import {
  approveWorkspaceRequest,
  getWorkspaceRequests,
  rejectWorkspaceRequest,
} from "../services/workspaceService";

import {
  approveProjectRequest,
  getWorkspaceProjectRequests,
  rejectProjectRequest,
} from "../services/projectService";

import type { WorkspaceRequest } from "../types/workspace";
import type { ProjectRequest } from "../types/project";

export function useWorkspaceRequests(
  workspaceId: number | null,
  enabled: boolean,
) {
  const [workspaceRequests, setWorkspaceRequests] = useState<
    WorkspaceRequest[]
  >([]);
  const [projectRequests, setProjectRequests] = useState<
    ProjectRequest[]
  >([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actingId, setActingId] = useState<number | null>(null);

  const load = useCallback(async () => {
    if (workspaceId === null || !enabled) {
      setWorkspaceRequests([]);
      setProjectRequests([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const [workspaceResult, projectResult] = await Promise.all([
        getWorkspaceRequests(workspaceId),
        getWorkspaceProjectRequests(workspaceId),
      ]);

      setWorkspaceRequests(workspaceResult.items);
      setProjectRequests(projectResult.items);
    } catch (err) {
      setWorkspaceRequests([]);
      setProjectRequests([]);
      setError(
        err instanceof Error
          ? err.message
          : "Gagal memuat permintaan.",
      );
    } finally {
      setLoading(false);
    }
  }, [workspaceId, enabled]);

  useEffect(() => {
    void load();
  }, [load]);

  const runAction = useCallback(
    async (requestId: number, action: () => Promise<unknown>) => {
      setActingId(requestId);
      setError(null);

      try {
        await action();
        await load();
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : "Gagal memproses permintaan.";

        setError(message);
        throw new Error(message);
      } finally {
        setActingId(null);
      }
    },
    [load],
  );

  const approveWorkspace = useCallback(
    (requestId: number) =>
      runAction(requestId, () =>
        approveWorkspaceRequest(workspaceId as number, requestId),
      ),
    [runAction, workspaceId],
  );

  const rejectWorkspace = useCallback(
    (requestId: number) =>
      runAction(requestId, () =>
        rejectWorkspaceRequest(workspaceId as number, requestId),
      ),
    [runAction, workspaceId],
  );

  const approveProject = useCallback(
    (requestId: number) =>
      runAction(requestId, () =>
        approveProjectRequest(requestId),
      ),
    [runAction],
  );

  const rejectProject = useCallback(
    (requestId: number) =>
      runAction(requestId, () =>
        rejectProjectRequest(requestId),
      ),
    [runAction],
  );

  return {
    workspaceRequests,
    projectRequests,
    loading,
    error,
    actingId,
    reload: load,
    approveWorkspace,
    rejectWorkspace,
    approveProject,
    rejectProject,
  };
}
