"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import useSWR from "swr";
import { urlFetcher } from "@/lib/swr-utils";
import {
  ArrowLeft,
  ClipboardCheck,
  CheckCircle2,
  XCircle,
  MinusCircle,
  Loader2,
  Save,
  User,
  ChevronDown,
  Check,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { toast } from "sonner";
import { format } from "date-fns";

type AttendanceStatus = "present" | "absent" | "excused" | null;

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
  const [checkins, setCheckins] = useState<
    { id: string; title: string | null; sessionDate: string }[]
  >([]);
  const sessionDropdownRef = useRef<HTMLDivElement>(null);

  const filteredCheckins = sessionSearch.trim()
    ? checkins.filter((c) => {
        const label =
          (c.title || "Session") +
          " " +
          format(new Date(c.sessionDate), "MMM d, yyyy");
        return label.toLowerCase().includes(sessionSearch.trim().toLowerCase());
      })
    : checkins;

  useEffect(() => {
    if (!sessionDropdownOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (
        sessionDropdownRef.current &&
        !sessionDropdownRef.current.contains(e.target as Node)
      ) {
        setSessionDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [sessionDropdownOpen]);

  const { data: checkinsData } = useSWR<{
    checkins: { id: string; title: string | null; sessionDate: string }[];
  }>(
    user?.groupId
      ? ["/api/checkins?mode=all", user.id, user.groupId]
      : null,
    urlFetcher,
  );

  const attendanceUrl =
    user && selectedCheckinId
      ? `/api/attendance?checkinId=${selectedCheckinId}`
      : null;
  const { data: attendanceData, mutate: mutateAttendance } = useSWR(
    attendanceUrl && user
      ? [attendanceUrl, user.id, user.groupId]
      : null,
    urlFetcher,
  );

  useEffect(() => {
    const list = checkinsData?.checkins ?? [];
    setCheckins(list);
    if (list.length > 0 && !selectedCheckinId) {
      setSelectedCheckinId(list[0].id);
    }
  }, [checkinsData, selectedCheckinId]);

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
      toast.success("Attendance saved");
    } catch {
      toast.error("Network error");
    } finally {
      setSaving(false);
    }
  };

  const athletes = attendanceData?.athletes ?? [];
  const selectedCheckin = checkins.find((c) => c.id === selectedCheckinId);

  if (authLoading || !user || user.role !== "coach") {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center gap-3"
        >
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground">Loading...</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-xl">
        <div className="flex h-14 items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard"
              className="flex items-center gap-2 text-muted-foreground transition-colors hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" />
              <span className="text-sm">Back</span>
            </Link>
            <div className="h-4 w-px bg-border" />
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary">
              <span className="text-xs font-bold text-primary-foreground">
                TL
              </span>
            </div>
            <span className="text-sm font-semibold text-foreground">
              Attendance
            </span>
          </div>
          <ThemeSwitcher />
        </div>
      </header>

      <main className="flex-1 overflow-y-auto p-6">
        <div className="mx-auto max-w-2xl">
          {!user.groupId ? (
            <div className="rounded-2xl border border-dashed border-border py-16 text-center">
              <ClipboardCheck className="mx-auto h-12 w-12 text-muted-foreground" />
              <p className="mt-3 text-sm text-muted-foreground">
                Join a group to take attendance.
              </p>
              <Link href="/dashboard">
                <Button variant="ghost-primary" size="sm" className="mt-4">
                  Go to Dashboard
                </Button>
              </Link>
            </div>
          ) : checkins.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border py-16 text-center">
              <ClipboardCheck className="mx-auto h-12 w-12 text-muted-foreground" />
              <p className="mt-3 text-sm text-muted-foreground">
                Create a check-in session first.
              </p>
              <Link href="/dashboard">
                <Button variant="ghost-primary" size="sm" className="mt-4">
                  Go to Dashboard
                </Button>
              </Link>
            </div>
          ) : (
            <>
              <div className="relative mb-6" ref={sessionDropdownRef}>
                <label className="mb-2 block text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Session
                </label>
                <button
                  type="button"
                  onClick={() => setSessionDropdownOpen((prev) => !prev)}
                  className="flex w-full items-center justify-between gap-2 rounded-lg border border-border bg-secondary px-3 py-2.5 text-sm text-foreground transition-colors hover:bg-secondary/80 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <span className="flex items-center gap-2 truncate">
                    <ClipboardCheck className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    {selectedCheckin
                      ? `${selectedCheckin.title || format(new Date(selectedCheckin.sessionDate), "h:mm a")} – ${format(new Date(selectedCheckin.sessionDate), "MMM d, yyyy")}`
                      : "Select session"}
                  </span>
                  <ChevronDown
                    className={`h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform ${sessionDropdownOpen ? "rotate-180" : ""}`}
                  />
                </button>
                {sessionDropdownOpen && (
                  <div className="absolute left-0 right-0 top-full z-50 mt-1 flex max-h-48 flex-col gap-1 rounded-lg border border-border bg-card p-1 shadow-lg">
                    {checkins.length >= 5 && (
                      <input
                        type="text"
                        value={sessionSearch}
                        onChange={(e) => setSessionSearch(e.target.value)}
                        placeholder="Search sessions..."
                        className="mx-1 rounded-md border border-border bg-secondary px-2 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
                      />
                    )}
                    {filteredCheckins.length === 0 ? (
                      <p className="px-2.5 py-2 text-xs text-muted-foreground">
                        No sessions match
                      </p>
                    ) : (
                      <div
                        className={`flex flex-col gap-0.5 ${
                          checkins.length > 5
                            ? "max-h-36 overflow-y-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
                            : ""
                        }`}
                      >
                        {filteredCheckins.map((c) => {
                          const isActive = selectedCheckinId === c.id;
                          const label = `${c.title || format(new Date(c.sessionDate), "h:mm a")} – ${format(new Date(c.sessionDate), "MMM d, yyyy")}`;
                          return (
                            <button
                              key={c.id}
                              type="button"
                              onClick={() => {
                                setSelectedCheckinId(c.id);
                                setSessionDropdownOpen(false);
                                setSessionSearch("");
                              }}
                              className={`flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-xs transition-colors ${
                                isActive
                                  ? "bg-primary/10 font-medium text-primary"
                                  : "text-foreground hover:bg-secondary"
                              }`}
                            >
                              <ClipboardCheck className="h-3 w-3 shrink-0" />
                              <span className="flex-1 truncate">{label}</span>
                              {isActive && (
                                <Check className="h-3 w-3 shrink-0 text-primary" />
                              )}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {selectedCheckin && (
                <div className="rounded-2xl border border-border bg-card">
                  <div className="border-b border-border px-4 py-3">
                    <h2 className="text-sm font-semibold text-foreground">
                      {selectedCheckin.title || "Session"}
                    </h2>
                    <p className="text-xs text-muted-foreground">
                      {format(
                        new Date(selectedCheckin.sessionDate),
                        "EEEE, MMMM d, yyyy",
                      )}
                    </p>
                  </div>
                  <div className="divide-y divide-border">
                    {athletes.length === 0 ? (
                      <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                        No athletes in this group yet.
                      </div>
                    ) : (
                      athletes.map((athlete) => (
                        <div
                          key={athlete.id}
                          className="flex items-center justify-between px-4 py-3"
                        >
                          <div className="flex items-center gap-3">
                            <User className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm font-medium text-foreground">
                              {athlete.displayName || athlete.email}
                            </span>
                          </div>
                          <div className="flex gap-1">
                            {(
                              [
                                [
                                  "present",
                                  "Present",
                                  CheckCircle2,
                                  "text-green-600",
                                ],
                                ["absent", "Absent", XCircle, "text-red-600"],
                                [
                                  "excused",
                                  "Excused",
                                  MinusCircle,
                                  "text-amber-600",
                                ],
                              ] as const
                            ).map(([status, label, Icon, color]) => (
                              <button
                                key={status}
                                type="button"
                                onClick={() =>
                                  handleSetStatus(
                                    athlete.id,
                                    entries[athlete.id] === status
                                      ? null
                                      : status,
                                  )
                                }
                                className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs transition-colors ${
                                  entries[athlete.id] === status
                                    ? `${color} bg-primary/10`
                                    : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                                }`}
                                title={label}
                              >
                                <Icon className="h-3.5 w-3.5" />
                                {label}
                              </button>
                            ))}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                  {athletes.length > 0 && (
                    <div className="border-t border-border px-4 py-3">
                      <Button
                        variant="ghost-primary"
                        onClick={handleSave}
                        disabled={saving}
                        className="gap-2"
                      >
                        {saving ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Save className="h-4 w-4" />
                        )}
                        Save Attendance
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
}
