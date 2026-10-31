import { useState } from "react";
import {
  CheckCircle2,
  ClipboardCheck,
  FolderPlus,
  LoaderCircle,
  ShieldAlert,
  UserCog,
  UserMinus,
  UserPlus,
  XCircle,
} from "lucide-react";

import ConfirmDeleteModal from "../../common/ConfirmDeleteModal";

import { useWorkspaceRequests } from "../../../hooks/useWorkspaceRequests";

import { formatProjectDate } from "../../../utils/project";

import type {
  WorkspaceMemberSummary,
  WorkspaceRequest,
  WorkspaceRole,
} from "../../../types/workspace";
import type { ProjectRequest } from "../../../types/project";

import styles from "./WorkspaceRequestsPanel.module.css";

interface WorkspaceRequestsPanelProps {
  workspaceId: number;
  role: WorkspaceRole;
  members: WorkspaceMemberSummary[];
  onChanged?: () => void;
}

type Notice = {
  tone: "success" | "error";
  message: string;
};

type RejectTarget =
  | { kind: "workspace"; id: number; label: string }
  | { kind: "project"; id: number; label: string };

const ACTION_LABELS: Record<WorkspaceRequest["action"], string> = {
  JOIN: "Permintaan join",
  REMOVE_MEMBER: "Penghapusan member",
  CHANGE_ROLE: "Perubahan role",
  UPDATE_WORKSPACE: "Pembaruan workspace",
};

const STATUS_LABELS: Record<string, string> = {
  PENDING: "Menunggu",
  APPROVED: "Disetujui",
  REJECTED: "Ditolak",
};

function getStatusClass(status: string) {
  if (status === "APPROVED") return styles.statusApproved;
  if (status === "REJECTED") return styles.statusRejected;
  return styles.statusPending;
}

function getActionIcon(action: WorkspaceRequest["action"]) {
  switch (action) {
    case "JOIN":
      return <UserPlus size={15} />;
    case "REMOVE_MEMBER":
      return <UserMinus size={15} />;
    case "CHANGE_ROLE":
      return <UserCog size={15} />;
    default:
      return <ShieldAlert size={15} />;
  }
}

