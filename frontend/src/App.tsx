
import { Navigate, Route, Routes } from "react-router-dom";

import ProtectedRoute from "./routes/ProtectedRoute";
import PublicRoute from "./routes/PublicRoute/PublicRoute";

import AppLayout from "./components/layout/AppLayout";

import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import Profile from "./components/profile";
import ProfilePhotoPreview from "./components/profile/PhotoPriview";
import Workspaces from "./pages/Workspace/Workspace";
import WorkspaceDetail from "./pages/Workspace/WorkspaceDetail";
import ActivityLog from "./pages/Activity";
import Projects from "./pages/Project/Projects";
import ProjectDetail from "./pages/Project/ProjectDetail";
import Tasks from "./pages/Task/Tasks";

const App = () => {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />

      {/* Halaman untuk pengguna yang belum login */}
      <Route element={<PublicRoute />}>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
      </Route>

      {/* Halaman yang memerlukan autentikasi */}
      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/profile/photo" 
            element={<ProfilePhotoPreview />} />
          <Route path="/workspaces" element={<Workspaces />} />
          <Route
            path="/workspaces/:workspaceId"
            element={<WorkspaceDetail />}
          />
          <Route path="/activity" element={<ActivityLog />} />
          <Route path="/projects" element={<Projects />} />
          <Route
            path="/projects/:projectId"
            element={<ProjectDetail />}
          />
          <Route
            path="/my-tasks"
            element={<Tasks mode="mine" />}
          />
          <Route path="/tasks" element={<Tasks mode="all" />} />
        </Route>
      </Route>
    </Routes>
  );
};

export default App;
