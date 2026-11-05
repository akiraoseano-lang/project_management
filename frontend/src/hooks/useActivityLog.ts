import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import { getWorkspaceActivity } from "../services/activityService";

import {
  filterActivities,
  getActivityCounts,
} from "../utils/activity";

import type {
  ActivityGroupFilter,
  ActivityLog,
  ActivitySource,
} from "../types/activity";

const DEFAULT_PAGE_SIZE = 10;
const DEFAULT_FETCH_LIMIT = 100;

interface UseActivityLogOptions {
  pageSize?: number;
  fetchLimit?: number;
  group?: ActivityGroupFilter;
  search?: string;
  enabled?: boolean;
}

export function useActivityLog(
  workspaceId: number | null,
  options: UseActivityLogOptions = {},
) {
  const {
    pageSize = DEFAULT_PAGE_SIZE,
    fetchLimit = DEFAULT_FETCH_LIMIT,
    group = "ALL",
    search = "",
    enabled = true,
  } = options;

  const [items, setItems] = useState<ActivityLog[]>([]);
  const [source, setSource] = useState<ActivitySource>("api");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPageState] = useState(1);

  const load = useCallback(async () => {
    if (!enabled || workspaceId === null) {
      setItems([]);
      setSource("api");
      setError(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await getWorkspaceActivity(workspaceId, {
        page: 1,
        pageSize: fetchLimit,
      });

      setItems(result.items);
      setSource(result.source);
    } catch (err) {
      setItems([]);
      setError(
        err instanceof Error
          ? err.message
          : "Gagal memuat activity log.",
      );
    } finally {
      setLoading(false);
    }
  }, [workspaceId, fetchLimit, enabled]);

  useEffect(() => {
    void load();
  }, [load]);

  const filteredItems = useMemo(
    () => filterActivities(items, group, search),
    [items, group, search],
  );

  const counts = useMemo(() => getActivityCounts(items), [items]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredItems.length / pageSize),
  );

  useEffect(() => {
    setPageState(1);
  }, [workspaceId, group, search, pageSize]);

  useEffect(() => {
    if (page > totalPages) {
      setPageState(totalPages);
    }
  }, [page, totalPages]);

  const activities = useMemo(() => {
    const offset = (page - 1) * pageSize;

    return filteredItems.slice(offset, offset + pageSize);
  }, [filteredItems, page, pageSize]);

  const setPage = (nextPage: number) => {
    setPageState(
      Math.min(Math.max(1, nextPage), totalPages),
    );
  };

  return {
    activities,
    total: filteredItems.length,
    totalItems: items.length,
    counts,
    page,
    setPage,
    totalPages,
    loading,
    error,
    source,
    reload: load,
  };
}
