import { useState } from "react";
import {
  CheckCircle2,
  LogOut,
  ShieldCheck,
  Trash2,
  UserPlus,
  Users,
  XCircle,
} from "lucide-react";

import ActionMenu from "../../common/ActionMenu";
import MemberPickerModal from "../../common/MemberPickerModal";
import ConfirmDeleteModal from "../../common/ConfirmDeleteModal";

import type { ActionMenuItem } from "../../common/ActionMenu";

import { useWorkspaceMembers } from "../../../hooks/useWorkspaceMembers";

import { getInitials } from "../../../utils/project";

import type {
  WorkspaceMemberSummary,
  WorkspaceRole,
} from "../../../types/workspace";

import styles from "./WorkspaceMembersPanel.module.css";

interface WorkspaceMembersPanelProps {
  workspaceId: number;
  role: WorkspaceRole;
  currentUserId?: number;
  members: WorkspaceMemberSummary[];
  onChanged: () => void;
  onLeft?: () => void;
}

const ROLE_LABELS: Record<string, string> = {
  OWNER: "Owner",
  ADMIN: "Admin",
  COLLABORATOR: "Collaborator",
};

type RemoveTarget = {
  userId: number;
  name: string;
  mode: "remove" | "request";
};

export default function WorkspaceMembersPanel({
  workspaceId,
  role,
  currentUserId,
  members,
  onChanged,
  onLeft,
}: WorkspaceMembersPanelProps) {
  const {
    actionLoading,
    addMember,
    removeMember,
    leave,
    updateRole,
    requestAction,
  } = useWorkspaceMembers(workspaceId, onChanged);

  const [pickerOpen, setPickerOpen] = useState(false);
  const [removeTarget, setRemoveTarget] =
    useState<RemoveTarget | null>(null);
  const [leaveOpen, setLeaveOpen] = useState(false);
  const [roleBusyId, setRoleBusyId] = useState<number | null>(null);
  const [notice, setNotice] = useState<{
    tone: "success" | "error";
    message: string;
  } | null>(null);

  const isOwner = role === "OWNER";
  const isAdmin = role === "ADMIN";
  const isMember = members.some(
    (member) => member.user_id === currentUserId,
  );

  const handleAdd = async (userId: number) => {
    await addMember(userId);
    setNotice({
      tone: "success",
      message: "Member berhasil ditambahkan ke workspace.",
    });
  };

  const handleRemove = async () => {
    if (!removeTarget) return;

    if (removeTarget.mode === "remove") {
      await removeMember(removeTarget.userId);
      setNotice({
        tone: "success",
        message: "Member berhasil dikeluarkan dari workspace.",
      });
    } else {
      await requestAction({
        action: "REMOVE_MEMBER",
        target_user_id: removeTarget.userId,
      });
      setNotice({
        tone: "success",
        message:
          "Permintaan penghapusan member dikirim ke owner workspace.",
      });
    }

    setRemoveTarget(null);
  };

  const handleLeave = async () => {
    await leave();
    setLeaveOpen(false);
    setNotice({
      tone: "success",
      message: "Kamu telah keluar dari workspace.",
    });
    onLeft?.();
  };

  const handleDirectRoleChange = async (
    member: WorkspaceMemberSummary,
    newRole: "ADMIN" | "COLLABORATOR",
  ) => {
    setRoleBusyId(member.user_id);
    setNotice(null);

    try {
      await updateRole(member.user_id, newRole);

      setNotice({
        tone: "success",
        message: `Role ${member.name} diubah menjadi ${
          ROLE_LABELS[newRole] ?? newRole
        }.`,
      });
    } catch (err) {
      setNotice({
        tone: "error",
        message:
          err instanceof Error
            ? err.message
            : "Gagal mengubah role member.",
      });
    } finally {
      setRoleBusyId(null);
    }
  };

  const handleRoleRequest = async (
    member: WorkspaceMemberSummary,
    newRole: "ADMIN" | "COLLABORATOR",
  ) => {
    setRoleBusyId(member.user_id);

    try {
      await requestAction({
        action: "CHANGE_ROLE",
        target_user_id: member.user_id,
        payload: { new_role: newRole },
      });

      setNotice({
        tone: "success",
        message: `Permintaan perubahan role untuk ${member.name} dikirim ke owner.`,
      });
    } catch (err) {
      setNotice({
        tone: "error",
        message:
          err instanceof Error
            ? err.message
            : "Gagal mengirim permintaan perubahan role.",
      });
    } finally {
      setRoleBusyId(null);
    }
  };

  return (
    <section className={styles.panel}>
      <div className={styles.panelHeader}>
        <div>
          <h2>Workspace Members</h2>
          <p>Orang-orang yang berkolaborasi di workspace ini.</p>
        </div>

        <div className={styles.headerActions}>
          <span className={styles.panelCount}>
            {members.length} member
          </span>

          {isOwner && (
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

          {!isOwner && isMember && (
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
        </div>
      ) : (
        <div className={styles.memberGrid}>
          {members.map((member) => {
            const isSelf = member.user_id === currentUserId;
            const canRemove = isOwner && !isSelf;
            const canChangeRole =
              isOwner && !isSelf && member.role !== "OWNER";
            const canRequestRemove =
              isAdmin && !isSelf && member.role !== "OWNER";
            const canRequestRole =
              isAdmin && !isSelf && member.role !== "OWNER";

            const menuItems: ActionMenuItem[] = [];

            if (canChangeRole) {
              if (member.role !== "ADMIN") {
                menuItems.push({
                  id: "role-admin",
                  label: "Jadikan Admin",
                  icon: <ShieldCheck size={14} />,
                  onSelect: () =>
                    void handleDirectRoleChange(member, "ADMIN"),
                });
              }

              if (member.role !== "COLLABORATOR") {
                menuItems.push({
                  id: "role-collaborator",
                  label: "Jadikan Collaborator",
                  icon: <ShieldCheck size={14} />,
                  onSelect: () =>
                    void handleDirectRoleChange(
                      member,
                      "COLLABORATOR",
                    ),
                });
              }
            }

            if (canRequestRole) {
              if (member.role !== "ADMIN") {
                menuItems.push({
                  id: "request-role-admin",
                  label: "Ajukan jadikan Admin",
                  icon: <ShieldCheck size={14} />,
                  onSelect: () =>
                    void handleRoleRequest(member, "ADMIN"),
                });
              }

              if (member.role !== "COLLABORATOR") {
                menuItems.push({
                  id: "request-role-collaborator",
                  label: "Ajukan jadikan Collaborator",
                  icon: <ShieldCheck size={14} />,
                  onSelect: () =>
                    void handleRoleRequest(member, "COLLABORATOR"),
                });
              }
            }

            if (canRemove) {
              menuItems.push({
                id: "remove",
                label: "Keluarkan",
                icon: <Trash2 size={14} />,
                danger: true,
                onSelect: () =>
                  setRemoveTarget({
                    userId: member.user_id,
                    name: member.name,
                    mode: "remove",
                  }),
              });
            }

            if (canRequestRemove) {
              menuItems.push({
                id: "request-remove",
                label: "Ajukan hapus",
                icon: <LogOut size={14} />,
                danger: true,
                onSelect: () =>
                  setRemoveTarget({
                    userId: member.user_id,
                    name: member.name,
                    mode: "request",
                  }),
              });
            }

            return (
              <article className={styles.memberCard} key={member.id}>
                <span className={styles.memberAvatar}>
                  {getInitials(member.name)}
                </span>

                <div className={styles.memberInfo}>
                  <strong>{member.name}</strong>
                  <span>{member.email}</span>
                </div>

                <span
                  className={`${styles.memberRole} ${
                    member.role === "OWNER"
                      ? styles.roleOwner
                      : member.role === "ADMIN"
                        ? styles.roleAdmin
                        : styles.roleCollaborator
                  }`}
                >
                  <ShieldCheck size={12} />
                  {ROLE_LABELS[member.role] ?? member.role}
                </span>

                {menuItems.length > 0 && (
                  <ActionMenu
                    ariaLabel={`Aksi untuk ${member.name}`}
                    disabled={actionLoading}
                    loading={roleBusyId === member.user_id}
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
        title="Tambah member workspace"
        description="Cari pengguna lalu tambahkan sebagai collaborator."
        searchable
        excludeIds={members.map((member) => member.user_id)}
        onClose={() => setPickerOpen(false)}
        onSelect={handleAdd}
      />

      <ConfirmDeleteModal
        open={removeTarget !== null}
        title={
          removeTarget?.mode === "request"
            ? "Ajukan penghapusan member?"
            : "Keluarkan member?"
        }
        description={
          <>
            {removeTarget?.mode === "request"
              ? "Permintaan akan dikirim ke owner workspace untuk disetujui. "
              : "Member akan kehilangan akses ke workspace ini. "}
            Member: <strong>{removeTarget?.name}</strong>.
          </>
        }
        confirmLabel={
          removeTarget?.mode === "request"
            ? "Ajukan"
            : "Keluarkan"
        }
        onClose={() => setRemoveTarget(null)}
        onConfirm={handleRemove}
      />

      <ConfirmDeleteModal
        open={leaveOpen}
        title="Keluar dari workspace?"
        description={
          <>
            Kamu akan kehilangan akses ke workspace ini beserta
            project dan task di dalamnya.
          </>
        }
        confirmLabel="Keluar"
        onClose={() => setLeaveOpen(false)}
        onConfirm={handleLeave}
      />
    </section>
  );
}
