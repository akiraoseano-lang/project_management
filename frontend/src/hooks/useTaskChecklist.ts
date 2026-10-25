import { useCallback, useEffect, useState } from "react";

import {
  createChecklistItem,
  getTaskChecklist,
  toggleChecklistItem,
} from "../services/taskService";

import type { TaskChecklistItem } from "../types/task";

interface UseTaskChecklistOptions {
  taskId: number | null;
  onChange?: () => void;
}

export function useTaskChecklist({
  taskId,
  onChange,
}: UseTaskChecklistOptions) {
  const [items, setItems] = useState<TaskChecklistItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadChecklist = useCallback(async () => {
    if (taskId === null) {
      setItems([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await getTaskChecklist(taskId);
      setItems(result);
    } catch (err) {
      setItems([]);
      setError(
        err instanceof Error
          ? err.message
          : "Gagal memuat checklist.",
      );
    } finally {
      setLoading(false);
    }
  }, [taskId]);

  useEffect(() => {
    void loadChecklist();
  }, [loadChecklist]);

  const addItem = async (title: string): Promise<void> => {
    if (taskId === null) return;

    setSaving(true);

    try {
      const item = await createChecklistItem(taskId, title.trim());
      setItems((current) => [...current, item]);
      onChange?.();
    } catch (err) {
      throw new Error(
        err instanceof Error
          ? err.message
          : "Gagal menambah checklist.",
      );
    } finally {
      setSaving(false);
    }
  };

  const toggleItem = async (checklistId: number): Promise<void> => {
    setSaving(true);

    try {
      const updated = await toggleChecklistItem(checklistId);

      setItems((current) =>
        current.map((item) =>
          item.id === updated.id ? updated : item,
        ),
      );

      onChange?.();
    } catch (err) {
      throw new Error(
        err instanceof Error
          ? err.message
          : "Gagal memperbarui checklist.",
      );
    } finally {
      setSaving(false);
    }
  };

  return {
    items,
    loading,
    saving,
    error,
    reload: loadChecklist,
    addItem,
    toggleItem,
  };
}
