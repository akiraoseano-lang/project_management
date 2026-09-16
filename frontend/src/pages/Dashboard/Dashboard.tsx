import { useNavigate } from "react-router-dom";

import { useAuth } from "../../contexts/AuthContext";

import styles from "./Dashboard.module.css";

const Dashboard = () => {
  const navigate = useNavigate();

  const {
    user,
    logoutUser,
  } = useAuth();

  const handleLogout = async () => {
    try {
      await logoutUser();

      navigate("/login", {
        replace: true,
      });
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  return (
    <main className={styles.page}>
      <section className={styles.container}>
        <h1>Dashboard</h1>

        <p>
          Welcome, {user?.name}
        </p>

        <div>
          <p>
            <strong>ID:</strong>{" "}
            {user?.id}
          </p>

          <p>
            <strong>Name:</strong>{" "}
            {user?.name}
          </p>

          <p>
            <strong>Email:</strong>{" "}
            {user?.email}
          </p>

          <p>
            <strong>Role:</strong>{" "}
            {user?.role}
          </p>
        </div>

        <button
          type="button"
          onClick={handleLogout}
        >
          Logout
        </button>
      </section>
    </main>
  );
};

export default Dashboard;