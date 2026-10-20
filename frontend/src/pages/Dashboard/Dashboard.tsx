
import {
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  CheckCircle2,
  CircleDashed,
  Clock3,
  FolderKanban,
  Layers3,
  ListTodo,
  MoreHorizontal,
  Plus,
  Sparkles,
  Users,
} from "lucide-react";

import { useAuth } from "../../contexts/AuthContext";
import styles from "./Dashboard.module.css";

type ProjectStatus = "On Track" | "At Risk" | "Completed";
type TaskStatus = "In Progress" | "To Do" | "Done";

type Project = {
  id: number;
  name: string;
  description: string;
  progress: number;
  tasksDone: number;
  totalTasks: number;
  color: string;
  status: ProjectStatus;
};

type Task = {
  id: number;
  title: string;
  project: string;
  dueDate: string;
  priority: "High" | "Medium" | "Low";
  status: TaskStatus;
};

const statistics = [
  {
    label: "Total Workspaces",
    value: "04",
    change: "+1 this month",
    trend: "up",
    icon: Layers3,
    color: "indigo",
  },
  {
    label: "Active Projects",
    value: "08",
    change: "+2 this month",
    trend: "up",
    icon: FolderKanban,
    color: "blue",
  },
  {
    label: "My Tasks",
    value: "12",
    change: "5 due this week",
    trend: "neutral",
    icon: ListTodo,
    color: "orange",
  },
  {
    label: "Completed Tasks",
    value: "24",
    change: "+6 this week",
    trend: "up",
    icon: CheckCircle2,
    color: "green",
  },
] as const;

const projects: Project[] = [
  {
    id: 1,
    name: "Website Redesign",
    description: "Marketing website revamp",
    progress: 75,
    tasksDone: 18,
    totalTasks: 24,
    color: "indigo",
    status: "On Track",
  },
  {
    id: 2,
    name: "Mobile Application",
    description: "Mobile app development",
    progress: 48,
    tasksDone: 12,
    totalTasks: 25,
    color: "blue",
    status: "At Risk",
  },
  {
    id: 3,
    name: "API Development",
    description: "Backend service integration",
    progress: 90,
    tasksDone: 27,
    totalTasks: 30,
    color: "green",
    status: "On Track",
  },
  {
    id: 4,
    name: "Brand Identity",
    description: "Visual identity and guidelines",
    progress: 100,
    tasksDone: 16,
    totalTasks: 16,
    color: "orange",
    status: "Completed",
  },
];

const tasks: Task[] = [
  {
    id: 1,
    title: "Finalize dashboard UI",
    project: "Website Redesign",
    dueDate: "Today",
    priority: "High",
    status: "In Progress",
  },
  {
    id: 2,
    title: "Review API documentation",
    project: "API Development",
    dueDate: "Tomorrow",
    priority: "Medium",
    status: "To Do",
  },
  {
    id: 3,
    title: "Implement authentication flow",
    project: "Mobile Application",
    dueDate: "Oct 18",
    priority: "High",
    status: "In Progress",
  },
  {
    id: 4,
    title: "Update brand guidelines",
    project: "Brand Identity",
    dueDate: "Completed",
    priority: "Low",
    status: "Done",
  },
];

const activities = [
  {
    id: 1,
    initials: "JD",
    color: "purple",
    title: "Jordan Davis",
    action: "completed a task in",
    target: "Website Redesign",
    time: "10 minutes ago",
  },
  {
    id: 2,
    initials: "SL",
    color: "blue",
    title: "Sarah Lee",
    action: "created a new task in",
    target: "API Development",
    time: "1 hour ago",
  },
  {
    id: 3,
    initials: "MK",
    color: "orange",
    title: "Michael Kim",
    action: "updated the progress of",
    target: "Mobile Application",
    time: "3 hours ago",
  },
];

