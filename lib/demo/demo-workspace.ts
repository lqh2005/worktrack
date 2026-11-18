import { randomUUID } from "node:crypto";
import type { IssuePriority, IssueStatus, Prisma, PrismaClient } from "@prisma/client";
import { TEAM_MEMBERS } from "./constants";

const HOUR = 3_600_000;
const DAY = 24 * HOUR;

type StoryPoint = 1 | 2 | 3 | 5 | 8;
type IssueTemplate = [
  title: string,
  status: IssueStatus,
  priority: IssuePriority,
  storyPoints: StoryPoint,
  description: string | null,
];

interface ProjectTemplate {
  key: string;
  name: string;
  description: string;
  color: string;
  issues: IssueTemplate[];
}

const STATUS_FLOW: IssueStatus[] = ["TODO", "IN_PROGRESS", "IN_REVIEW", "DONE"];
const PRIORITY_ORDER: IssuePriority[] = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];

export const DEMO_PROJECTS: ProjectTemplate[] = [
  {
    key: "DEV",
    name: "WorkTrack Web App",
    description: "Web app quan ly task theo sprint, bang Kanban keo tha va thong ke tien do.",
    color: "#6366f1",
    issues: [
      ["Initialize Next.js 14 project with TypeScript and Tailwind CSS", "DONE", "HIGH", 2, "Setup folder structure, ESLint rules and base layout."],
      ["Design PostgreSQL schema for projects, issues and activity logs", "DONE", "CRITICAL", 5, "Define tables, enums and indexes in schema.prisma."],
      ["Implement JWT login and register with httpOnly cookies", "DONE", "CRITICAL", 8, "Use jose for token signing and bcryptjs for password hashing."],
      ["Add Demo User login button for quick testing", "DONE", "HIGH", 3, "Allow signing into a sample account with pre-populated issues."],
      ["Build CRUD API routes for issues with Zod validation", "DONE", "HIGH", 5, "Validate request body and return proper HTTP status codes."],
      ["Server-side pagination, status filter and keyword search", "DONE", "HIGH", 5, "Support filtering by status, priority, project and searching by title or issue key."],
      ["Check valid status transitions before updating issue", "DONE", "MEDIUM", 3, "Prevent jumping directly from TODO to DONE without going through IN_PROGRESS."],
      ["Save activity log whenever issue status or priority changes", "DONE", "MEDIUM", 3, "Keep history of who updated the issue and what changed."],
      ["Build analytics API for burndown and weekly velocity charts", "IN_REVIEW", "HIGH", 8, "Calculate completed story points per week and remaining points per day."],
      ["Create dashboard page with Recharts visualizations", "IN_PROGRESS", "HIGH", 5, "Show KPI cards, status donut chart, priority bar chart and burndown chart."],
      ["Build Kanban board with drag-and-drop columns", "IN_PROGRESS", "MEDIUM", 5, "Allow dragging issue cards between columns to update status."],
      ["Create modal for adding and editing issues", "IN_REVIEW", "MEDIUM", 3, "Form with title, description, story points, priority and due date."],
      ["Fix timezone offset when displaying issue due date", "TODO", "MEDIUM", 1, "Format dates consistently in UTC so the day does not shift."],
      ["Prevent overwriting issue when two tabs edit at the same time", "DONE", "LOW", 2, "Check updatedAt timestamp before saving changes."],
      ["Test all API endpoints with Postman and edge cases", "TODO", "HIGH", 3, "Verify invalid inputs, unauthorized requests and empty states."],
      ["Setup GitHub repo and deploy to Vercel + Neon", "TODO", "MEDIUM", 3, "Configure environment variables and automatic Prisma migration on build."],
      ["Add keyboard shortcut (C) to quickly open create issue modal", "DONE", "LOW", 2, "Listen for keydown event when user is not typing in an input."],
      ["Improve responsive layout on mobile screens", "IN_PROGRESS", "MEDIUM", 3, "Make sidebar collapsible on small screens and fix table overflow."],
    ],
  },
  {
    key: "SHOP",
    name: "TechZone E-Commerce",
    description: "Website ban laptop va phu kien cong nghe, tich hop thanh toan VietQR va VNPay.",
    color: "#10b981",
    issues: [
      ["Design product catalog schema (categories, brands, specs)", "DONE", "HIGH", 5, "Store laptop specifications, stock quantity and product images."],
      ["Build product listing page with price and brand filters", "DONE", "HIGH", 5, "Filter by RAM, CPU, price range and sort by popularity."],
      ["Shopping cart state management and local storage sync", "DONE", "HIGH", 3, "Keep cart items when user refreshes the page before logging in."],
      ["Fix bug cart quantity exceeding available stock", "DONE", "CRITICAL", 2, "Check current inventory count before incrementing item quantity."],
      ["Integrate VNPay sandbox payment gateway", "IN_REVIEW", "CRITICAL", 8, "Generate payment URL, verify checksum signature on return callback."],
      ["Generate dynamic VietQR code on checkout page", "IN_PROGRESS", "HIGH", 5, "Display QR code with exact order amount and order code in transfer content."],
      ["Calculate shipping fee by province/district (GHN API)", "IN_PROGRESS", "MEDIUM", 5, "Fetch province, district, ward list and estimate delivery fee."],
      ["Admin order management table and status update", "DONE", "HIGH", 5, "Allow admin to confirm orders, mark as shipping or cancelled."],
      ["Send order confirmation email using Nodemailer", "TODO", "MEDIUM", 3, "Send invoice summary after successful checkout."],
      ["Add voucher and discount code validation", "IN_REVIEW", "MEDIUM", 3, "Check expiration date, minimum order value and usage limit."],
      ["Product review and 5-star rating section", "TODO", "LOW", 3, "Only allow users who purchased the item to leave a review."],
      ["Optimize product images using Next/Image", "DONE", "LOW", 2, null],
      ["Flash sale countdown timer on home banner", "TODO", "LOW", 2, null],
      ["Export monthly revenue report to CSV for admin", "TODO", "MEDIUM", 5, null],
    ],
  },
  {
    key: "LMS",
    name: "UniCourse Study Portal",
    description: "Cong thong tin quan ly lop hoc, nop bai tap lon va tra cuu diem cho sinh vien.",
    color: "#f59e0b",
    issues: [
      ["Student and lecturer role-based login", "DONE", "CRITICAL", 5, "Separate permissions for lecturers (create assignments, grade) and students (submit work)."],
      ["Course enrollment by class code", "DONE", "HIGH", 3, "Students can join a class section using a 6-character code from lecturer."],
      ["Upload lecture slides and PDF materials", "DONE", "MEDIUM", 3, null],
      ["Assignment submission with deadline lock", "DONE", "HIGH", 5, "Block file uploads after the due date unless late submission is enabled."],
      ["Fix file upload error when filename contains Vietnamese accents", "DONE", "HIGH", 2, "Normalize file names before saving to storage."],
      ["Grading interface and feedback comments for lecturers", "IN_PROGRESS", "HIGH", 5, "Enter score (0-10 scale) and attach review comments for each student."],
      ["Group registration for final capstone project", "IN_REVIEW", "MEDIUM", 5, "Allow 3-5 students to form a team and pick a project topic."],
      ["Export class grade sheet to Excel (.xlsx)", "IN_PROGRESS", "MEDIUM", 3, "Format student ID, full name, midterm score and final score."],
      ["Dashboard reminder for upcoming assignment deadlines", "TODO", "MEDIUM", 3, "Show assignments due within the next 3 days."],
      ["Class announcement board and Q&A comments", "TODO", "LOW", 3, null],
      ["Attendance QR check-in during lab sessions", "TODO", "HIGH", 8, "Lecturer generates a temporary QR code for students to scan in class."],
      ["Calculate semester GPA automatically from course credits", "DONE", "LOW", 2, null],
    ],
  },
];

