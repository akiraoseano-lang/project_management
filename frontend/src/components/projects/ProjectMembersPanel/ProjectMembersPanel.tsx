import { useState } from "react";
import {
  CheckCircle2,
  LogOut,
  Send,
  ShieldCheck,
  Trash2,
  UserPlus,
  Users,
  XCircle,
} from "lucide-react";

import ActionMenu from "../../common/ActionMenu";
import ConfirmDeleteModal from "../../common/ConfirmDeleteModal";
import MemberPickerModal from "../../common/MemberPickerModal";

import type { ActionMenuItem } from "../../common/ActionMenu";

import { useProjectMembers } from "../../../hooks/useProjectMembers";

import { getInitials } from "../../../utils/project";

import type { ProjectMemberSummary } from "../../../types/project";
import type {
  WorkspaceMemberSummary,
  WorkspaceRole,
} from "../../../types/workspace";

import styles from "./ProjectMembersPanel.module.css";

interface ProjectMembersPanelProps {
  projectId: number;
  projectOwnerId: number;
  currentUserId?: number;
  workspaceRole: WorkspaceRole;
  members: ProjectMemberSummary[];
  workspaceMembers: WorkspaceMemberSummary[];
  onChanged: () => void;
  onLeft?: () => void;
}

type Notice = {
  tone: "success" | "error";
  message: string;
};

type RemoveTarget = {
  userId: number;
  name: string;
};

const ROLE_LABELS: Record<string, string> = {
  OWNER: "Owner",
  ADMIN: "Admin",
  COLLABORATOR: "Collaborator",
};