const Dashboard = () => {
  const { user } = useAuth();

  const displayName = user?.name?.trim().split(/\s+/)[0] || "there";

  const getProjectStatusClass = (status: ProjectStatus) => {
    switch (status) {
      case "On Track":
        return styles.statusOnTrack;
      case "At Risk":
        return styles.statusAtRisk;
      case "Completed":
        return styles.statusCompleted;
    }
  };

  const getTaskStatusClass = (status: TaskStatus) => {
    switch (status) {
      case "In Progress":
        return styles.taskInProgress;
      case "To Do":
        return styles.taskTodo;
      case "Done":
        return styles.taskDone;
    }
  };

  const getPriorityClass = (priority: Task["priority"]) => {
    switch (priority) {
      case "High":
        return styles.priorityHigh;
      case "Medium":
        return styles.priorityMedium;
      case "Low":
        return styles.priorityLow;
    }
  };

  return (
    <div className={styles.dashboard}>
      {/* Welcome section */}
      <section className={styles.welcome}>
        <div>
          <div className={styles.welcomeLabel}>
            <Sparkles size={15} />
            YOUR WORKSPACE AT A GLANCE
          </div>

          <h1>
            Good day, {displayName}
            <span className={styles.wave}> 👋</span>
          </h1>

          <p>
            Here's what's happening with your projects today.
          </p>
        </div>

        <button
          type="button"
          className={styles.createButton}
          onClick={() =>
            console.info("Create project: connect this button to the project flow")
          }
        >
          <Plus size={18} />
          Create Project
        </button>
      </section>

      <div className={styles.demoNotice}>
        <CircleDashed size={15} />
        Preview mode — dashboard metrics below are sample data.
      </div>

      {/* Statistics */}
      <section className={styles.statsGrid} aria-label="Statistics">
        {statistics.map((stat) => {
          const Icon = stat.icon;

          return (
            <article className={styles.statCard} key={stat.label}>
              <div className={styles.statTop}>
                <div
                  className={`${styles.statIcon} ${styles[stat.color]}`}
                >
                  <Icon size={21} strokeWidth={1.9} />
                </div>

                <button
                  type="button"
                  className={styles.moreButton}
                  aria-label={`More options for ${stat.label}`}
                  onClick={() => console.info(stat.label)}
                >
                  <MoreHorizontal size={20} />
                </button>
              </div>

              <p className={styles.statLabel}>{stat.label}</p>

              <div className={styles.statBottom}>
                <strong className={styles.statValue}>{stat.value}</strong>

                <span
                  className={`${styles.statChange} ${
                    stat.trend === "up" ? styles.changePositive : ""
                  }`}
                >
                  {stat.trend === "up" ? (
                    <ArrowUpRight size={14} />
                  ) : stat.trend === "neutral" ? (
                    <Clock3 size={13} />
                  ) : (
                    <ArrowDownRight size={14} />
                  )}
                  {stat.change}
                </span>
              </div>
            </article>
          );
        })}
      </section>

      {/* Main dashboard content */}
      <section className={styles.mainGrid}>
        <div className={styles.panel}>
          <div className={styles.panelHeader}>
            <div>
              <h2>Project Overview</h2>
              <p>Track progress across your projects.</p>
            </div>

            <button
              type="button"
              className={styles.textButton}
              onClick={() => console.info("Navigate to projects")}
            >
              View all
              <ArrowRight size={16} />
            </button>
          </div>

          <div className={styles.projectList}>
            {projects.map((project) => (
              <article className={styles.projectItem} key={project.id}>
                <div className={styles.projectTop}>
                  <div
                    className={`${styles.projectIcon} ${
                      styles[project.color]
                    }`}
                  >
                    <FolderKanban size={19} />
                  </div>

                  <div className={styles.projectDetails}>
                    <h3>{project.name}</h3>
                    <p>{project.description}</p>
                  </div>

                  <span
                    className={`${styles.projectStatus} ${getProjectStatusClass(
                      project.status
                    )}`}
                  >
                    {project.status}
                  </span>
                </div>

                <div className={styles.progressInfo}>
                  <span>Progress</span>
                  <strong>{project.progress}%</strong>
                </div>

                <div
                  className={styles.progressTrack}
                  role="progressbar"
                  aria-label={`${project.name} progress`}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={project.progress}
                >
                  <div
                    className={`${styles.progressBar} ${
                      styles[`progress${project.color}`]
                    }`}
                    style={{ width: `${project.progress}%` }}
                  />
                </div>

                <div className={styles.projectFooter}>
                  <span>
                    {project.tasksDone} of {project.totalTasks} tasks
                  </span>
                  <span>
                    {project.totalTasks - project.tasksDone} remaining
                  </span>
                </div>
              </article>
            ))}
          </div>
        </div>

        {/* Activity panel */}
        <aside className={styles.panel}>
          <div className={styles.panelHeader}>
            <div>
              <h2>Recent Activity</h2>
              <p>Latest updates from your team.</p>
            </div>

            <button
              type="button"
              className={styles.iconAction}
              aria-label="More activity options"
              onClick={() => console.info("Activity options")}
            >
              <MoreHorizontal size={20} />
            </button>
          </div>

          <div className={styles.activityList}>
            {activities.map((activity) => (
              <article className={styles.activityItem} key={activity.id}>
                <div
                  className={`${styles.activityAvatar} ${
                    styles[activity.color]
                  }`}
                >
                  {activity.initials}
                </div>

                <div className={styles.activityContent}>
                  <p>
                    <strong>{activity.title}</strong>{" "}
                    {activity.action}{" "}
                    <span>{activity.target}</span>
                  </p>

                  <time>{activity.time}</time>
                </div>
              </article>
            ))}
          </div>

          <button
            type="button"
            className={styles.activityButton}
            onClick={() => console.info("Navigate to activity log")}
          >
            View activity log
            <ArrowRight size={16} />
          </button>
        </aside>
      </section>

      {/* Task table */}
      <section className={styles.panel}>
        <div className={styles.panelHeader}>
          <div>
            <h2>My Tasks</h2>
            <p>Keep track of what needs your attention.</p>
          </div>

          <button
            type="button"
            className={styles.textButton}
            onClick={() => console.info("Navigate to tasks")}
          >
            View all tasks
            <ArrowRight size={16} />
          </button>
        </div>

        <div className={styles.tableWrapper}>
          <table className={styles.taskTable}>
            <thead>
              <tr>
                <th>Task name</th>
                <th>Project</th>
                <th>Priority</th>
                <th>Due date</th>
                <th>Status</th>
              </tr>
            </thead>

            <tbody>
              {tasks.map((task) => (
                <tr key={task.id}>
                  <td>
                    <div className={styles.taskName}>
                      <span
                        className={`${styles.taskCheck} ${
                          task.status === "Done" ? styles.taskCheckDone : ""
                        }`}
                      >
                        {task.status === "Done" && (
                          <CheckCircle2 size={16} />
                        )}
                      </span>
                      <span>{task.title}</span>
                    </div>
                  </td>

                  <td className={styles.projectCell}>{task.project}</td>

                  <td>
                    <span
                      className={`${styles.priority} ${getPriorityClass(
                        task.priority
                      )}`}
                    >
                      {task.priority}
                    </span>
                  </td>

                  <td className={styles.dueDate}>{task.dueDate}</td>

                  <td>
                    <span
                      className={`${styles.taskStatus} ${getTaskStatusClass(
                        task.status
                      )}`}
                    >
                      {task.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <footer className={styles.dashboardFooter}>
        <span>NEXUS Project Management</span>
        <span>Built for better teamwork.</span>
        <span className={styles.footerTeam}>
          <Users size={14} />
          Team workspace
        </span>
      </footer>
    </div>
  );
};

export default Dashboard;
