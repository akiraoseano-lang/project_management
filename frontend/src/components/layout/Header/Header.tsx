
import { useState, type FormEvent } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  Bell,
  ChevronDown,
  LogOut,
  Menu,
  Search,
  Settings,
  UserRound,
} from "lucide-react";

import { useAuth } from "../../../contexts/AuthContext";
import { useProfilePhoto } from "../../../hooks/useProfilePhoto";
import styles from "./Header.module.css";

type HeaderProps = {
  onMenuClick?: () => void;
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

  const [searchQuery, setSearchQuery] = useState("");
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

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

  const handleSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const query = searchQuery.trim();
    if (!query) return;

    console.info("Search query:", query);
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
        <form className={styles.search} onSubmit={handleSearch}>
          <Search size={18} className={styles.searchIcon} />

          <input
            type="search"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Search anything..."
            aria-label="Search"
          />

          <span className={styles.shortcut}>⌘ K</span>
        </form>

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
