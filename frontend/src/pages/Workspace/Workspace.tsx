import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { FolderPlus, FolderKanban, RefreshCw } from "lucide-react";

import ConfirmDeleteModal from "../../components/common/ConfirmDeleteModal";
import Pagination from "../../components/common/Pagination";
import WorkspaceCard from "../../components/workspaces/WorkspaceCard";
import WorkspaceModal from "../../components/workspaces/WorkspaceModal";
import WorkspaceToolbar from "../../components/workspaces/WorkspaceToolbar";

import { useWorkspace } from "../../hooks/useWorkspaces";
import { useAuth } from "../../contexts/AuthContext";

import styles from "./Workspace.module.css";

export default function Workspaces() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const {
    workspaces,
    loading,
    error,
    page,
    totalPages,
    total,
    searchInput,
    setSearchInput,
    setPage,
    createWorkspace,
    updateWorkspace,
    deleteWorkspace,
    reload,
  } = useWorkspace();

  const [modalOpen, setModalOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [editingWorkspace, setEditingWorkspace] =
    useState<(typeof workspaces)[number] | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<{
    id: string;
    name: string;
  } | null>(null);

  const closeWorkspaceModal = () => {
    if (creating) return;

    setModalOpen(false);
    setEditingWorkspace(null);
  };

  const handleCreate = async (data: {
    name: string;
    description: string;
  }) => {
    setCreating(true);

    try {
      const success = await createWorkspace(data);

      if (!success) {
        throw new Error("Workspace gagal dibuat. Periksa pesan error pada halaman.");
      }

      setModalOpen(false);
      setEditingWorkspace(null);
    } finally {
      setCreating(false);
    }
  };

  const handleEditWorkspace = (id: string) => {
    const workspace = workspaces.find(
      (item) => String(item.id) === id,
    );

    if (!workspace) return;

    setEditingWorkspace(workspace);
    setModalOpen(true);
  };

  const handleUpdate = async (data: {
    name: string;
    description: string;
  }) => {
    if (!editingWorkspace) {
      throw new Error("Workspace yang ingin diedit tidak ditemukan.");
    }

    const workspaceId = Number(editingWorkspace.id);

    if (!Number.isFinite(workspaceId)) {
      throw new Error("ID workspace tidak valid.");
    }

    await updateWorkspace(workspaceId, data);

    setModalOpen(false);
    setEditingWorkspace(null);
  };

  const handleRequestDelete = (id: string) => {
    const workspace = workspaces.find(
      (item) => String(item.id) === id,
    );

    if (!workspace) return;

    setDeleteTarget({
      id: String(workspace.id),
      name: workspace.name,
    });
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) {
      throw new Error("Workspace yang ingin dihapus tidak ditemukan.");
    }

    const workspaceId = Number(deleteTarget.id);

    if (!Number.isFinite(workspaceId)) {
      throw new Error("ID workspace tidak valid.");
    }

    await deleteWorkspace(workspaceId);

    setDeleteTarget(null);
  };

  const handleOpenWorkspace = (id: string) => {
    navigate(`/workspaces/${id}`);
  };

  return (
    <main className={styles.page}>
      <section className={styles.heading}>
        <div>
          <div className={styles.eyebrow}>WORKSPACE MANAGEMENT</div>
          <h1>Workspaces</h1>
          <p>
            Kelola ruang kerja dan kolaborasi timmu dalam satu tempat.
          </p>
        </div>

        <button
          type="button"
          className={styles.createButton}
          onClick={() => {
            setEditingWorkspace(null);
            setModalOpen(true);
          }}
        >
          <FolderPlus size={18} />
          <span>Buat workspace</span>
        </button>
      </section>

      <section className={styles.content}>
        <div className={styles.sectionHeading}>
          <div>
            <h2>Workspace kamu</h2>
            <p>
              Akses workspace yang kamu ikuti. Klik salah satu untuk
              melihat analytics project dan task.
            </p>
          </div>

          <button
            type="button"
            className={styles.refreshButton}
            onClick={() => void reload()}
            disabled={loading}
            aria-label="Muat ulang workspace"
            title="Muat ulang"
          >
            <RefreshCw size={17} />
          </button>
        </div>

        <WorkspaceToolbar
          search={searchInput}
          onSearchChange={setSearchInput}
          total={total}
        />

        {error && (
          <div className={styles.errorState}>
            <p>{error}</p>
            <button type="button" onClick={() => void reload()}>
              Coba lagi
            </button>
          </div>
        )}

        {loading ? (
          <div className={styles.loadingGrid}>
            {Array.from({ length: 6 }).map((_, index) => (
              <div className={styles.skeleton} key={index}>
                <div className={styles.skeletonIcon} />
                <div className={styles.skeletonTitle} />
                <div className={styles.skeletonText} />
                <div className={styles.skeletonTextShort} />
              </div>
            ))}
          </div>
        ) : !error && workspaces.length === 0 ? (
          <div className={styles.empty}>
            <div className={styles.emptyIcon}>
              <FolderKanban size={28} />
            </div>

            <h3>
              {searchInput
                ? "Workspace tidak ditemukan"
                : "Belum ada workspace"}
            </h3>

            <p>
              {searchInput
                ? "Coba gunakan kata kunci pencarian lain."
                : "Buat workspace pertamamu untuk mulai mengelola proyek."}
            </p>

            {!searchInput && (
              <button
                type="button"
                className={styles.createButton}
                onClick={() => {
                  setEditingWorkspace(null);
                  setModalOpen(true);
                }}
              >
                <FolderPlus size={17} />
                Buat workspace
              </button>
            )}
          </div>
        ) : !error ? (
          <>
            <div className={styles.grid}>
              {workspaces.map((workspace) => {
                const isOwner = workspace.owner_id === user?.id;

                return (
                  <WorkspaceCard
                    key={workspace.id}
                    id={String(workspace.id)}
                    name={workspace.name}
                    description={workspace.description}
                    createdAt={workspace.created_at}
                    onOpen={handleOpenWorkspace}
                    onEdit={isOwner ? handleEditWorkspace : undefined}
                    onDelete={
                      isOwner ? handleRequestDelete : undefined
                    }
                  />
                );
              })}
            </div>

            <Pagination
              page={page}
              totalPages={totalPages}
              onPageChange={setPage}
              ariaLabel="Pagination workspace"
            />
          </>
        ) : null}
      </section>

      <WorkspaceModal
        open={modalOpen}
        loading={creating}
        mode={editingWorkspace ? "edit" : "create"}
        initialData={
          editingWorkspace
            ? {
                name: editingWorkspace.name,
                description: editingWorkspace.description ?? "",
              }
            : undefined
        }
        onClose={closeWorkspaceModal}
        onSubmit={editingWorkspace ? handleUpdate : handleCreate}
      />

      <ConfirmDeleteModal
        open={deleteTarget !== null}
        title="Hapus workspace?"
        description={
          <>
            Kamu yakin ingin menghapus workspace{" "}
            <strong>{deleteTarget?.name}</strong>? Tindakan ini dapat
            memengaruhi project dan task yang terkait dan tidak bisa
            dibatalkan.
          </>
        }
        confirmLabel="Hapus workspace"
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleConfirmDelete}
      />
    </main>
  );
}