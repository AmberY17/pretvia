"use client";

import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetcher } from "@/lib/query-client";
import { queryKeys } from "@/lib/query-keys";
import { AnimatePresence, motion } from "framer-motion";
import { ClipboardCheck } from "lucide-react";
import { useRequireAuth } from "@/hooks/use-require-auth";
import { EmptyStateCard, PageHeader } from "@/components/main/shared";
import { LoadingScreen } from "@/components/loading-screen";
import { AttendancePageSkeleton } from "@/components/main/dashboard/layout";
import {
  AttendanceSessionDropdown,
  AttendanceSessionCard,
} from "@/components/main/coach/attendance";
import { toast } from "sonner";
import { format } from "date-fns";
import type { AttendanceStatus, CheckinItem, AttendanceAthlete } from "@/types/dashboard";

interface AttendanceData {
  athletes: AttendanceAthlete[];
}

export default function AttendancePage() {
  const { user, isLoading: authLoading } = useRequireAuth({ requireCoach: true });
  const queryClient = useQueryClient();
  const [selectedCheckinId, setSelectedCheckinId] = useState<string | null>(
    null,
  );
  const [sessionDropdownOpen, setSessionDropdownOpen] = useState(false);
  const [sessionSearch, setSessionSearch] = useState("");
  const [entries, setEntries] = useState<Record<string, AttendanceStatus>>({});
  const [saving, setSaving] = useState(false);
  const [checkins, setCheckins] = useState<CheckinItem[]>([]);

  const filteredCheckins = sessionSearch.trim()
    ? checkins.filter((c) => {
        try {
          const label =
            (c.title || "Session") +
            " " +
            format(new Date(c.sessionDate), "MMM d, yyyy");
          return label.toLowerCase().includes(sessionSearch.trim().toLowerCase());
        } catch {
          return false;
        }
      })
    : checkins;

  const { data: checkinsData, isLoading: checkinsLoading } = useQuery<{
    checkins: CheckinItem[];
  }>({
    queryKey: [...queryKeys.checkins.all, "allSessions", user?.id, user?.activeGroupId],
    queryFn: () => apiFetcher("/api/checkins?mode=all"),
    enabled: !!user?.activeGroupId,
  });

  const attendanceUrl =
    user && selectedCheckinId
      ? `/api/attendance?checkinId=${selectedCheckinId}`
      : null;
  const { data: attendanceData, isLoading: attendanceLoading } = useQuery<AttendanceData>({
    queryKey: [...queryKeys.attendance.byCheckin(selectedCheckinId ?? ""), user?.id, user?.activeGroupId],
    queryFn: () => apiFetcher<AttendanceData>(attendanceUrl!),
    enabled: !!attendanceUrl && !!user,
  });

  useEffect(() => {
    const list = checkinsData?.checkins ?? [];
    setCheckins(list);
    setSelectedCheckinId((prev) => {
      if (list.length === 0) return null;
      if (prev && list.some((c) => c.id === prev)) return prev;
      return list[0].id;
    });
  }, [checkinsData]);

  useEffect(() => {
    if (attendanceData?.athletes) {
      const map: Record<string, AttendanceStatus> = {};
      for (const a of attendanceData.athletes) {
        if (a.status) map[a.id] = a.status as AttendanceStatus;
      }
      setEntries(map);
    }
  }, [attendanceData]);

  const handleSetStatus = (athleteId: string, status: AttendanceStatus) => {
    setEntries((prev) => ({ ...prev, [athleteId]: status }));
  };

  const handleSave = async () => {
    if (!selectedCheckinId) return;
    setSaving(true);
    try {
      const res = await fetch("/api/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          checkinId: selectedCheckinId,
          entries: Object.entries(entries)
            .filter(([, s]) => s !== null)
            .map(([userId, status]) => ({ userId, status: status! })),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to save attendance");
        return;
      }
      queryClient.invalidateQueries({ queryKey: queryKeys.attendance.byCheckin(selectedCheckinId) });
    } catch {
      toast.error("Network error");
    } finally {
      setSaving(false);
    }
  };

  const athletes = attendanceData?.athletes ?? [];
  const selectedCheckin = checkins.find((c) => c.id === selectedCheckinId);

  if (authLoading || !user || user.role !== "coach") {
    return <LoadingScreen />;
  }

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <PageHeader title="Attendance" />

      <main className="flex-1 overflow-y-auto scrollbar-hidden p-6">
        <div className="mx-auto max-w-2xl">
          <AnimatePresence mode="wait">
            {!user.activeGroupId ? (
              <motion.div
                key="empty-no-group"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
              >
                <EmptyStateCard
                  icon={ClipboardCheck}
                  message="Join a group to take attendance."
                />
              </motion.div>
            ) : user.activeGroupId && (checkinsLoading || attendanceLoading) ? (
              <motion.div
                key="skeleton"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
              >
                <AttendancePageSkeleton />
              </motion.div>
            ) : checkins.length === 0 ? (
              <motion.div
                key="empty-no-checkins"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
              >
                <EmptyStateCard
                  icon={ClipboardCheck}
                  message="Create a check-in session first."
                />
              </motion.div>
            ) : (
              <motion.div
                key="content"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="space-y-0"
              >
                <AttendanceSessionDropdown
                  checkins={checkins}
                  filteredCheckins={filteredCheckins}
                  selectedCheckinId={selectedCheckinId}
                  sessionDropdownOpen={sessionDropdownOpen}
                  sessionSearch={sessionSearch}
                  onSelectedCheckinIdChange={setSelectedCheckinId}
                  onSessionDropdownOpenChange={setSessionDropdownOpen}
                  onSessionSearchChange={setSessionSearch}
                />

                {selectedCheckin && (
                  <AttendanceSessionCard
                    selectedCheckin={selectedCheckin}
                    athletes={athletes}
                    entries={entries}
                    saving={saving}
                    onSetStatus={handleSetStatus}
                    onSave={handleSave}
                  />
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}
