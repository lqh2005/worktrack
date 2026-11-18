# WorkTrack - Agile Issue Tracker & Sprint Analytics

**Live Demo:** https://worktrack-hazel.vercel.app

WorkTrack is a full-stack web application for managing software tasks and tracking sprint progress. We built this project to practice designing relational schemas with Prisma/PostgreSQL, implementing workflow state transitions, server-side filtering/pagination, and visualizing sprint metrics in Next.js 14.

## Main Features

- **Project & Issue Management (CRUD):** Create projects with custom key prefixes (`DEV`, `SHOP`, `LMS`) and auto-incremented issue keys (`DEV-1`, `DEV-2`, ...). Each issue tracks status, priority, Story Points (`1, 2, 3, 5, 8`), and due date.
- **Workflow State Rules:** Issues follow a defined workflow (`TODO -> IN_PROGRESS -> IN_REVIEW -> DONE`) so tasks cannot skip required steps. Moving an issue to `DONE` automatically records `completedAt` for analytics.
- **List View & Kanban Board:**
  - **List View:** Server-side pagination, sorting, keyword/key search, and multi-select filters by status, priority, project, or overdue state.
  - **Kanban Board:** Drag-and-drop cards across columns or use the quick status menu on each card.
- **Sprint Analytics Dashboard:**
  - Summary KPI cards (Total issues, completion rate, burned Story Points, overdue count).
  - **Burndown Chart:** Daily remaining Story Points compared against an ideal guideline.
  - **Weekly Velocity Chart:** Completed Story Points and issues per week.
  - **Status & Priority Breakdown:** Donut and bar charts built with Recharts.
- **Activity Log:** Records changes to status, priority, story points, and due dates on each issue.
- **Demo Account:** Includes a "Login as Demo User" button (`demo@worktrack.app` / `demo1234`) with sample projects and issues so anyone can test the app without signing up.

## Tech Stack

- **Frontend:** Next.js 14 (App Router), TypeScript, Tailwind CSS, Lucide Icons, Recharts, Sonner
- **Backend:** Next.js Route Handlers (REST API), Zod validation, JWT session (`jose` + `httpOnly` cookie), `bcryptjs`
- **Database:** PostgreSQL (Neon / Supabase) + Prisma ORM

## Getting Started Locally

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Set up environment variables:**
   Copy `.env.example` to `.env` and fill in your PostgreSQL connection strings and `JWT_SECRET`:
   ```bash
   cp .env.example .env
   ```

3. **Run database migrations and seed sample data:**
   ```bash
   npm run db:deploy
   npm run db:seed
   ```

4. **Start the development server:**
   ```bash
   npm run dev
   ```
   Open `http://localhost:3000` and click **Login as Demo User**.

## Team Members

- **Lê Quốc Hưng** - Backend API, Authentication & Database Schema
- **Nguyễn Quang Minh** - Frontend UI, Issue Explorer & Kanban Board
- **Nguyễn Thiện Lương** - Sprint Analytics Dashboard & Testing