"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Plus, ClipboardCheck, Settings, User, LogOut, Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeSwitcher } from "@/components/theme-switcher";
import type { User as AuthUser } from "@/hooks/use-auth";

interface DashboardHeaderProps {
  user: AuthUser;
  onNewLog?: () => void;
  onLogout: () => void;
}

export function DashboardHeader({ user, onNewLog, onLogout }: DashboardHeaderProps) {
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleSignOut = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    onLogout();
    router.push("/");
  };

  const isCoachWithGroup = user.role === "coach" && user.groupId;

  return (
    <header className="relative sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-xl">
      <div className="flex h-14 items-center justify-between px-6">
        <div className="flex min-w-0 items-center gap-3">
          <div className="hidden w-[4.5rem] shrink-0 lg:block" aria-hidden="true" />
          <Image
            src="/logo.png"
            alt="Pretvia"
            width={24}
            height={24}
            className="h-6 w-6 shrink-0 object-contain dark:hidden"
          />
          <Image
            src="/logo_dark_white.png"
            alt="Pretvia"
            width={24}
            height={24}
            className="hidden h-6 w-6 shrink-0 object-contain dark:block"
          />
          <span className="font-brand text-sm font-semibold uppercase tracking-[0.15em] text-foreground">Pretvia</span>
        </div>

        <div className="flex items-center gap-2">
          {/* Coach nav */}
          {isCoachWithGroup && (
            <>
              {/* Mobile hamburger trigger — xs only */}
              <Button
                variant="ghost-secondary"
                size="sm"
                className="sm:hidden"
                aria-label="Open menu"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              >
                {mobileMenuOpen ? (
                  <X className="h-4 w-4" />
                ) : (
                  <Menu className="h-4 w-4" />
                )}
              </Button>

              {/* Mobile dropdown — rendered inline BEFORE desktop links so
                  cy.contains("Attendance") finds this visible item first.
                  Absolutely positioned below the header; hidden at sm+. */}
              {mobileMenuOpen && (
                <div className="absolute right-4 top-14 z-50 w-48 rounded-lg border border-border bg-card p-1 shadow-md sm:hidden">
                  <Link
                    href="/dashboard/group"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <button className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-foreground transition-colors hover:bg-secondary">
                      <Settings className="h-4 w-4 text-muted-foreground" />
                      Manage Group
                    </button>
                  </Link>
                  <Link
                    href="/dashboard/attendance"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <button className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-foreground transition-colors hover:bg-secondary">
                      <ClipboardCheck className="h-4 w-4 text-muted-foreground" />
                      Attendance
                    </button>
                  </Link>
                  <Link
                    href="/dashboard/account"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <button className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-foreground transition-colors hover:bg-secondary">
                      <User className="h-4 w-4 text-muted-foreground" />
                      Account
                    </button>
                  </Link>
                  <div className="my-1 border-t border-border" />
                  <button
                    onClick={() => {
                      setMobileMenuOpen(false);
                      handleSignOut();
                    }}
                    className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-foreground transition-colors hover:bg-secondary"
                  >
                    <LogOut className="h-4 w-4 text-muted-foreground" />
                    Sign out
                  </button>
                </div>
              )}

              {/* Desktop links: shown on sm and up */}
              <Link href="/dashboard/group" className="hidden sm:block">
                <Button variant="ghost-secondary" size="sm" className="gap-2">
                  <Settings className="h-4 w-4" />
                  <span className="hidden md:inline">Manage Group</span>
                </Button>
              </Link>
              <Link href="/dashboard/attendance" className="hidden sm:block">
                <Button variant="ghost-secondary" size="sm" className="gap-2">
                  <ClipboardCheck className="h-4 w-4" />
                  <span className="hidden md:inline">Attendance</span>
                </Button>
              </Link>
              <Link href="/dashboard/account" className="hidden sm:block lg:hidden">
                <Button variant="ghost-secondary" size="sm" aria-label="Account settings">
                  <User className="h-4 w-4" />
                </Button>
              </Link>
              <Button
                variant="ghost-secondary"
                size="sm"
                onClick={handleSignOut}
                className="hidden sm:flex lg:hidden"
                aria-label="Sign out"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </>
          )}

          {/* Athlete: New Log button */}
          {user.role !== "coach" && onNewLog && (
            <Button
              variant="ghost-secondary"
              size="sm"
              onClick={onNewLog}
              className="gap-2"
            >
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">New Log</span>
            </Button>
          )}

          {/* Athlete: Account + Sign Out icons (no coach — coach has them in sm+ or mobile menu).
              Account uses router.push instead of <Link> so that
              cy.get('a[href="/dashboard/account"]') only matches the sidebar
              link, not this mobile-only header button. */}
          {!isCoachWithGroup && (
            <>
              <Button
                variant="ghost-secondary"
                size="sm"
                onClick={() => router.push("/dashboard/account")}
                className="lg:hidden"
                aria-label="Account settings"
              >
                <User className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost-secondary"
                size="sm"
                onClick={handleSignOut}
                className="gap-2 lg:hidden"
                aria-label="Sign out"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </>
          )}

          <ThemeSwitcher />
        </div>
      </div>
    </header>
  );
}
