import { CircleDashed, CircleDot, CircleCheck } from "lucide-react";

import { getTaskStatusLabel } from "../../../utils/task";

import type { TaskStatus } from "../../../types/task";

import styles from "./TaskStatusBadge.module.css";

interface TaskStatusBadgeProps {
  status: TaskStatus;
  compact?: boolean;
}

export default function TaskStatusBadge({
  status,
  compact = false,
}: TaskStatusBadgeProps) {
  const Icon =
    status === "DONE"
      ? CircleCheck
      : status === "IN_PROGRESS"
        ? CircleDot
        : CircleDashed;

  const toneClass =
    status === "DONE"
      ? styles.done
      : status === "IN_PROGRESS"
        ? styles.progress
        : styles.todo;

  return (
    <span
      className={[
        styles.badge,
        toneClass,
        compact ? styles.compact : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <Icon size={compact ? 12 : 13} />
      {getTaskStatusLabel(status)}
    </span>
  );
}
