
import { useState } from "react";
import { Outlet } from "react-router-dom";

import Sidebar from "../Sidebar";
import Header from "../Header";
import styles from "./AppLayout.module.css";

const AppLayout = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <div
      className={`${styles.layout} ${
        sidebarCollapsed ? styles.sidebarCollapsed : ""
      }`}
    >
      <Sidebar
        mobileOpen={mobileOpen}
        onClose={() => setMobileOpen(false)}
        onCollapseChange={setSidebarCollapsed}
      />

      <div className={styles.main}>
        <Header onMenuClick={() => setMobileOpen(true)} />

        <main className={styles.content}>
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AppLayout;
