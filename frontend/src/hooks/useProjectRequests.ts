import { useCallback, useEffect, useState } from "react";

import {
  approveJoinRequest,
  getProjectJoinRequests,
  getProjectRequests,
  rejectJoinRequest,
} from "../services/projectService";

import type {
  ProjectJoinRequest,
  ProjectRequest,
} from "../types/project";

export function useProjectRequests(
  projectId: number | null,
  enabled: boolean,
) {
  const [joinRequests, setJoinRequests] = useState<
    ProjectJoinRequest[]
  >([]);
  const [projectRequests, setProjectRequests] = useState<
    ProjectRequest[]
  >([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actingId, setActingId] = useState<number | null>(null);

  const load = useCallback(async () => {
    if (projectId === null || !enabled) {
      setJoinRequests([]);
      setProjectRequests([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const [joinResult, requestResult] = await Promise.all([
        getProjectJoinRequests(projectId),
        getProjectRequests(projectId),
      ]);

      setJoinRequests(joinResult.items);
      setProjectRequests(requestResult.items);
    } catch (err) {
      setJoinRequests([]);
      setProjectRequests([]);
      setError(
        err instanceof Error
          ? err.message
          : "Gagal memuat permintaan project.",
      );
    } finally {
      setLoading(false);
    }
  }, [projectId, enabled]);

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

  const approveJoin = useCallback(
    (requestId: number) =>
      runAction(requestId, () => approveJoinRequest(requestId)),
    [runAction],
  );

  const rejectJoin = useCallback(
    (requestId: number) =>
      runAction(requestId, () => rejectJoinRequest(requestId)),
    [runAction],
  );

  return {
    joinRequests,
    projectRequests,
    loading,
    error,
    actingId,
    reload: load,
    approveJoin,
    rejectJoin,
  };
}
