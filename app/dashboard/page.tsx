"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import useSWR from "swr";
import {
  PanelRightOpen,
  PanelRightClose,
  Plus,
  User,
  X,
  Calendar,
  CalendarDays,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { SidebarProfile } from "@/components/dashboard/sidebar-profile";
import { TagFilter } from "@/components/dashboard/tag-filter";
import { SessionFilter } from "@/components/dashboard/session-filter";
import { LogCard, type LogEntry } from "@/components/dashboard/log-card";
import { LogForm } from "@/components/dashboard/log-form";
import { LogDetail } from "@/components/dashboard/log-detail";
import { AnnouncementBanner } from "@/components/dashboard/announcement-banner";
import { CheckinCard, type CheckinItem } from "@/components/dashboard/checkin-card";
import { toast } from "sonner";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

type PanelMode = "new" | "view" | "edit" | null;

export default function DashboardPage() {
  const router = useRouter();
  const { user, isLoading: authLoading, mutate: mutateAuth } = useAuth();
  const [activeTags, setActiveTags] = useState<string[]>([]);
  const [panelMode, setPanelMode] = useState<PanelMode>(null);
  const [selectedLog, setSelectedLog] = useState<LogEntry | null>(null);
  const [filterAthleteId, setFilterAthleteId] = useState<string | null>(null);
  const [dateFilter, setDateFilter] = useState<
    "all" | "today" | "7d" | "30d" | "custom"
  >("all");
  const [customDate, setCustomDate] = useState<string>("");
  const [filterSessionId, setFilterSessionId] = useState<string | null>(null);
  const [checkinPrefill, setCheckinPrefill] = useState<{
    timestamp: string;
    checkinId: string;
  } | null>(null);

  // Build logs URL with tag filters, athlete filter, session filter, and date filter
  const logsUrl = (() => {
    const params = new URLSearchParams();
    activeTags.forEach((t) => params.append("tag", t));
    if (filterAthleteId) params.set("userId", filterAthleteId);
    if (filterSessionId) params.set("checkinId", filterSessionId);

    // Date filter
    const now = new Date();
    if (dateFilter === "today") {
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const end = new Date(start.getTime() + 86400000 - 1);
      params.set("dateFrom", start.toISOString());
      params.set("dateTo", end.toISOString());
    } else if (dateFilter === "7d") {
      const start = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate() - 6,
        0,
        0,
        0,
        0,
      );
      const end = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate(),
        23,
        59,
        59,
        999,
      );
      params.set("dateFrom", start.toISOString());
      params.set("dateTo", end.toISOString());
    } else if (dateFilter === "30d") {
      const start = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate() - 29,
        0,
        0,
        0,
        0,
      );
      const end = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate(),
        23,
        59,
        59,
        999,
      );
      params.set("dateFrom", start.toISOString());
      params.set("dateTo", end.toISOString());
    } else if (dateFilter === "custom" && customDate) {
      // Parse as local date (YYYY-MM-DD), not UTC
      const [y, m, d] = customDate.split("-").map(Number);
      const start = new Date(y, m - 1, d, 0, 0, 0, 0);
      const end = new Date(y, m - 1, d, 23, 59, 59, 999);
      params.set("dateFrom", start.toISOString());
      params.set("dateTo", end.toISOString());
    }

    const qs = params.toString();
    return qs ? `/api/logs?${qs}` : "/api/logs";
  })();

  const { data: logsData, mutate: mutateLogs } = useSWR<{ logs: LogEntry[] }>(
    user ? logsUrl : null,
    fetcher,
  );

  const { data: tagsData, mutate: mutateTags } = useSWR<{
    tags: { id: string; name: string }[];
  }>(user ? "/api/tags" : null, fetcher);

  // Fetch group members for coach athlete filter
  const { data: membersData } = useSWR<{
    members: { id: string; displayName: string; email: string; role: string }[];
  }>(
    user?.role === "coach" && user?.groupId
      ? `/api/groups?groupId=${user.groupId}`
      : null,
    fetcher,
  );
  const athletes = (membersData?.members ?? []).filter(
    (m) => m.role !== "coach",
  );

  // Fetch active check-ins for the group
  const { data: checkinsData, mutate: mutateCheckins } = useSWR<{
    checkins: CheckinItem[];
  }>(user?.groupId ? "/api/checkins" : null, fetcher);

  // Fetch all check-ins for coach session filter (including expired)
  const { data: allCheckinsData, mutate: mutateAllCheckins } = useSWR<{
    checkins: CheckinItem[];
  }>(
    user?.role === "coach" && user?.groupId
      ? "/api/checkins?mode=all"
      : null,
    fetcher,
  );

  const { data: announcementData, mutate: mutateAnnouncement } = useSWR<{
    announcement: {
      id: string;
      text: string;
      coachName: string;
      createdAt: string;
    } | null;
  }>(user?.groupId ? "/api/announcements" : null, fetcher);

  // Auth redirect
  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/auth");
    }
  }, [authLoading, user, router]);

  const handleToggleTag = useCallback((tag: string) => {
    setActiveTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag],
    );
  }, []);

  const handleClearTags = useCallback(() => {
    setActiveTags([]);
  }, []);

  const handleLogCreated = useCallback(() => {
    mutateLogs();
    mutateTags();
    mutateCheckins();
    mutateAllCheckins();
    setCheckinPrefill(null);
    setPanelMode("new");
    setSelectedLog(null);
  }, [mutateLogs, mutateTags, mutateCheckins, mutateAllCheckins]);

  const handleDeleteLog = useCallback(
    async (id: string) => {
      try {
        const res = await fetch(`/api/logs?id=${id}`, { method: "DELETE" });
        if (!res.ok) {
          toast.error("Failed to delete log");
          return;
        }
        mutateLogs();
        mutateTags();
        // If viewing/editing this log, close the panel
        if (selectedLog?.id === id) {
          setPanelMode("new");
          setSelectedLog(null);
        }
        toast.success("Log deleted");
      } catch {
        toast.error("Network error");
      }
    },
    [mutateLogs, mutateTags, selectedLog],
  );

  const handleViewLog = useCallback((log: LogEntry) => {
    setSelectedLog(log);
    setPanelMode("view");
  }, []);

  const handleEditLog = useCallback((log: LogEntry) => {
    setSelectedLog(log);
    setPanelMode("edit");
  }, []);

  const handleNewLog = useCallback(() => {
    setSelectedLog(null);
    setCheckinPrefill(null);
    setPanelMode("new");
  }, []);

  const handleCheckinLog = useCallback(
    (sessionDate: string, checkinId: string) => {
      setSelectedLog(null);
      setCheckinPrefill({ timestamp: sessionDate, checkinId });
      setPanelMode("new");
    },
    [],
  );

  const handleClosePanel = useCallback(() => {
    setPanelMode(null);
    setSelectedLog(null);
    setCheckinPrefill(null);
  }, []);

  const handleFilterAthlete = useCallback((athleteId: string | null) => {
    setFilterAthleteId(athleteId);
  }, []);

  const handleGroupChanged = useCallback(() => {
    mutateAuth();
    mutateLogs();
    mutateAnnouncement();
    mutateCheckins();
    mutateAllCheckins();
    setFilterAthleteId(null);
    setFilterSessionId(null);
  }, [mutateAuth, mutateLogs, mutateAnnouncement, mutateCheckins, mutateAllCheckins]);

  if (authLoading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center gap-3"
        >
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground">Loading dashboard...</p>
        </motion.div>
      </div>
    );
  }

  const logs = logsData?.logs ?? [];
  const tags = tagsData?.tags ?? [];
  const tagNames = tags.map((t) => t.name);
  const isPanelOpen = panelMode !== null;

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      {/* Top Bar */}
      <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-xl">
        <div className="flex h-14 items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary">
              <span className="text-xs font-bold text-primary-foreground">
                TL
              </span>
            </div>
            <span className="text-sm font-semibold text-foreground">Prets</span>
          </div>
          <div className="flex items-center gap-2">
            {user.role !== "coach" && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleNewLog}
                className="gap-2 text-muted-foreground hover:text-foreground"
              >
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">New Log</span>
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() =>
                isPanelOpen
                  ? handleClosePanel()
                  : user.role !== "coach"
                    ? handleNewLog()
                    : null
              }
              className="text-muted-foreground hover:text-foreground"
              aria-label={isPanelOpen ? "Close panel" : "Open panel"}
            >
              {isPanelOpen ? (
                <PanelRightClose className="h-4 w-4" />
              ) : (
                <PanelRightOpen className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </header>

      {/* Three-column layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Column: Profile + Tags */}
        <aside className="hidden w-72 shrink-0 flex-col gap-4 overflow-y-auto scrollbar-hidden border-r border-border p-4 lg:flex">
          <SidebarProfile
            user={user}
            onLogout={() => mutateAuth()}
            onGroupChanged={handleGroupChanged}
          />
          {/* Tag filter for athletes, Session filter for coaches */}
          {user.role === "coach" ? (
            <SessionFilter
              sessions={(allCheckinsData?.checkins ?? []).map((c) => ({
                id: c.id,
                title: c.title,
                sessionDate: c.sessionDate,
                checkedInCount: c.checkedInCount,
                totalAthletes: c.totalAthletes,
              }))}
              activeSessionId={filterSessionId}
              onSelect={(id) =>
                setFilterSessionId((prev) => (prev === id ? null : id))
              }
              onClear={() => setFilterSessionId(null)}
            />
          ) : (
            <TagFilter
              tags={tags}
              activeTags={activeTags}
              onToggle={handleToggleTag}
              onClear={handleClearTags}
            />
          )}
          {/* Date Filter */}
          <div className="flex flex-col gap-2 rounded-2xl border border-border bg-card p-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Date Range
              </h3>
              {dateFilter !== "all" && (
                <button
                  type="button"
                  onClick={() => {
                    setDateFilter("all");
                    setCustomDate("");
                  }}
                  className="rounded-md p-0.5 text-muted-foreground transition-colors hover:text-foreground"
                  aria-label="Clear date filter"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
            <div className="flex flex-col gap-0.5">
              {(
                [
                  { key: "all", label: "All Time" },
                  { key: "today", label: "Today" },
                  { key: "7d", label: "Last 7 Days" },
                  { key: "30d", label: "Last 30 Days" },
                ] as const
              ).map((opt) => (
                <button
                  key={opt.key}
                  type="button"
                  onClick={() => {
                    setDateFilter(opt.key);
                    setCustomDate("");
                  }}
                  className={`flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs transition-colors ${
                    dateFilter === opt.key
                      ? "bg-primary/10 font-medium text-primary"
                      : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                  }`}
                >
                  <CalendarDays className="h-3 w-3" />
                  {opt.label}
                </button>
              ))}
              <div className="mt-1 flex items-center gap-2">
                <Calendar className="h-3 w-3 shrink-0 text-muted-foreground" />
                <input
                  type="date"
                  value={customDate}
                  onChange={(e) => {
                    setCustomDate(e.target.value);
                    if (e.target.value) setDateFilter("custom");
                    else setDateFilter("all");
                  }}
                  className={`w-full rounded-lg border border-border bg-secondary px-2 py-1 text-xs text-foreground [color-scheme:dark] ${
                    dateFilter === "custom"
                      ? "border-primary/30 ring-1 ring-primary/20"
                      : ""
                  }`}
                />
              </div>
            </div>
          </div>

          {/* Athlete Filter (Coach only) */}
          {user.role === "coach" && athletes.length > 0 && (
            <div className="flex flex-col gap-2 rounded-2xl border border-border bg-card p-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Filter by Athlete
                </h3>
                {filterAthleteId && (
                  <button
                    type="button"
                    onClick={() => handleFilterAthlete(null)}
                    className="rounded-md p-0.5 text-muted-foreground transition-colors hover:text-foreground"
                    aria-label="Clear athlete filter"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
              <div className="flex flex-col gap-0.5">
                <button
                  type="button"
                  onClick={() => handleFilterAthlete(null)}
                  className={`flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs transition-colors ${
                    !filterAthleteId
                      ? "bg-primary/10 font-medium text-primary"
                      : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                  }`}
                >
                  <User className="h-3 w-3" />
                  All Athletes
                </button>
                {athletes.map((athlete) => (
                  <button
                    key={athlete.id}
                    type="button"
                    onClick={() => handleFilterAthlete(athlete.id)}
                    className={`flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs transition-colors ${
                      filterAthleteId === athlete.id
                        ? "bg-primary/10 font-medium text-primary"
                        : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                    }`}
                  >
                    <User className="h-3 w-3" />
                    {athlete.displayName || athlete.email}
                  </button>
                ))}
              </div>
            </div>
          )}
        </aside>

        {/* Middle Column: Log Feed */}
        <main className="flex-1 overflow-y-auto scrollbar-hidden p-6">
          <div className="mx-auto max-w-2xl">
            {/* Mobile tag filter (athletes only) */}
            {user.role !== "coach" && (
              <div className="mb-4 lg:hidden">
                <TagFilter
                  tags={tags}
                  activeTags={activeTags}
                  onToggle={handleToggleTag}
                  onClear={handleClearTags}
                />
              </div>
            )}

            {/* Mobile athlete filter (Coach only) */}
            {user.role === "coach" && athletes.length > 0 && (
              <div className="mb-4 flex flex-wrap gap-1.5 lg:hidden">
                <button
                  type="button"
                  onClick={() => handleFilterAthlete(null)}
                  className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs transition-colors ${
                    !filterAthleteId
                      ? "bg-primary/10 font-medium text-primary"
                      : "bg-secondary text-muted-foreground hover:text-foreground"
                  }`}
                >
                  All
                </button>
                {athletes.map((athlete) => (
                  <button
                    key={athlete.id}
                    type="button"
                    onClick={() => handleFilterAthlete(athlete.id)}
                    className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs transition-colors ${
                      filterAthleteId === athlete.id
                        ? "bg-primary/10 font-medium text-primary"
                        : "bg-secondary text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {athlete.displayName || athlete.email}
                  </button>
                ))}
              </div>
            )}

            {/* Mobile date filter */}
            <div className="mb-4 flex flex-wrap items-center gap-1.5 lg:hidden">
              {(
                [
                  { key: "all", label: "All" },
                  { key: "today", label: "Today" },
                  { key: "7d", label: "7 Days" },
                  { key: "30d", label: "30 Days" },
                ] as const
              ).map((opt) => (
                <button
                  key={opt.key}
                  type="button"
                  onClick={() => {
                    setDateFilter(opt.key);
                    setCustomDate("");
                  }}
                  className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs transition-colors ${
                    dateFilter === opt.key
                      ? "bg-primary/10 font-medium text-primary"
                      : "bg-secondary text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
              <input
                type="date"
                value={customDate}
                onChange={(e) => {
                  setCustomDate(e.target.value);
                  if (e.target.value) setDateFilter("custom");
                  else setDateFilter("all");
                }}
                className={`rounded-full border border-border bg-secondary px-2.5 py-1 text-xs text-foreground [color-scheme:dark] ${
                  dateFilter === "custom"
                    ? "border-primary/30 bg-primary/10 text-primary"
                    : ""
                }`}
              />
            </div>

            {/* Announcement Banner */}
            {user.groupId && (
              <AnnouncementBanner
                announcement={announcementData?.announcement ?? null}
                isCoach={user.role === "coach"}
                onMutate={() => mutateAnnouncement()}
              />
            )}

            {/* Check-In Cards */}
            {user.groupId && (
              <CheckinCard
                checkins={checkinsData?.checkins ?? []}
                isCoach={user.role === "coach"}
                onCheckinLog={handleCheckinLog}
                onMutate={() => {
                  mutateCheckins();
                  mutateAllCheckins();
                }}
              />
            )}

            {/* Feed header */}
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h1 className="text-xl font-bold text-foreground">
                  Training Feed
                </h1>
                <p className="text-sm text-muted-foreground">
                  {logs.length} {logs.length === 1 ? "entry" : "entries"}
                  {(activeTags.length > 0 ||
                    dateFilter !== "all" ||
                    filterSessionId) &&
                    " (filtered)"}
                  {filterAthleteId &&
                    (() => {
                      const athlete = athletes.find(
                        (a) => a.id === filterAthleteId,
                      );
                      return athlete
                        ? ` · ${athlete.displayName || athlete.email}`
                        : "";
                    })()}
                </p>
              </div>

              {/* Mobile new log button */}
              {user.role !== "coach" && (
                <Button
                  size="sm"
                  className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90 lg:hidden"
                  onClick={handleNewLog}
                >
                  <Plus className="h-4 w-4" />
                  Log
                </Button>
              )}
            </div>

            {/* Log entries */}
            <div className="flex flex-col gap-3">
              <AnimatePresence mode="popLayout">
                {logs.length === 0 ? (
                  <motion.div
                    key="empty"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border py-16"
                  >
                    <span className="text-4xl">{"\u{1F3CB}\u{FE0F}"}</span>
                    <p className="text-sm text-muted-foreground">
                      No logs yet. Create your first entry!
                    </p>
                  </motion.div>
                ) : (
                  logs.map((log, i) => (
                    <LogCard
                      key={log.id}
                      log={log}
                      onDelete={handleDeleteLog}
                      onEdit={handleEditLog}
                      onClick={handleViewLog}
                      index={i}
                      currentUserId={user.id}
                      isCoach={user.role === "coach"}
                    />
                  ))
                )}
              </AnimatePresence>
            </div>
          </div>
        </main>

        {/* Right Column: Dynamic panel (Collapsible) */}
        <AnimatePresence>
          {isPanelOpen && (
            <motion.aside
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 380, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              className="hidden shrink-0 overflow-hidden border-l border-border lg:block"
            >
              <div className="h-full w-[380px] overflow-y-auto scrollbar-hidden p-5">
                <AnimatePresence mode="wait">
                  {panelMode === "new" && user.role !== "coach" && (
                    <motion.div
                      key="new"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ duration: 0.2 }}
                    >
                      <LogForm
                        onLogCreated={handleLogCreated}
                        onClose={handleClosePanel}
                        existingTags={tagNames}
                        prefillTimestamp={checkinPrefill?.timestamp ?? null}
                        checkinId={checkinPrefill?.checkinId ?? null}
                      />
                    </motion.div>
                  )}

                  {panelMode === "view" && selectedLog && (
                    <motion.div
                      key={`view-${selectedLog.id}`}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ duration: 0.2 }}
                    >
                      <LogDetail
                        log={selectedLog}
                        onClose={handleClosePanel}
                        onEdit={handleEditLog}
                        onDelete={handleDeleteLog}
                        isCoach={user.role === "coach"}
                      />
                    </motion.div>
                  )}

                  {panelMode === "edit" &&
                    selectedLog &&
                    user.role !== "coach" && (
                      <motion.div
                        key={`edit-${selectedLog.id}`}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        transition={{ duration: 0.2 }}
                      >
                        <LogForm
                          editLog={selectedLog}
                          onLogCreated={handleLogCreated}
                          onClose={() => {
                            setPanelMode("view");
                          }}
                          existingTags={tagNames}
                        />
                      </motion.div>
                    )}
                </AnimatePresence>
              </div>
            </motion.aside>
          )}
        </AnimatePresence>

        {/* Mobile panel overlay */}
        <AnimatePresence>
          {isPanelOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-end justify-center bg-background/80 backdrop-blur-sm lg:hidden"
              onClick={(e) => {
                if (e.target === e.currentTarget) handleClosePanel();
              }}
            >
              <motion.div
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                exit={{ y: "100%" }}
                transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                className="max-h-[85vh] w-full max-w-lg overflow-y-auto scrollbar-hidden rounded-t-3xl border border-border bg-card p-6 pb-10"
              >
                {panelMode === "new" && user.role !== "coach" && (
                  <LogForm
                    onLogCreated={() => {
                      handleLogCreated();
                      handleClosePanel();
                    }}
                    onClose={handleClosePanel}
                    existingTags={tagNames}
                    prefillTimestamp={checkinPrefill?.timestamp ?? null}
                    checkinId={checkinPrefill?.checkinId ?? null}
                  />
                )}
                {panelMode === "view" && selectedLog && (
                  <LogDetail
                    log={selectedLog}
                    onClose={handleClosePanel}
                    onEdit={handleEditLog}
                    onDelete={handleDeleteLog}
                    isCoach={user.role === "coach"}
                  />
                )}
                {panelMode === "edit" &&
                  selectedLog &&
                  user.role !== "coach" && (
                    <LogForm
                      editLog={selectedLog}
                      onLogCreated={() => {
                        handleLogCreated();
                        handleClosePanel();
                      }}
                      onClose={handleClosePanel}
                      existingTags={tagNames}
                    />
                  )}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
