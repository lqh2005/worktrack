export const DEMO_USER = {
  id: "user_demo_worktrack",
  email: "demo@worktrack.app",
  password: "demo1234",
  name: "Lê Quốc Hưng",
} as const;

export const TEAM_MEMBERS = [
  {
    id: "user_demo_worktrack",
    email: "demo@worktrack.app",
    name: "Lê Quốc Hưng",
    role: "Backend & Database",
    color: "#4f46e5",
    initials: "QH",
  },
  {
    id: "user_team_minh",
    email: "minh.nq@worktrack.app",
    name: "Nguyễn Quang Minh",
    role: "Frontend & Kanban UI",
    color: "#0ea5e9",
    initials: "QM",
  },
  {
    id: "user_team_luong",
    email: "luong.nt@worktrack.app",
    name: "Nguyễn Thiện Lương",
    role: "Analytics & Testing",
    color: "#10b981",
    initials: "TL",
  },
] as const;
