import { useMemo } from "react";
import {
  Activity,
  CalendarDays,
  CircleAlert,
  FolderKanban,
  Layers3,
  ListChecks,
  ListTodo,
  Send,
  Users,
} from "lucide-react";

import {
  formatActivityDateTime,
  formatActivityRelativeTime,
  getActivityDateKey,
  getActivityDateLabel,
  getActivityDescription,
  getActivityIconKey,
  getActivityLabel,
  getActivityTarget,
  getActivityTone,
} from "../../../utils/activity";

import type {
  ActivityIconKey,
  ActivityLog,
  ActivityTone,
} from "../../../types/activity";

import styles from "./ActivityTimeline.module.css";

const ACTIVITY_ICONS: Record<ActivityIconKey, typeof Activity> = {
  workspace: Layers3,
  project: FolderKanban,
  task: ListTodo,
  checklist: ListChecks,
  member: Users,
  request: Send,
  other: Activity,
};

const TONE_CLASSES: Record<ActivityTone, string> = {
  indigo: styles.toneIndigo,
  blue: styles.toneBlue,
  orange: styles.toneOrange,
  purple: styles.tonePurple,
  green: styles.toneGreen,
  red: styles.toneRed,
  slate: styles.toneSlate,
};

interface ActivityTimelineProps {
  activities: ActivityLog[];
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  compact?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  showWorkspace?: boolean;
}

export default function ActivityTimeline({
  activities,
  loading = false,
  error = null,
  onRetry,
  compact = false,
  emptyTitle = "Belum ada aktivitas",
  emptyDescription = "Aktivitas baru akan muncul di sini.",
  showWorkspace = false,
}: ActivityTimelineProps) {
  const groups = useMemo(() => {
    const map = new Map<string, ActivityLog[]>();

    activities.forEach((activity) => {
      const key = getActivityDateKey(activity.created_at);

      if (!map.has(key)) {
        map.set(key, []);
      }

      map.get(key)?.push(activity);
    });

    return Array.from(map.entries()).map(([key, items]) => ({
      key,
      label: getActivityDateLabel(key),
      items,
    }));
  }, [activities]);

  if (loading) {
    return (
      <div
        className={`${styles.timeline} ${
          compact ? styles.compact : ""
        }`}
        aria-label="Memuat activity log"
      >
        {Array.from({ length: compact ? 4 : 6 }).map((_, index) => (
          <div className={styles.skeletonRow} key={index}>
            <span className={styles.skeletonIcon} />
            <div className={styles.skeletonContent}>
              <span className={styles.skeletonLineWide} />
              <span className={styles.skeletonLine} />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.state} role="alert">
        <div className={styles.stateIcon}>
          <CircleAlert size={22} />
        </div>
        <h3>Activity log tidak dapat dimuat</h3>
        <p>{error}</p>

        {onRetry && (
          <button type="button" onClick={onRetry}>
            Coba lagi
          </button>
        )}
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <div className={styles.state}>
        <div className={styles.stateIcon}>
          <Activity size={22} />
        </div>
        <h3>{emptyTitle}</h3>
        <p>{emptyDescription}</p>
      </div>
    );
  }

  return (
    <div
      className={`${styles.timeline} ${
        compact ? styles.compact : ""
      }`}
    >
      {groups.map((group) => (
        <section className={styles.dateGroup} key={group.key}>
          <div className={styles.dateLabel}>
            <CalendarDays size={12} />
            <span>{group.label}</span>
            <span className={styles.dateLine} />
            <span className={styles.dateCount}>
              {group.items.length}
            </span>
          </div>

          <div className={styles.items}>
            {group.items.map((activity) => {
              const Icon = ACTIVITY_ICONS[getActivityIconKey(activity)];
              const tone = getActivityTone(activity);
              const label = getActivityLabel(activity);
              const target = getActivityTarget(activity);
              const description = getActivityDescription(activity);
              const actor = activity.actor_name?.trim() || "Seseorang";

              return (
                <article
                  className={styles.item}
                  key={`${activity.id}-${activity.created_at}-${activity.action}`}
                >
                  <div
                    className={`${styles.icon} ${TONE_CLASSES[tone]}`}
                  >
                    <Icon size={17} strokeWidth={2} />
                  </div>

                  <div className={styles.content}>
                    <p className={styles.message}>
                      <strong>{actor}</strong> {label}
                      {target && (
                        <>
                          {" "}
                          <span className={styles.target}>
                            {target}
                          </span>
                        </>
                      )}
                    </p>

                    {description && (
                      <p className={styles.description}>
                        {description}
                      </p>
                    )}

                    <div className={styles.footer}>
                      <span
                        title={formatActivityDateTime(
                          activity.created_at,
                        )}
                      >
                        {formatActivityRelativeTime(
                          activity.created_at,
                        )}
                      </span>

                      {showWorkspace && activity.workspace_name && (
                        <span>
                          <Layers3 size={11} />
                          {activity.workspace_name}
                        </span>
                      )}

                      {activity.project_name && (
                        <span>
                          <FolderKanban size={11} />
                          {activity.project_name}
                        </span>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
