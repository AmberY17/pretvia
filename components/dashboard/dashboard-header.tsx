"use client";

import Link from "next/link";
import { Plus, ClipboardCheck, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeSwitcher } from "@/components/theme-switcher";
import type { User } from "@/hooks/use-auth";

interface DashboardHeaderProps {
  user: User;
  onNewLog?: () => void;
}

export function DashboardHeader({ user, onNewLog }: DashboardHeaderProps) {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-xl">
      <div className="flex h-14 items-center justify-between px-6">
        <div className="flex items-center gap-3">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary">
            <span className="text-xs font-bold text-primary-foreground">TL</span>
          </div>
          <span className="text-sm font-semibold text-foreground">Prets</span>
        </div>
        <div className="flex items-center gap-2">
          {user.role === "coach" && user.groupId && (
            <>
              <Link href="/dashboard/group">
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-2 text-muted-foreground hover:text-foreground"
                >
                  <Settings className="h-4 w-4" />
                  <span className="hidden sm:inline">Manage Group</span>
                </Button>
              </Link>
              <Link href="/dashboard/attendance">
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-2 text-muted-foreground hover:text-foreground"
                >
                  <ClipboardCheck className="h-4 w-4" />
                  <span className="hidden sm:inline">Attendance</span>
                </Button>
              </Link>
            </>
          )}
          {user.role !== "coach" && onNewLog && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onNewLog}
              className="gap-2 text-muted-foreground hover:text-foreground"
            >
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">New Log</span>
            </Button>
          )}
          <ThemeSwitcher />
        </div>
      </div>
    </header>
  );
}
