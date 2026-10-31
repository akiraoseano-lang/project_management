import { useCallback, useState } from "react";

import {
  addProjectMember,
  leaveProject,
  removeProjectMember,
  requestJoinProject,
} from "../services/projectService";

export function useProjectMembers(
  projectId: number | null,
  onChanged?: () => void,
) {
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const runAction = useCallback(
    async (action: () => Promise<unknown>) => {
      if (projectId === null) {
        throw new Error("Project tidak ditemukan.");
      }

      setActionLoading(true);
      setActionError(null);

      try {
        await action();
        onChanged?.();
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : "Aksi project gagal dilakukan.";

        setActionError(message);
        throw new Error(message);
      } finally {
        setActionLoading(false);
      }
    },
    [projectId, onChanged],
  );

  const addMember = useCallback(
    (userId: number) =>
      runAction(() =>
        addProjectMember(projectId as number, userId),
      ),
    [runAction, projectId],
  );

  const removeMember = useCallback(
    (userId: number) =>
      runAction(() =>
        removeProjectMember(projectId as number, userId),
      ),
    [runAction, projectId],
  );

  const leave = useCallback(
    () => runAction(() => leaveProject(projectId as number)),
    [runAction, projectId],
  );

  const requestJoin = useCallback(
    () => runAction(() => requestJoinProject(projectId as number)),
    [runAction, projectId],
  );

  return {
    actionLoading,
    actionError,
    addMember,
    removeMember,
    leave,
    requestJoin,
  };
}
