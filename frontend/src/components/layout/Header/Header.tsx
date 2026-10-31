import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import { Link, useLocation } from "react-router-dom";
import {
  Bell,
  Building2,
  ChevronDown,
  CircleAlert,
  Clock3,
  LoaderCircle,
  LogOut,
  Menu,
  Search,
  Settings,
  UserPlus,
  UserRound,
} from "lucide-react";

import { useAuth } from "../../../contexts/AuthContext";
import { useProfilePhoto } from "../../../hooks/useProfilePhoto";
import {
  discoverWorkspaces,
  requestJoinWorkspace,
} from "../../../services/workspaceService";

import type { WorkspaceDiscoverItem } from "../../../types/workspace";

import styles from "./Header.module.css";

type HeaderProps = {
  onMenuClick?: () => void;
};

type SearchNotice = {
  tone: "success" | "error";
  message: string;
};

const pageNames: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/profile": "My Profile",
  "/profile/photo": "Profile Photo",
  "/my-tasks": "My Tasks",
  "/calendar": "Calendar",
  "/workspaces": "Workspaces",
  "/projects": "Projects",
  "/tasks": "All Tasks",
  "/members": "Members",
  "/notifications": "Notifications",
  "/activity": "Activity Log",
  "/settings": "Settings",
};

const Header = ({ onMenuClick }: HeaderProps) => {
  const location = useLocation();
  const { user, logoutUser } = useAuth();
  const { photoUrl, photoFailed, setPhotoFailed } = useProfilePhoto();

  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchWrapperRef = useRef<HTMLDivElement>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchResults, setSearchResults] = useState<
    WorkspaceDiscoverItem[]
  >([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [joiningId, setJoiningId] = useState<number | null>(null);
  const [searchNotice, setSearchNotice] =
    useState<SearchNotice | null>(null);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  const trimmedQuery = searchQuery.trim();
  const canSearch = trimmedQuery.length >= 2;

  const initials =
    user?.name
      ?.trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part.charAt(0).toUpperCase())
      .join("") || "U";

  const currentPage =
    pageNames[location.pathname] ??
    (location.pathname.startsWith("/workspaces/")
      ? "Workspace Analytics"
      : location.pathname.startsWith("/projects/")
        ? "Project Detail"
        : "Workspace");

  useEffect(() => {
    if (!canSearch) {
      setSearchResults([]);
      setSearchError(null);
      setSearchLoading(false);
      return;
    }

    let cancelled = false;

    setSearchLoading(true);
    setSearchError(null);

    const timer = window.setTimeout(() => {
      discoverWorkspaces({ search: trimmedQuery, pageSize: 8 })
        .then((data) => {
          if (!cancelled) {
            setSearchResults(data.items);
          }
        })
        .catch((err) => {
          if (!cancelled) {
            setSearchResults([]);
            setSearchError(
              err instanceof Error
                ? err.message
                : "Gagal mencari workspace.",
            );
          }
        })
        .finally(() => {
          if (!cancelled) {
            setSearchLoading(false);
          }
        });
    }, 300);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [canSearch, trimmedQuery]);

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      if (
        !searchWrapperRef.current?.contains(event.target as Node)
      ) {
        setSearchOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);

    return () =>
      document.removeEventListener("mousedown", handlePointerDown);
  }, []);

  useEffect(() => {
    const handleShortcut = (event: KeyboardEvent) => {
      if (
        (event.metaKey || event.ctrlKey) &&
        event.key.toLowerCase() === "k"
      ) {
        event.preventDefault();
        searchInputRef.current?.focus();
        setSearchOpen(true);
        setNotificationsOpen(false);
        setProfileOpen(false);
      }
    };

    window.addEventListener("keydown", handleShortcut);

    return () =>
      window.removeEventListener("keydown", handleShortcut);
  }, []);

  const handleSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSearchOpen(true);
  };

  const handleSearchKeyDown = (
    event: ReactKeyboardEvent<HTMLInputElement>,
  ) => {
    if (event.key === "Escape") {
      setSearchOpen(false);
      searchInputRef.current?.blur();
    }
  };

  const handleJoinWorkspace = async (
    workspace: WorkspaceDiscoverItem,
  ) => {
    setJoiningId(workspace.id);
    setSearchNotice(null);

    try {
      await requestJoinWorkspace(workspace.id);

      setSearchResults((items) =>
        items.map((item) =>
          item.id === workspace.id
            ? { ...item, join_status: "PENDING" }
            : item,
        ),
      );

      setSearchNotice({
        tone: "success",
        message: `Permintaan join ke "${workspace.name}" dikirim. Tunggu persetujuan owner.`,
      });
    } catch (err) {
      setSearchNotice({
        tone: "error",
        message:
          err instanceof Error
            ? err.message
            : "Gagal mengirim permintaan join.",
      });
    } finally {
      setJoiningId(null);
    }
  };

  const handleLogout = async () => {
    try {
      await logoutUser();
      setProfileOpen(false);
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  const renderAvatar = () => {
    if (photoUrl && !photoFailed) {
      return (
        <img
          key={photoUrl}
          src={photoUrl}
          alt={`${user?.name ?? "User"} profile`}
          className={styles.avatar}
          onError={() => setPhotoFailed(true)}
        />
      );
    }

    return <span className={styles.avatar}>{initials}</span>;
  };

  return (
    <header className={styles.header}>
      <div className={styles.left}>
        <button
          type="button"
          className={styles.menuButton}
          onClick={onMenuClick}
          aria-label="Open navigation menu"
        >
          <Menu size={20} />
        </button>

        <div className={styles.breadcrumb}>
          <span className={styles.breadcrumbRoot}>NEXUS</span>
          <span className={styles.separator}>/</span>
          <span className={styles.currentPage}>{currentPage}</span>
        </div>
      </div>

      <div className={styles.actions}>
        <div
          className={styles.searchWrapper}
          ref={searchWrapperRef}
        >
          <form
            className={styles.search}
            onSubmit={handleSearch}
            role="search"
          >
            <Search size={18} className={styles.searchIcon} />

            <input
              ref={searchInputRef}
              type="search"
              value={searchQuery}
              onChange={(event) => {
                setSearchQuery(event.target.value);
                setSearchOpen(true);
                setSearchNotice(null);
              }}
              onFocus={() => {
                setSearchOpen(true);
                setNotificationsOpen(false);
                setProfileOpen(false);
              }}
              onKeyDown={handleSearchKeyDown}
              placeholder="Cari workspace..."
              aria-label="Cari workspace"
              aria-expanded={searchOpen}
            />

            <span className={styles.shortcut}>⌘ K</span>
          </form>

          {searchOpen && (
            <div className={styles.searchDropdown}>
              <div className={styles.searchDropdownHeader}>
                <strong>Workspace</strong>
                <span>
                  {!canSearch
                    ? "Ketik minimal 2 karakter"
                    : searchLoading
                      ? "Mencari..."
                      : `${searchResults.length} hasil`}
                </span>
              </div>

              {!canSearch ? (
                <div className={styles.searchState}>
                  <Search size={18} />
                  <p>Cari workspace untuk bergabung.</p>
                  <span>
                    Ketik nama atau deskripsi workspace, lalu ajukan
                    join.
                  </span>
                </div>
              ) : searchError ? (
                <div className={styles.searchState}>
                  <CircleAlert size={18} />
                  <p>{searchError}</p>
                </div>
              ) : searchLoading ? (
                <div className={styles.searchState}>
                  <LoaderCircle
                    size={18}
                    className={styles.spinner}
                  />
                  <p>Mencari workspace...</p>
                </div>
              ) : searchResults.length === 0 ? (
                <div className={styles.searchState}>
                  <Building2 size={18} />
                  <p>Tidak ada workspace yang cocok.</p>
                  <span>Coba kata kunci lain.</span>
                </div>
              ) : (
                <div className={styles.searchResults}>
                  {searchResults.map((workspace) => {
                    const isPending =
                      workspace.join_status === "PENDING";
                    const isRejected =
                      workspace.join_status === "REJECTED";
                    const isJoining = joiningId === workspace.id;

                    return (
                      <div
                        className={styles.searchResult}
                        key={workspace.id}
                      >
                        <div className={styles.searchResultIcon}>
                          <Building2 size={16} />
                        </div>

                        <div className={styles.searchResultInfo}>
                          <strong>{workspace.name}</strong>
                          <span>
                            {workspace.description?.trim() ||
                              "Tanpa deskripsi"}
                          </span>
                        </div>

                        {workspace.is_member ? (
                          <Link
                            to={`/workspaces/${workspace.id}`}
                            className={styles.searchOpenLink}
                            onClick={() => setSearchOpen(false)}
                          >
                            Buka
                          </Link>
                        ) : isPending ? (
                          <span className={styles.searchPending}>
                            <Clock3 size={12} />
                            Menunggu
                          </span>
                        ) : (
                          <button
                            type="button"
                            className={styles.searchJoinButton}
                            disabled={isJoining}
                            onClick={() =>
                              void handleJoinWorkspace(workspace)
                            }
                          >
                            {isJoining ? (
                              <LoaderCircle
                                size={13}
                                className={styles.spinner}
                              />
                            ) : (
                              <UserPlus size={13} />
                            )}
                            {isRejected
                              ? "Ajukan lagi"
                              : "Request join"}
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {searchNotice && (
                <div
                  className={`${styles.searchNotice} ${
                    searchNotice.tone === "success"
                      ? styles.searchNoticeSuccess
                      : styles.searchNoticeError
                  }`}
                  role="status"
                >
                  {searchNotice.message}
                </div>
              )}
            </div>
          )}
        </div>

        <div className={styles.dropdownWrapper}>
          <button
            type="button"
            className={`${styles.iconButton} ${
              notificationsOpen ? styles.buttonActive : ""
            }`}
            aria-label="Notifications"
            aria-expanded={notificationsOpen}
            onClick={() => {
              setNotificationsOpen((open) => !open);
              setProfileOpen(false);
              setSearchOpen(false);
            }}
          >
            <Bell size={20} />
            <span className={styles.notificationDot} />
          </button>

          {notificationsOpen && (
            <div
              className={`${styles.dropdown} ${styles.notificationPanel}`}
            >
              <div className={styles.dropdownHeader}>
                <strong>Notifications</strong>
                <span className={styles.comingSoon}>Coming soon</span>
              </div>

              <div className={styles.emptyState}>
                <Bell size={24} />
                <p>No new notifications</p>
                <span>
                  You&apos;re all caught up. New updates will appear here.
                </span>
              </div>
            </div>
          )}
        </div>

        <div className={styles.profileWrapper}>
          <button
            type="button"
            className={styles.profileButton}
            aria-expanded={profileOpen}
            onClick={() => {
              setProfileOpen((open) => !open);
              setNotificationsOpen(false);
              setSearchOpen(false);
            }}
          >
            {renderAvatar()}

            <span className={styles.profileInfo}>
              <strong>{user?.name ?? "User"}</strong>
              <span>{user?.role ?? "Member"}</span>
            </span>

            <ChevronDown
              size={16}
              className={profileOpen ? styles.chevronOpen : ""}
            />
          </button>

          {profileOpen && (
            <div className={`${styles.dropdown} ${styles.profileDropdown}`}>
              <div className={styles.dropdownUser}>
                {renderAvatar()}
                <div>
                  <strong>{user?.name ?? "User"}</strong>
                  <span>{user?.email ?? ""}</span>
                </div>
              </div>

              <div className={styles.dropdownDivider} />

              <Link
                to="/profile"
                className={styles.dropdownLink}
                onClick={() => setProfileOpen(false)}
              >
                <UserRound size={17} />
                My Profile
              </Link>

              <Link
                to="/settings"
                className={styles.dropdownLink}
                onClick={() => setProfileOpen(false)}
              >
                <Settings size={17} />
                Settings
              </Link>

              <div className={styles.dropdownDivider} />

              <button
                type="button"
                className={styles.dropdownLink}
                onClick={() => void handleLogout()}
              >
                <LogOut size={17} />
                Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
