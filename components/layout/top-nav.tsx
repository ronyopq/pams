"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import clsx from "clsx";
import { getNavByRole } from "@/lib/navigation";
import { useAppContext } from "@/components/providers/app-context";

export const TopNav = () => {
  const pathname = usePathname();
  const router = useRouter();
  const { user, toggleTheme, theme, language, toggleLanguage, unreadCount, logout } = useAppContext();

  if (!user) return null;

  const navItems = getNavByRole(user.role);

  return (
    <header className="topbar">
      <div className="container-xxl topbar-inner">
        <Link href="/dashboard" className="brand-wrap text-decoration-none">
          <span className="brand-logo">P</span>
          <span>
            <strong className="brand-name">PRAAN</strong>
            <span className="brand-sub">Activity Manager</span>
          </span>
        </Link>

        <nav className="topbar-nav" aria-label="Main">
          {navItems.slice(0, 8).map((item) => (
            <Link
              key={item.href + item.label}
              href={item.href}
              className={clsx("nav-pill", pathname === item.href && "active")}
            >
              <i className={`bi ${item.icon}`} />
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="topbar-actions">
          <button className="icon-btn" onClick={toggleTheme} aria-label="Toggle theme">
            <i className={`bi ${theme === "light" ? "bi-moon" : "bi-brightness-high"}`} />
          </button>

          <button className="outline-btn" onClick={toggleLanguage}>
            {language === "en" ? "Bangla" : "English"}
          </button>

          {(user.role === "Admin" || user.role === "Manager") && (
            <Link href="/notifications" className="icon-btn text-decoration-none position-relative" aria-label="Notifications">
              <i className="bi bi-bell" />
              {unreadCount > 0 && <span className="notif-dot">{unreadCount}</span>}
            </Link>
          )}

          <details className="profile-menu">
            <summary>
              <span className="avatar">{user.fullName.charAt(0).toUpperCase()}</span>
              <span className="profile-name">{user.fullName}</span>
              <i className="bi bi-chevron-down" />
            </summary>
            <div className="profile-card">
              <p className="small text-muted mb-1">{user.username}</p>
              <p className="mb-2 fw-semibold">Role: {user.role}</p>
              <button
                className="danger-outline"
                onClick={() => {
                  logout();
                  router.push("/login");
                }}
              >
                Logout
              </button>
            </div>
          </details>
        </div>
      </div>
    </header>
  );
};