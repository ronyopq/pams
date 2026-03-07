import { TopNav } from "@/components/layout/top-nav";

export const AppShell = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className="app-shell">
      <TopNav />
      <main className="app-main">
        <div className="container-xxl py-4">{children}</div>
      </main>
    </div>
  );
};