const toUtcMidnight = (ms: number) => new Date(Math.floor(ms / DAY) * DAY);

export interface DemoWorkspaceData {
  projects: Prisma.ProjectCreateManyInput[];
  issues: Prisma.IssueCreateManyInput[];
  logs: Prisma.ActivityLogCreateManyInput[];
}

export function buildDemoWorkspace(
  userId: string,
  memberIds: string[] = [userId],
  now: Date = new Date(),
): DemoWorkspaceData {
  const nowMs = now.getTime();
  const projects: Prisma.ProjectCreateManyInput[] = [];
  const issues: Prisma.IssueCreateManyInput[] = [];
  const logs: Prisma.ActivityLogCreateManyInput[] = [];
  const actors = memberIds.length > 0 ? memberIds : [userId];

  DEMO_PROJECTS.forEach((template, projectIdx) => {
    const projectId = `proj_${template.key.toLowerCase()}_${userId.slice(0, 8)}`;

    projects.push({
      id: projectId,
      key: template.key,
      name: template.name,
      description: template.description,
      color: template.color,
      issueCounter: template.issues.length,
      ownerId: userId,
      createdAt: new Date(nowMs - 60 * DAY),
      updatedAt: now,
    });

    const doneTotal = template.issues.filter(([, status]) => status === "DONE").length;
    let doneIndex = 0;

    template.issues.forEach(([title, status, priority, storyPoints, description], index) => {
      const issueId = randomUUID();
      const issueNumber = index + 1;
      const issueKey = `${template.key}-${issueNumber}`;
      const offset = (index * 7 + projectIdx * 3) % 11;
      const reporterId = actors[(index + projectIdx) % actors.length];

      let createdMs: number;
      let lastTransitionMs: number;
      let completedAt: Date | null = null;

      if (status === "DONE") {
        // Spread completed dates across recent weeks for velocity chart
        const ratio = doneTotal > 1 ? (doneTotal - 1 - doneIndex) / (doneTotal - 1) : 0;
        const daysAgo = Math.round(ratio * 50) + (offset % 3);
        doneIndex += 1;
        lastTransitionMs = nowMs - daysAgo * DAY - ((offset % 6) + 2) * HOUR;
        createdMs = lastTransitionMs - ((offset % 8) + 3) * DAY;
        completedAt = new Date(lastTransitionMs);
      } else {
        const daysAgo = status === "TODO" ? (offset % 18) + 2 : (offset % 14) + 5;
        createdMs = nowMs - daysAgo * DAY - ((offset % 8) + 1) * HOUR;
        lastTransitionMs = createdMs + Math.floor((nowMs - createdMs) * 0.7);
      }

      let dueDate: Date | null;
      if (status === "DONE") {
        dueDate = toUtcMidnight(createdMs + ((offset % 10) + 5) * DAY);
      } else if (index % 4 === 0) {
        dueDate = toUtcMidnight(nowMs - ((offset % 4) + 1) * DAY);
      } else if (index % 4 !== 3) {
        dueDate = toUtcMidnight(nowMs + ((offset % 12) + 2) * DAY);
      } else {
        dueDate = null;
      }

      const logBase = {
        issueId,
        issueKey,
        issueTitle: title,
        projectId,
      };

      logs.push({
        ...logBase,
        id: randomUUID(),
        type: "ISSUE_CREATED",
        toValue: "TODO",
        actorId: reporterId,
        createdAt: new Date(createdMs),
      });

      let lastActivityMs = createdMs;

      const priorityIndex = PRIORITY_ORDER.indexOf(priority);
      if (priorityIndex > 0 && index % 3 === 0) {
        const at = createdMs + Math.floor((lastTransitionMs - createdMs) * 0.25);
        logs.push({
          ...logBase,
          id: randomUUID(),
          type: "PRIORITY_CHANGED",
          field: "priority",
          fromValue: PRIORITY_ORDER[priorityIndex - 1],
          toValue: priority,
          actorId: actors[(index + 1) % actors.length],
          createdAt: new Date(at),
        });
        lastActivityMs = Math.max(lastActivityMs, at);
      }

      const steps = STATUS_FLOW.indexOf(status);
      for (let step = 1; step <= steps; step++) {
        const at = createdMs + Math.floor(((lastTransitionMs - createdMs) * step) / steps);
        logs.push({
          ...logBase,
          id: randomUUID(),
          type: "STATUS_CHANGED",
          field: "status",
          fromValue: STATUS_FLOW[step - 1],
          toValue: STATUS_FLOW[step],
          actorId: actors[(index + step) % actors.length],
          createdAt: new Date(at),
        });
        lastActivityMs = Math.max(lastActivityMs, at);
      }

      issues.push({
        id: issueId,
        number: issueNumber,
        title,
        description,
        status,
        priority,
        storyPoints,
        dueDate,
        completedAt,
        projectId,
        reporterId,
        createdAt: new Date(createdMs),
        updatedAt: new Date(lastActivityMs),
      });
    });
  });

  return { projects, issues, logs };
}

export async function resetDemoWorkspace(prisma: PrismaClient, userId: string) {
  const memberIds: string[] = [userId];

  // Ensure the other 2 team members exist in users table so issues/logs reference all 3 members
  for (const member of TEAM_MEMBERS) {
    if (member.email === "demo@worktrack.app") continue;
    const u = await prisma.user.upsert({
      where: { email: member.email },
      update: { name: member.name, isDemo: true },
      create: {
        id: member.id,
        email: member.email,
        name: member.name,
        passwordHash: "$2a$10$demoTeamMemberPlaceholderHashValue000000000000000",
        isDemo: true,
      },
      select: { id: true },
    });
    memberIds.push(u.id);
  }

  const data = buildDemoWorkspace(userId, memberIds);

  await prisma.$transaction([
    prisma.project.deleteMany({ where: { ownerId: userId } }),
    prisma.project.createMany({ data: data.projects }),
    prisma.issue.createMany({ data: data.issues }),
    prisma.activityLog.createMany({ data: data.logs }),
  ]);

  return {
    projects: data.projects.length,
    issues: data.issues.length,
    activityLogs: data.logs.length,
  };
}
