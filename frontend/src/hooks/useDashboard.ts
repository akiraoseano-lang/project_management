import { useCallback, useEffect, useMemo, useState } from "react";

import { getProjectCatalog } from "../services/projectService";
import { getAllTasks, getMyTasks } from "../services/taskService";

import type {
  ProjectCatalog,
  ProjectListItem,
} from "../types/project";
import type { TaskSummary } from "../types/task";

const EMPTY_CATALOG: ProjectCatalog = {
  projects: [],
  workspaces: [],
};

export function useDashboard() {
  const [catalog, setCatalog] =
    useState<ProjectCatalog>(EMPTY_CATALOG);
  const [myTasks, setMyTasks] = useState<TaskSummary[]>([]);
  const [myTaskTotal, setMyTaskTotal] = useState(0);
  const [completedTaskTotal, setCompletedTaskTotal] = useState(0);
  const [recentTasks, setRecentTasks] = useState<TaskSummary[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const [catalogResult, myResult, completedResult, recentResult] =
        await Promise.all([
          getProjectCatalog(),
          getMyTasks({ page: 1, pageSize: 5 }),
          getMyTasks({ status: "DONE", page: 1, pageSize: 1 }),
          getAllTasks({ page: 1, pageSize: 5 }),
        ]);

      setCatalog(catalogResult);
      setMyTasks(myResult.items);
      setMyTaskTotal(myResult.total);
      setCompletedTaskTotal(completedResult.total);
      setRecentTasks(recentResult.items);
    } catch (err) {
      setCatalog(EMPTY_CATALOG);
      setMyTasks([]);
      setMyTaskTotal(0);
      setCompletedTaskTotal(0);
      setRecentTasks([]);
      setError(
        err instanceof Error
          ? err.message
          : "Gagal memuat data dashboard.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const overviewProjects = useMemo(
    () => catalog.projects.slice(0, 4),
    [catalog.projects],
  );

  const totalProjectTasks = useMemo(
    () =>
      catalog.projects.reduce(
        (total, project) => total + project.total_tasks,
        0,
      ),
    [catalog.projects],
  );

  const pendingMyTasks = Math.max(
    myTaskTotal - completedTaskTotal,
    0,
  );

  return {
    catalog,
    overviewProjects,
    myTasks,
    myTaskTotal,
    completedTaskTotal,
    pendingMyTasks,
    totalProjectTasks,
    recentTasks,
    loading,
    error,
    reload: load,
  };
}

export type DashboardProject = ProjectListItem;
