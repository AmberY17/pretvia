"use client";

import { useState, useCallback, useEffect } from "react";
import { format, startOfWeek, addWeeks, subWeeks } from "date-fns";
import useSWR from "swr";
import { urlFetcher } from "@/lib/swr-utils";
import { GuardianSidebar, type GuardianPair } from "./guardian-sidebar";
import { GuardianDashboardContent } from "./guardian-dashboard-content";
import type { User } from "@/hooks/use-auth";

interface GuardianDashboardProps {
  user: User;
  onLogout: () => void;
}

export function GuardianDashboard({ user, onLogout }: GuardianDashboardProps) {
  const [selectedPairs, setSelectedPairs] = useState<GuardianPair[]>([]);
  const [viewMode, setViewMode] = useState<"month" | "week">("month");
  const [month, setMonth] = useState(() => format(new Date(), "yyyy-MM"));
  const [weekStart, setWeekStart] = useState(() => {
    const d = new Date();
    const start = startOfWeek(d, { weekStartsOn: 0 });
    return format(start, "yyyy-MM-dd");
  });

  const pairsParam =
    selectedPairs.length > 0
      ? selectedPairs.map((p) => `${p.athleteId}:${p.groupId}`).join(",")
      : "";
  const calendarUrl = viewMode === "week"
    ? `/api/guardian/calendar?weekStart=${weekStart}${pairsParam ? `&pairs=${encodeURIComponent(pairsParam)}` : ""}`
    : `/api/guardian/calendar?month=${month}${pairsParam ? `&pairs=${encodeURIComponent(pairsParam)}` : ""}`;

  const { data, isLoading, isValidating } = useSWR<{
    availablePairs: GuardianPair[];
    calendars: {
      athleteId: string;
      groupId: string;
      athleteName: string;
      groupName: string;
      dates: Record<string, string>;
      attendanceByDate: Record<string, "present" | "absent" | "excused">;
    }[];
  }>(
    user ? [calendarUrl, user.id, month, weekStart, viewMode, pairsParam] : null,
    urlFetcher,
    { keepPreviousData: true }
  );

  const availablePairs = data?.availablePairs ?? [];
  const calendars = data?.calendars ?? [];

  const handleMonthChange = useCallback((m: string) => setMonth(m), []);
  const handleWeekChange = useCallback((delta: number) => {
    setWeekStart((prev) => {
      const d = new Date(prev + "T12:00:00");
      const start = startOfWeek(d, { weekStartsOn: 0 });
      const next = delta > 0 ? addWeeks(start, 1) : subWeeks(start, 1);
      return format(next, "yyyy-MM-dd");
    });
  }, []);

  const handleViewModeChange = useCallback((mode: "month" | "week") => {
    setViewMode(mode);
    if (mode === "week") {
      const now = new Date();
      const start = startOfWeek(now, { weekStartsOn: 0 });
      setWeekStart(format(start, "yyyy-MM-dd"));
    } else {
      const d = new Date(weekStart + "T12:00:00");
      setMonth(format(d, "yyyy-MM"));
    }
  }, [month, weekStart]);

  useEffect(() => {
    if (typeof window !== "undefined" && window.innerWidth < 1024) {
      setViewMode("week");
    }
  }, []);

  const linkedAthleteIds = (user as { linkedAthleteIds?: string[] }).linkedAthleteIds ?? [];

  if (linkedAthleteIds.length === 0) {
    return (
      <div className="flex flex-1 overflow-hidden">
        <main className="flex flex-1 flex-col overflow-y-auto p-6">
          <div className="mx-auto max-w-2xl">
            <p className="rounded-xl border border-border bg-card p-6 text-center text-muted-foreground">
              No athletes linked yet. Ask your coach to send you a parent invite.
            </p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex flex-1 overflow-hidden">
      <GuardianSidebar
        user={user}
        availablePairs={availablePairs}
        selectedPairs={selectedPairs}
        onSelectedPairsChange={setSelectedPairs}
        onLogout={onLogout}
      />
      <GuardianDashboardContent
        availablePairs={availablePairs}
        selectedPairs={selectedPairs}
        onSelectedPairsChange={setSelectedPairs}
        calendars={calendars}
        isLoading={isLoading || isValidating}
        viewMode={viewMode}
        onViewModeChange={handleViewModeChange}
        month={month}
        onMonthChange={handleMonthChange}
        weekStart={weekStart}
        onWeekChange={handleWeekChange}
      />
    </div>
  );
}
