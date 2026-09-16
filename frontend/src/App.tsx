import {
  Navigate,
  Route,
  Routes
} from "react-router-dom";

import ProtectedRoute from "./routes//ProtectedRoute";
import PublicRoute from "./routes/PublicRoute/PublicRoute";

import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";

const App = () => {
  return (
    <Routes>
      <Route
        path="/"
        element={
          <Navigate
            to="/login"
            replace
          />
        }
      />

      <Route element={<PublicRoute />}>
        <Route
          path="/login"
          element={<Login />}
        />

        <Route
          path="/register"
          element={<Register />}
        />
      </Route>

      <Route element={<ProtectedRoute />}>
        <Route
          path="/dashboard"
          element={<Dashboard />}
        />
      </Route>
    </Routes>
  );
};

export default App;