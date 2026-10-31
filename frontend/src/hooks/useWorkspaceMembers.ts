import { useCallback, useState } from "react";

import {
  addWorkspaceMember,
  createWorkspaceRequest,
  leaveWorkspace,
  removeWorkspaceMember,
  updateWorkspaceMemberRole,
} from "../services/workspaceService";

import type { WorkspaceRequestPayload } from "../types/workspace";

export function useWorkspaceMembers(
  workspaceId: number | null,
  onChanged?: () => void,
) {
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const runAction = useCallback(
    async (action: () => Promise<unknown>) => {
      if (workspaceId === null) {
        throw new Error("Workspace tidak ditemukan.");
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
            : "Aksi workspace gagal dilakukan.";

        setActionError(message);
        throw new Error(message);
      } finally {
        setActionLoading(false);
      }
    },
    [workspaceId, onChanged],
  );

  const addMember = useCallback(
    (userId: number) =>
      runAction(() =>
        addWorkspaceMember(workspaceId as number, userId),
      ),
    [runAction, workspaceId],
  );

  const removeMember = useCallback(
    (userId: number) =>
      runAction(() =>
        removeWorkspaceMember(workspaceId as number, userId),
      ),
    [runAction, workspaceId],
  );

  const leave = useCallback(
    () => runAction(() => leaveWorkspace(workspaceId as number)),
    [runAction, workspaceId],
  );

  const updateRole = useCallback(
    (userId: number, role: "ADMIN" | "COLLABORATOR") =>
      runAction(() =>
        updateWorkspaceMemberRole(
          workspaceId as number,
          userId,
          role,
        ),
      ),
    [runAction, workspaceId],
  );

  const requestAction = useCallback(
    (payload: WorkspaceRequestPayload) =>
      runAction(() =>
        createWorkspaceRequest(workspaceId as number, payload),
      ),
    [runAction, workspaceId],
  );

  return {
    actionLoading,
    actionError,
    addMember,
    removeMember,
    leave,
    updateRole,
    requestAction,
  };
}
