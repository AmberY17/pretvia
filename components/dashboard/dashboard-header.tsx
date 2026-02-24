"use client";

import Image from "next/image";
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
          <Image
            src="/logo.png"
            alt="Pretvia"
            width={24}
            height={24}
            className="h-6 w-6 object-contain dark:hidden"
          />
          <Image
            src="/logo_dark_white.png"
            alt="Pretvia"
            width={24}
            height={24}
            className="hidden h-6 w-6 object-contain dark:block"
          />
          <span className="font-brand text-sm font-semibold uppercase tracking-[0.15em] text-foreground">Pretvia</span>
        </div>
        <div className="flex items-center gap-2">
          {user.role === "coach" && user.groupId && (
            <>
              <Link href="/dashboard/group">
                <Button
                  variant="ghost-secondary"
                  size="sm"
                  className="gap-2"
                >
                  <Settings className="h-4 w-4" />
                  <span className="hidden sm:inline">Manage Group</span>
                </Button>
              </Link>
              <Link href="/dashboard/attendance">
                <Button
                  variant="ghost-secondary"
                  size="sm"
                  className="gap-2"
                >
                  <ClipboardCheck className="h-4 w-4" />
                  <span className="hidden sm:inline">Attendance</span>
                </Button>
              </Link>
            </>
          )}
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
          <ThemeSwitcher />
        </div>
      </div>
    </header>
  );
}