export default function ProjectMembersPanel({
  projectId,
  projectOwnerId,
  currentUserId,
  workspaceRole,
  members,
  workspaceMembers,
  onChanged,
  onLeft,
}: ProjectMembersPanelProps) {
  const { actionLoading, addMember, removeMember, leave, requestJoin } =
    useProjectMembers(projectId, onChanged);

  const [pickerOpen, setPickerOpen] = useState(false);
  const [removeTarget, setRemoveTarget] =
    useState<RemoveTarget | null>(null);
  const [leaveOpen, setLeaveOpen] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);

  const isProjectOwner = currentUserId === projectOwnerId;
  const isWorkspaceManager =
    workspaceRole === "OWNER" || workspaceRole === "ADMIN";
  const canAddMember = isWorkspaceManager;
  const isMember = members.some(
    (member) => member.user_id === currentUserId,
  );
  const canLeave = isMember && !isProjectOwner;
  const canRequestJoin = !isMember && !isProjectOwner;

  const memberIds = new Set(members.map((member) => member.user_id));

  const candidates = workspaceMembers
    .filter((member) => !memberIds.has(member.user_id))
    .map((member) => ({
      id: member.user_id,
      name: member.name,
      email: member.email,
    }));

  const handleAdd = async (userId: number) => {
    await addMember(userId);
    setNotice({
      tone: "success",
      message: "Member berhasil ditambahkan ke project.",
    });
  };

  const handleRemove = async () => {
    if (!removeTarget) return;

    await removeMember(removeTarget.userId);
    setNotice({
      tone: "success",
      message: "Member berhasil dikeluarkan dari project.",
    });
    setRemoveTarget(null);
  };

  const handleLeave = async () => {
    await leave();
    setLeaveOpen(false);
    setNotice({
      tone: "success",
      message: "Kamu telah keluar dari project.",
    });
    onLeft?.();
  };

  const handleRequestJoin = async () => {
    setNotice(null);

    try {
      await requestJoin();
      setNotice({
        tone: "success",
        message:
          "Permintaan join dikirim. Tunggu persetujuan owner project.",
      });
    } catch (err) {
      setNotice({
        tone: "error",
        message:
          err instanceof Error
            ? err.message
            : "Gagal mengirim permintaan join.",
      });
    }
  };

  return (
    <section className={styles.panel}>
      <div className={styles.panelHeader}>
        <div>
          <h2>Project Members</h2>
          <p>Orang-orang yang tergabung di project ini.</p>
        </div>

        <div className={styles.headerActions}>
          <span className={styles.panelCount}>
            {members.length} member
          </span>

          {canAddMember && (
            <button
              type="button"
              className={styles.addButton}
              onClick={() => setPickerOpen(true)}
              disabled={actionLoading}
            >
              <UserPlus size={15} />
              Tambah member
            </button>
          )}

          {canRequestJoin && (
            <button
              type="button"
              className={styles.joinButton}
              onClick={() => void handleRequestJoin()}
              disabled={actionLoading}
            >
              <Send size={15} />
              Ajukan join
            </button>
          )}

          {canLeave && (
            <button
              type="button"
              className={styles.leaveButton}
              onClick={() => setLeaveOpen(true)}
              disabled={actionLoading}
            >
              <LogOut size={15} />
              Keluar
            </button>
          )}
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

      {members.length === 0 ? (
        <div className={styles.empty}>
          <Users size={24} />
          <h3>Belum ada member</h3>
          <p>Anggota project akan muncul di sini.</p>
        </div>
      ) : (
        <div className={styles.memberGrid}>
          {members.map((member) => {
            const isOwner = member.user_id === projectOwnerId;
            const isSelf = member.user_id === currentUserId;
            const canRemove =
              isProjectOwner && !isOwner && !isSelf;

            const menuItems: ActionMenuItem[] = canRemove
              ? [
                  {
                    id: "remove",
                    label: "Keluarkan",
                    icon: <Trash2 size={14} />,
                    danger: true,
                    onSelect: () =>
                      setRemoveTarget({
                        userId: member.user_id,
                        name: member.name,
                      }),
                  },
                ]
              : [];

            return (
              <article className={styles.memberCard} key={member.id}>
                <span className={styles.memberAvatar}>
                  {getInitials(member.name)}
                </span>

                <div className={styles.memberInfo}>
                  <strong>{member.name}</strong>
                  <span>{member.email || "Tanpa email"}</span>
                </div>

                <span
                  className={`${styles.memberRole} ${
                    isOwner
                      ? styles.roleOwner
                      : member.role === "OWNER"
                        ? styles.roleOwner
                        : member.role === "ADMIN"
                          ? styles.roleAdmin
                          : styles.roleCollaborator
                  }`}
                >
                  <ShieldCheck size={12} />
                  {isOwner
                    ? "Project owner"
                    : ROLE_LABELS[member.role ?? ""] ??
                      member.role ??
                      "Member"}
                </span>

                {menuItems.length > 0 && (
                  <ActionMenu
                    ariaLabel={`Aksi untuk ${member.name}`}
                    disabled={actionLoading}
                    items={menuItems}
                  />
                )}
              </article>
            );
          })}
        </div>
      )}

      <MemberPickerModal
        open={pickerOpen}
        title="Tambah member project"
        description="Pilih member workspace untuk ditambahkan ke project."
        candidates={candidates}
        excludeIds={[...memberIds]}
        onClose={() => setPickerOpen(false)}
        onSelect={handleAdd}
      />

      <ConfirmDeleteModal
        open={removeTarget !== null}
        title="Keluarkan member?"
        description={
          <>
            Member <strong>{removeTarget?.name}</strong> akan
            kehilangan akses ke project ini.
          </>
        }
        confirmLabel="Keluarkan"
        onClose={() => setRemoveTarget(null)}
        onConfirm={handleRemove}
      />

      <ConfirmDeleteModal
        open={leaveOpen}
        title="Keluar dari project?"
        description={
          <>
            Kamu akan kehilangan akses ke project ini. Task yang
            di-assign ke kamu akan dilepas.
          </>
        }
        confirmLabel="Keluar"
        onClose={() => setLeaveOpen(false)}
        onConfirm={handleLeave}
      />
    </section>
  );
}
