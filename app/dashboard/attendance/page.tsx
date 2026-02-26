"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import { urlFetcher } from "@/lib/swr-utils";
import { ClipboardCheck } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { EmptyStateCard } from "@/components/ui/empty-state-card";
import { PageHeader } from "@/components/dashboard/shared/page-header";
import { LoadingScreen } from "@/components/ui/loading-screen";
import {
  AttendanceSessionDropdown,
  type CheckinItem,
} from "@/components/dashboard/attendance/attendance-session-dropdown";
import { AttendanceSessionCard } from "@/components/dashboard/attendance/attendance-session-card";
import { toast } from "sonner";
import { format } from "date-fns";
import type { AttendanceStatus } from "@/types/dashboard";

export default function AttendancePage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
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

  const { data: checkinsData } = useSWR<{
    checkins: CheckinItem[];
  }>(
    user?.groupId ? ["/api/checkins?mode=all", user.id, user.groupId] : null,
    urlFetcher,
  );

  const attendanceUrl =
    user && selectedCheckinId
      ? `/api/attendance?checkinId=${selectedCheckinId}`
      : null;
  const { data: attendanceData, mutate: mutateAttendance } = useSWR(
    attendanceUrl && user ? [attendanceUrl, user.id, user.groupId] : null,
    urlFetcher,
  );

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
        map[a.id] = a.status;
      }
      setEntries(map);
    }
  }, [attendanceData]);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/auth");
    } else if (!authLoading && user?.role !== "coach") {
      router.push("/dashboard");
    }
  }, [authLoading, user, router]);

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
      mutateAttendance();
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
    <div className="flex min-h-screen flex-col">
      <PageHeader title="Attendance" />

      <main className="flex-1 overflow-y-auto p-6">
        <div className="mx-auto max-w-2xl">
          {!user.groupId ? (
            <EmptyStateCard
              icon={ClipboardCheck}
              message="Join a group to take attendance."
            />
          ) : checkins.length === 0 ? (
            <EmptyStateCard
              icon={ClipboardCheck}
              message="Create a check-in session first."
            />
          ) : (
            <>
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
            </>
          )}
        </div>
      </main>
    </div>
  );
}
