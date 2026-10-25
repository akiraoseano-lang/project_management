import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  CheckCircle2,
  FolderKanban,
  FolderPlus,
  Info,
  RefreshCw,
  X,
} from "lucide-react";

import ProjectCard from "../../components/projects/ProjectCard";
import ProjectToolbar from "../../components/projects/ProjectToolbar";
import ProjectPagination from "../../components/projects/ProjectPagination";
import ProjectModal from "../../components/projects/ProjectModal";
import ProjectDeleteModal from "../../components/projects/ProjectDeleteModal";

import { useAuth } from "../../contexts/AuthContext";
import { useProjects } from "../../hooks/useProjects";

import type {
  ProjectFormData,
  ProjectListItem,
} from "../../types/project";

import styles from "./Projects.module.css";

interface Notice {
  tone: "success" | "info";
  message: string;
}

export default function Projects() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const {
    projects,
    workspaces,
    manageableWorkspaces,
    searchInput,
    setSearchInput,
    workspaceFilter,
    setWorkspaceFilter,
    healthFilter,
    setHealthFilter,
    page,
    setPage,
    total,
    totalPages,
    loading,
    saving,
    error,
    reload,
    createProject,
    updateProject,
    deleteProject,
  } = useProjects();

  const [modalOpen, setModalOpen] = useState(false);
  const [editingProject, setEditingProject] =
    useState<ProjectListItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);

  const hasFilters =
    searchInput.trim().length > 0 ||
    workspaceFilter !== "ALL" ||
    healthFilter !== "ALL";

  const closeProjectModal = () => {
    if (saving) return;

    setModalOpen(false);
    setEditingProject(null);
  };

  const handleCreate = async (data: ProjectFormData) => {
    const project = await createProject(data);

    setModalOpen(false);
    setEditingProject(null);

    setNotice(
      project.status === "PENDING"
        ? {
            tone: "info",
            message:
              "Project berhasil diajukan dan menunggu persetujuan owner workspace.",
          }
        : {
            tone: "success",
            message: "Project berhasil dibuat.",
          },
    );
  };

  const handleEdit = (id: string) => {
    const project = projects.find(
      (item) => String(item.id) === id,
    );

    if (!project) return;

    setEditingProject(project);
    setModalOpen(true);
  };

  const handleUpdate = async (data: ProjectFormData) => {
    if (!editingProject) {
      throw new Error("Project yang ingin diedit tidak ditemukan.");
    }

    await updateProject(editingProject.id, {
      name: data.name,
      description: data.description.trim() || null,
    });

    setModalOpen(false);
    setEditingProject(null);
    setNotice({
      tone: "success",
      message: "Perubahan project berhasil disimpan.",
    });
  };

  const handleRequestDelete = (id: string) => {
    const project = projects.find(
      (item) => String(item.id) === id,
    );

    if (!project) return;

    setDeleteTarget({
      id: String(project.id),
      name: project.name,
    });
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) {
      throw new Error("Project yang ingin dihapus tidak ditemukan.");
    }

    await deleteProject(Number(deleteTarget.id));
    setDeleteTarget(null);
  };

  const handleOpenProject = (id: string) => {
    navigate(`/projects/${id}`);
  };

  return (
    <main className={styles.page}>
      <section className={styles.heading}>
        <div>
          <div className={styles.eyebrow}>PROJECT MANAGEMENT</div>
          <h1>Projects</h1>
          <p>
            Pantau seluruh project dari semua workspace dalam satu
            tampilan.
          </p>
        </div>

        <button
          type="button"
          className={styles.createButton}
          onClick={() => {
            setEditingProject(null);
            setModalOpen(true);
          }}
        >
          <FolderPlus size={18} />
          <span>Buat project</span>
        </button>
      </section>

      <section className={styles.content}>
        <div className={styles.sectionHeading}>
          <div>
            <h2>Project kamu</h2>
            <p>
              Klik salah satu project untuk melihat progress, task,
              dan anggota di dalamnya.
            </p>
          </div>

          <button
            type="button"
            className={styles.refreshButton}
            onClick={() => void reload()}
            disabled={loading}
            aria-label="Muat ulang project"
            title="Muat ulang"
          >
            <RefreshCw size={17} />
          </button>
        </div>

        <ProjectToolbar
          search={searchInput}
          onSearchChange={setSearchInput}
          workspaceFilter={workspaceFilter}
          onWorkspaceChange={setWorkspaceFilter}
          healthFilter={healthFilter}
          onHealthChange={setHealthFilter}
          workspaces={workspaces}
          total={total}
        />

        {notice && (
          <div
            className={`${styles.notice} ${
              notice.tone === "info"
                ? styles.noticeInfo
                : styles.noticeSuccess
            }`}
            role="status"
          >
            {notice.tone === "info" ? (
              <Info size={17} />
            ) : (
              <CheckCircle2 size={17} />
            )}

            <p>{notice.message}</p>

            <button
              type="button"
              className={styles.noticeClose}
              onClick={() => setNotice(null)}
              aria-label="Tutup notifikasi"
            >
              <X size={16} />
            </button>
          </div>
        )}

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
                <div className={styles.skeletonTop}>
                  <div className={styles.skeletonIcon} />
                  <div className={styles.skeletonChip} />
                </div>
                <div className={styles.skeletonTitle} />
                <div className={styles.skeletonText} />
                <div className={styles.skeletonTextShort} />
                <div className={styles.skeletonBar} />
                <div className={styles.skeletonFooter} />
              </div>
            ))}
          </div>
        ) : !error && projects.length === 0 ? (
          <div className={styles.empty}>
            <div className={styles.emptyIcon}>
              <FolderKanban size={28} />
            </div>

            <h3>
              {hasFilters
                ? "Project tidak ditemukan"
                : "Belum ada project"}
            </h3>

            <p>
              {hasFilters
                ? "Coba ubah kata kunci atau filter yang kamu gunakan."
                : "Buat project pertamamu untuk mulai mengatur pekerjaan tim."}
            </p>

            {!hasFilters && (
              <button
                type="button"
                className={styles.createButton}
                onClick={() => {
                  setEditingProject(null);
                  setModalOpen(true);
                }}
              >
                <FolderPlus size={17} />
                Buat project
              </button>
            )}
          </div>
        ) : !error ? (
          <>
            <div className={styles.grid}>
              {projects.map((project) => (
                <ProjectCard
                  key={project.id}
                  id={String(project.id)}
                  name={project.name}
                  description={project.description}
                  workspaceName={project.workspace_name}
                  ownerName={project.owner_name}
                  totalTasks={project.total_tasks}
                  doneTasks={project.done_tasks}
                  inProgressTasks={project.in_progress_tasks}
                  progress={project.progress}
                  memberCount={project.member_count}
                  createdAt={project.created_at}
                  canManage={user?.id === project.owner_id}
                  onOpen={handleOpenProject}
                  onEdit={handleEdit}
                  onDelete={handleRequestDelete}
                />
              ))}
            </div>

            <ProjectPagination
              page={page}
              totalPages={totalPages}
              onPageChange={setPage}
            />
          </>
        ) : null}
      </section>

      <ProjectModal
        open={modalOpen}
        loading={saving}
        mode={editingProject ? "edit" : "create"}
        initialData={
          editingProject
            ? {
                workspaceId: editingProject.workspace_id,
                name: editingProject.name,
                description: editingProject.description ?? "",
              }
            : undefined
        }
        workspaceName={editingProject?.workspace_name}
        workspaces={manageableWorkspaces}
        onClose={closeProjectModal}
        onSubmit={
          editingProject ? handleUpdate : handleCreate
        }
      />

      <ProjectDeleteModal
        project={deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleConfirmDelete}
      />
    </main>
  );
}
