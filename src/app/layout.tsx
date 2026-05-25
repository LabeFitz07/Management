import type { Metadata } from "next";
import Script from "next/script";
import { APP_THEME_STORAGE_KEY, AppThemeProvider } from "@/components/dashboard/DashboardThemeProvider";
import "./globals.css";

export const metadata: Metadata = {
  title: "Task Management System",
  description: "A responsive task management app with login, task CRUD, and status tracking.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased" suppressHydrationWarning>
      <body className="min-h-full flex flex-col">
        <Script id="dashboard-theme-init" strategy="beforeInteractive">
          {`(() => {
            try {
              const storedTheme = window.localStorage.getItem("${APP_THEME_STORAGE_KEY}");
              const theme = storedTheme === "dark" || storedTheme === "light"
                ? storedTheme
                : (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
              const root = document.documentElement;
              root.dataset.theme = theme;
              root.classList.toggle("dark", theme === "dark");
            } catch {}
          })();`}
        </Script>
        <AppThemeProvider>{children}</AppThemeProvider>
      </body>
    </html>
  );
}
