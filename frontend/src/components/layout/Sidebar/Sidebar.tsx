
import { useState } from "react";
import { NavLink } from "react-router-dom";
import {
  Activity,
  Bell,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  FolderKanban,
  LayoutDashboard,
  ListTodo,
  LogOut,
  Settings,
  UserRound,
  Users,
} from "lucide-react";

import { useAuth } from "../../../contexts/AuthContext";
import { useProfilePhoto } from "../../../hooks/useProfilePhoto";
import styles from "./Sidebar.module.css";

type SidebarProps = {
  onNavigate?: () => void;
  mobileOpen?: boolean;
  onClose?: () => void;
};

const navigationGroups = [
  {
    title: "OVERVIEW",
    items: [
      { label: "Dashboard", path: "/dashboard", icon: LayoutDashboard },
      { label: "My Tasks", path: "/my-tasks", icon: ListTodo },
      { label: "Calendar", path: "/calendar", icon: CalendarDays },
    ],
  },
  {
    title: "WORK MANAGEMENT",
    items: [
      { label: "Workspaces", path: "/workspaces", icon: FolderKanban },
      { label: "Projects", path: "/projects", icon: FolderKanban },
      { label: "All Tasks", path: "/tasks", icon: ListTodo },
      { label: "Members", path: "/members", icon: Users },
    ],
  },
  {
    title: "COLLABORATION",
    items: [
      { label: "Notifications", path: "/notifications", icon: Bell },
      { label: "Activity Log", path: "/activity", icon: Activity },
    ],
  },
  {
    title: "PERSONAL",
    items: [
      { label: "My Profile", path: "/profile", icon: UserRound },
      { label: "Settings", path: "/settings", icon: Settings },
    ],
  },
];

const Sidebar = ({
  onNavigate,
  mobileOpen = false,
  onClose,
}: SidebarProps) => {
  const { user, logoutUser } = useAuth();
  const { photoUrl, photoFailed, setPhotoFailed } = useProfilePhoto();
  const [collapsed, setCollapsed] = useState(false);

  const initials =
    user?.name
      ?.trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part.charAt(0).toUpperCase())
      .join("") || "U";

  const handleNavigate = () => {
    onNavigate?.();
    onClose?.();
  };

  const handleLogout = async () => {
    try {
      await logoutUser();
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

    return <div className={styles.avatar}>{initials}</div>;
  };

  return (
    <>
      {mobileOpen && (
        <button
          type="button"
          className={styles.overlay}
          onClick={handleNavigate}
          aria-label="Close navigation"
        />
      )}

      <aside
        className={[
          styles.sidebar,
          collapsed ? styles.collapsed : "",
          mobileOpen ? styles.mobileOpen : "",
        ]
          .filter(Boolean)
          .join(" ")}
      >
        <div className={styles.brand}>
          <NavLink
            to="/dashboard"
            className={styles.brand}
            onClick={handleNavigate}
          >
            <div className={styles.logo}>N</div>

            {!collapsed && (
              <div className={styles.brandText}>
                <span className={styles.brandName}>NEXUS</span>
                <span className={styles.brandSubtitle}>
                  Project Management
                </span>
              </div>
            )}
          </NavLink>

          <button
            type="button"
            className={styles.mobileClose}
            onClick={handleNavigate}
            aria-label="Close navigation"
          >
            <ChevronLeft size={17} />
          </button>

          <button
            type="button"
            className={styles.collapseButton}
            onClick={() => setCollapsed((value) => !value)}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? (
              <ChevronRight size={17} />
            ) : (
              <ChevronLeft size={17} />
            )}
          </button>
        </div>

        <nav className={styles.navigation}>
          {navigationGroups.map((group) => (
            <div className={styles.navGroup} key={group.title}>
              {!collapsed && (
                <p className={styles.groupTitle}>{group.title}</p>
              )}

              {group.items.map((item) => {
                const Icon = item.icon;

                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    title={collapsed ? item.label : undefined}
                    onClick={handleNavigate}
                    className={({ isActive }) =>
                      `${styles.navLink} ${isActive ? styles.active : ""}`
                    }
                  >
                    <Icon size={19} />
                    {!collapsed && (
                      <span className={styles.navLabel}>{item.label}</span>
                    )}
                  </NavLink>
                );
              })}
            </div>
          ))}
        </nav>

        <div className={styles.sidebarBottom}>
          <NavLink
            to="/profile"
            className={styles.userCard}
            title={collapsed ? user?.name ?? "My Profile" : undefined}
            onClick={handleNavigate}
          >
            {renderAvatar()}

            {!collapsed && (
              <div className={styles.userInfo}>
                <span className={styles.userName}>
                  {user?.name ?? "User"}
                </span>
                <span className={styles.userRole}>
                  {user?.role ?? "Member"}
                </span>
              </div>
            )}
          </NavLink>

          <button
            type="button"
            className={styles.logoutButton}
            onClick={() => void handleLogout()}
            title={collapsed ? "Sign out" : undefined}
          >
            <LogOut size={18} />
            {!collapsed && <span>Logout</span>}
          </button>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
