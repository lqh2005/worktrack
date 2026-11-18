import type { Metadata } from "next";
import { Toaster } from "sonner";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "WorkTrack - Issue Tracker & Sprint Dashboard",
    template: "%s | WorkTrack",
  },
  description:
    "Agile issue tracker, Kanban board and sprint analytics built with Next.js 14, Prisma and PostgreSQL.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen font-sans">
        {children}
        <Toaster
          position="top-right"
          richColors
          closeButton
          toastOptions={{
            className: "text-sm font-medium",
          }}
        />
      </body>
    </html>
  );
}
