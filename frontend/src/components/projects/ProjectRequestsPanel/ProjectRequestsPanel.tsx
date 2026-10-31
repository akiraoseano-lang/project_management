import { useState } from "react";
import {
  CheckCircle2,
  ClipboardList,
  LoaderCircle,
  LogIn,
  UserCheck,
  XCircle,
} from "lucide-react";

import ConfirmDeleteModal from "../../common/ConfirmDeleteModal";

import { useProjectRequests } from "../../../hooks/useProjectRequests";

import { formatProjectDate, getInitials } from "../../../utils/project";

import type { ProjectJoinRequest } from "../../../types/project";

import styles from "./ProjectRequestsPanel.module.css";

interface ProjectRequestsPanelProps {
  projectId: number;
  projectOwnerId: number;
  currentUserId?: number;
  onChanged?: () => void;
}

type Notice = {
  tone: "success" | "error";
  message: string;
};

const STATUS_LABELS: Record<string, string> = {
  PENDING: "Menunggu",
  APPROVED: "Disetujui",
  REJECTED: "Ditolak",
};

const ACTION_LABELS: Record<string, string> = {
  CREATE: "Pembuatan project",
  JOIN: "Permintaan join",
};

function getStatusClass(status: string) {
  if (status === "APPROVED") return styles.statusApproved;
  if (status === "REJECTED") return styles.statusRejected;
  return styles.statusPending;
}

export default function ProjectRequestsPanel({
  projectId,
  projectOwnerId,
  currentUserId,
  onChanged,
}: ProjectRequestsPanelProps) {
  const isOwner = currentUserId === projectOwnerId;

  const {
    joinRequests,
    projectRequests,
    loading,
    error,
    actingId,
    approveJoin,
    rejectJoin,
  } = useProjectRequests(projectId, isOwner);

  const [notice, setNotice] = useState<Notice | null>(null);
  const [rejectTarget, setRejectTarget] =
    useState<ProjectJoinRequest | null>(null);

  if (!isOwner) return null;

  const history = projectRequests.filter(
    (request) =>
      !(request.action === "JOIN" && request.status === "PENDING"),
  );

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

  const handleApprove = (request: ProjectJoinRequest) => {
    void runAction(
      `${request.name} berhasil ditambahkan ke project.`,
      () => approveJoin(request.id),
    );
  };

  const handleConfirmReject = async () => {
    if (!rejectTarget) return;

    await rejectJoin(rejectTarget.id);
    setNotice({
      tone: "success",
      message: `Permintaan join ${rejectTarget.name} ditolak.`,
    });
    onChanged?.();
    setRejectTarget(null);
  };

  return (
    <section className={styles.panel}>
      <div className={styles.panelHeader}>
        <div>
          <h2>Permintaan Project</h2>
          <p>
            Setujui permintaan join dan lihat riwayat pengajuan project.
          </p>
        </div>

        <div className={styles.headerCounts}>
          <span className={styles.panelCount}>
            {joinRequests.length} join
          </span>
          <span className={styles.panelCount}>
            {history.length} riwayat
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
          <span>Memuat permintaan project...</span>
        </div>
      ) : (
        <div className={styles.sections}>
          <div className={styles.section}>
            <div className={styles.sectionHeading}>
              <h3>Permintaan join</h3>
              <span>{joinRequests.length} menunggu</span>
            </div>

            {joinRequests.length === 0 ? (
              <div className={styles.empty}>
                <UserCheck size={20} />
                <p>Belum ada permintaan join.</p>
              </div>
            ) : (
              <div className={styles.requestList}>
                {joinRequests.map((request) => {
                  const isActing = actingId === request.id;

                  return (
                    <article
                      className={styles.requestCard}
                      key={request.id}
                    >
                      <div className={styles.requestTop}>
                        <span className={styles.avatar}>
                          {getInitials(request.name)}
                        </span>

                        <div className={styles.requestDetails}>
                          <h4>{request.name}</h4>
                          <p>{request.email}</p>
                        </div>

                        <span
                          className={`${styles.statusBadge} ${styles.statusPending}`}
                        >
                          Menunggu
                        </span>
                      </div>

                      <div className={styles.requestMeta}>
                        <span>
                          <LogIn size={13} />
                          Ingin bergabung ke project
                        </span>
                        <span>{formatProjectDate(request.created_at)}</span>
                      </div>

                      <div className={styles.actionButtons}>
                        <button
                          type="button"
                          className={styles.approveButton}
                          disabled={actingId !== null}
                          onClick={() => handleApprove(request)}
                        >
                          {isActing ? (
                            <LoaderCircle
                              size={14}
                              className={styles.spinner}
                            />
                          ) : (
                            <CheckCircle2 size={14} />
                          )}
                          Setujui
                        </button>

                        <button
                          type="button"
                          className={styles.rejectButton}
                          disabled={actingId !== null}
                          onClick={() => setRejectTarget(request)}
                        >
                          <XCircle size={14} />
                          Tolak
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </div>

          <div className={styles.section}>
            <div className={styles.sectionHeading}>
              <h3>Riwayat permintaan</h3>
              <span>{history.length} riwayat</span>
            </div>

            {history.length === 0 ? (
              <div className={styles.empty}>
                <ClipboardList size={20} />
                <p>Belum ada riwayat permintaan.</p>
              </div>
            ) : (
              <div className={styles.requestList}>
                {history.map((request) => (
                  <article
                    className={styles.requestCard}
                    key={request.id}
                  >
                    <div className={styles.requestTop}>
                      <div className={styles.requestIcon}>
                        <ClipboardList size={15} />
                      </div>

                      <div className={styles.requestDetails}>
                        <h4>
                          {ACTION_LABELS[request.action] ??
                            request.action}
                        </h4>
                        <p>
                          {request.requester_name} ·{" "}
                          {request.requester_email}
                        </p>
                      </div>

                      <span
                        className={`${styles.statusBadge} ${getStatusClass(
                          request.status,
                        )}`}
                      >
                        {STATUS_LABELS[request.status] ??
                          request.status}
                      </span>
                    </div>

                    <div className={styles.requestMeta}>
                      <span>
                        {request.reviewer_name
                          ? `Ditinjau oleh ${request.reviewer_name}`
                          : "Belum ditinjau"}
                      </span>
                      <span>
                        {formatProjectDate(
                          request.reviewed_at ?? request.created_at,
                        )}
                      </span>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      <ConfirmDeleteModal
        open={rejectTarget !== null}
        title="Tolak permintaan join?"
        description={
          <>
            Permintaan join dari{" "}
            <strong>{rejectTarget?.name}</strong> akan ditolak.
          </>
        }
        confirmLabel="Tolak"
        onClose={() => setRejectTarget(null)}
        onConfirm={handleConfirmReject}
      />
    </section>
  );
}