export default function WorkspaceRequestsPanel({
  workspaceId,
  role,
  members,
  onChanged,
}: WorkspaceRequestsPanelProps) {
  const isOwner = role === "OWNER";

  const {
    workspaceRequests,
    projectRequests,
    loading,
    error,
    actingId,
    approveWorkspace,
    rejectWorkspace,
    approveProject,
    rejectProject,
  } = useWorkspaceRequests(workspaceId, isOwner);

  const [notice, setNotice] = useState<Notice | null>(null);
  const [rejectTarget, setRejectTarget] =
    useState<RejectTarget | null>(null);

  if (!isOwner) return null;

  const memberNames = new Map(
    members.map((member) => [member.user_id, member.name]),
  );

  const pendingWorkspaceCount = workspaceRequests.filter(
    (request) => request.status === "PENDING",
  ).length;

  const creationRequests = projectRequests.filter(
    (request) => request.action === "CREATE",
  );

  const pendingProjectCount = creationRequests.filter(
    (request) => request.status === "PENDING",
  ).length;

  const runAction = async (
    message: string,
    action: () => Promise<unknown>,
  ) => {
    setNotice(null);

    try {
      await action();
      onChanged?.();
      setNotice({ tone: "success", message });
    } catch (err) {
      setNotice({
        tone: "error",
        message:
          err instanceof Error
            ? err.message
            : "Gagal memproses permintaan.",
      });
    }
  };

  const handleApproveWorkspace = (request: WorkspaceRequest) => {
    const targetName =
      request.action === "JOIN"
        ? request.requester_name ?? `User #${request.requested_by}`
        : request.target_user_id
          ? request.target_user_name ??
            memberNames.get(request.target_user_id) ??
            `User #${request.target_user_id}`
          : "workspace";

    const successMessage =
      request.action === "JOIN"
        ? `Permintaan join dari ${targetName} disetujui.`
        : request.action === "UPDATE_WORKSPACE"
          ? "Pembaruan workspace disetujui."
          : `Permintaan ${ACTION_LABELS[
              request.action
            ].toLowerCase()} untuk ${targetName} disetujui.`;

    void runAction(successMessage, () => approveWorkspace(request.id));
  };

  const handleApproveProject = (request: ProjectRequest) => {
    void runAction(
      `Project ${request.project_name} berhasil disetujui dan diaktifkan.`,
      () => approveProject(request.id),
    );
  };

  const handleConfirmReject = async () => {
    if (!rejectTarget) return;

    if (rejectTarget.kind === "workspace") {
      await rejectWorkspace(rejectTarget.id);
      setNotice({
        tone: "success",
        message: "Permintaan workspace ditolak.",
      });
    } else {
      await rejectProject(rejectTarget.id);
      setNotice({
        tone: "success",
        message: "Pengajuan project ditolak.",
      });
    }

    onChanged?.();
    setRejectTarget(null);
  };

  const renderWorkspaceRequest = (request: WorkspaceRequest) => {
    const targetName = request.target_user_id
      ? request.target_user_name ??
        memberNames.get(request.target_user_id) ??
        `User #${request.target_user_id}`
      : null;

    const requesterName =
      request.requester_name ??
      memberNames.get(request.requested_by) ??
      `User #${request.requested_by}`;

    const newRole =
      typeof request.payload?.new_role === "string"
        ? request.payload.new_role
        : null;

    const isPending = request.status === "PENDING";
    const isActing = actingId === request.id;

    return (
      <article className={styles.requestCard} key={request.id}>
        <div className={styles.requestTop}>
          <div className={styles.requestIcon}>
            {getActionIcon(request.action)}
          </div>

          <div className={styles.requestDetails}>
            <h4>{ACTION_LABELS[request.action]}</h4>
            <p>
              {request.action === "JOIN"
                ? "Meminta bergabung ke workspace ini"
                : targetName
                  ? `Target: ${targetName}`
                  : "Perubahan pada workspace"}
              {newRole ? ` · Role baru: ${newRole}` : ""}
            </p>
          </div>

          <span
            className={`${styles.statusBadge} ${getStatusClass(
              request.status,
            )}`}
          >
            {STATUS_LABELS[request.status] ?? request.status}
          </span>
        </div>

        <div className={styles.requestMeta}>
          <span>
            Diajukan oleh <strong>{requesterName}</strong>
            {request.requester_email
              ? ` · ${request.requester_email}`
              : ""}
          </span>
          <span>{formatProjectDate(request.created_at)}</span>
        </div>

        {isPending && (
          <div className={styles.actionButtons}>
            <button
              type="button"
              className={styles.approveButton}
              disabled={actingId !== null}
              onClick={() => handleApproveWorkspace(request)}
            >
              {isActing ? (
                <LoaderCircle size={14} className={styles.spinner} />
              ) : (
                <CheckCircle2 size={14} />
              )}
              Setujui
            </button>

            <button
              type="button"
              className={styles.rejectButton}
              disabled={actingId !== null}
              onClick={() =>
                setRejectTarget({
                  kind: "workspace",
                  id: request.id,
                  label: ACTION_LABELS[request.action],
                })
              }
            >
              <XCircle size={14} />
              Tolak
            </button>
          </div>
        )}
      </article>
    );
  };

  const renderProjectRequest = (request: ProjectRequest) => {
    const isPending = request.status === "PENDING";
    const isActing = actingId === request.id;

    return (
      <article className={styles.requestCard} key={request.id}>
        <div className={styles.requestTop}>
          <div className={`${styles.requestIcon} ${styles.projectIcon}`}>
            <FolderPlus size={15} />
          </div>

          <div className={styles.requestDetails}>
            <h4>{request.project_name}</h4>
            <p>
              Diajukan oleh {request.requester_name} ·{" "}
              {request.requester_email}
            </p>
          </div>

          <span
            className={`${styles.statusBadge} ${getStatusClass(
              request.status,
            )}`}
          >
            {STATUS_LABELS[request.status] ?? request.status}
          </span>
        </div>

        <div className={styles.requestMeta}>
          <span>
            <ClipboardCheck size={13} />
            Pengajuan pembuatan project
          </span>
          <span>{formatProjectDate(request.created_at)}</span>
        </div>

        {isPending && (
          <div className={styles.actionButtons}>
            <button
              type="button"
              className={styles.approveButton}
              disabled={actingId !== null}
              onClick={() => handleApproveProject(request)}
            >
              {isActing ? (
                <LoaderCircle size={14} className={styles.spinner} />
              ) : (
                <CheckCircle2 size={14} />
              )}
              Setujui
            </button>

            <button
              type="button"
              className={styles.rejectButton}
              disabled={actingId !== null}
              onClick={() =>
                setRejectTarget({
                  kind: "project",
                  id: request.id,
                  label: request.project_name,
                })
              }
            >
              <XCircle size={14} />
              Tolak
            </button>
          </div>
        )}
      </article>
    );
  };

  return (
    <section className={styles.panel}>
      <div className={styles.panelHeader}>
        <div>
          <h2>Permintaan & Persetujuan</h2>
          <p>
            Tinjau permintaan join, permintaan dari admin workspace, dan
            pengajuan project dari anggota.
          </p>
        </div>

        <div className={styles.headerCounts}>
          <span className={styles.panelCount}>
            {pendingWorkspaceCount} workspace
          </span>
          <span className={styles.panelCount}>
            {pendingProjectCount} project
          </span>
        </div>
      </div>

      {notice && (
        <div
          className={`${styles.notice} ${
            notice.tone === "success"
              ? styles.noticeSuccess
              : styles.noticeError
          }`}
          role="status"
        >
          {notice.tone === "success" ? (
            <CheckCircle2 size={16} />
          ) : (
            <XCircle size={16} />
          )}
          <p>{notice.message}</p>
          <button
            type="button"
            onClick={() => setNotice(null)}
            aria-label="Tutup notifikasi"
          >
            ×
          </button>
        </div>
      )}

      {error && (
        <div className={`${styles.notice} ${styles.noticeError}`} role="alert">
          <XCircle size={16} />
          <p>{error}</p>
        </div>
      )}

      {loading ? (
        <div className={styles.state}>
          <LoaderCircle size={20} className={styles.spinner} />
          <span>Memuat permintaan...</span>
        </div>
      ) : (
        <div className={styles.sections}>
          <div className={styles.section}>
            <div className={styles.sectionHeading}>
              <h3>Permintaan workspace</h3>
              <span>{workspaceRequests.length} permintaan</span>
            </div>

            {workspaceRequests.length === 0 ? (
              <div className={styles.empty}>
                <ClipboardCheck size={20} />
                <p>Belum ada permintaan workspace.</p>
              </div>
            ) : (
              <div className={styles.requestList}>
                {workspaceRequests.map(renderWorkspaceRequest)}
              </div>
            )}
          </div>

          <div className={styles.section}>
            <div className={styles.sectionHeading}>
              <h3>Pengajuan project</h3>
              <span>{creationRequests.length} pengajuan</span>
            </div>

            {creationRequests.length === 0 ? (
              <div className={styles.empty}>
                <FolderPlus size={20} />
                <p>Belum ada pengajuan project baru.</p>
              </div>
            ) : (
              <div className={styles.requestList}>
                {creationRequests.map(renderProjectRequest)}
              </div>
            )}
          </div>
        </div>
      )}

      <ConfirmDeleteModal
        open={rejectTarget !== null}
        title="Tolak permintaan?"
        description={
          <>
            Permintaan <strong>{rejectTarget?.label}</strong> akan
            ditolak dan tidak dapat diproses lagi.
          </>
        }
        confirmLabel="Tolak"
        onClose={() => setRejectTarget(null)}
        onConfirm={handleConfirmReject}
      />
    </section>
  );
}
