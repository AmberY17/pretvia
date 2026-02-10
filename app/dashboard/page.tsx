"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import useSWR from "swr";
import { PanelRightOpen, PanelRightClose, Plus } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { SidebarProfile } from "@/components/dashboard/sidebar-profile";
import { TagFilter } from "@/components/dashboard/tag-filter";
import { LogCard, type LogEntry } from "@/components/dashboard/log-card";
import { LogForm } from "@/components/dashboard/log-form";
import { LogDetail } from "@/components/dashboard/log-detail";
import { AnnouncementBanner } from "@/components/dashboard/announcement-banner";
import { toast } from "sonner";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

type PanelMode = "new" | "view" | "edit" | null;

export default function DashboardPage() {
  const router = useRouter();
  const { user, isLoading: authLoading, mutate: mutateAuth } = useAuth();
  const [activeTags, setActiveTags] = useState<string[]>([]);
  const [panelMode, setPanelMode] = useState<PanelMode>("new");
  const [selectedLog, setSelectedLog] = useState<LogEntry | null>(null);

  // Build logs URL with tag filters
  const logsUrl =
    activeTags.length > 0
      ? `/api/logs?${activeTags
          .map((t) => `tag=${encodeURIComponent(t)}`)
          .join("&")}`
      : "/api/logs";

  const { data: logsData, mutate: mutateLogs } = useSWR<{ logs: LogEntry[] }>(
    user ? logsUrl : null,
    fetcher
  );

  const { data: tagsData, mutate: mutateTags } = useSWR<{
    tags: { id: string; name: string }[];
  }>(user ? "/api/tags" : null, fetcher);

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
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  }, []);

  const handleClearTags = useCallback(() => {
    setActiveTags([]);
  }, []);

  const handleLogCreated = useCallback(() => {
    mutateLogs();
    mutateTags();
    setPanelMode("new");
    setSelectedLog(null);
  }, [mutateLogs, mutateTags]);

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
    [mutateLogs, mutateTags, selectedLog]
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
    setPanelMode("new");
  }, []);

  const handleClosePanel = useCallback(() => {
    setPanelMode(null);
    setSelectedLog(null);
  }, []);

  const handleGroupChanged = useCallback(() => {
    mutateAuth();
    mutateLogs();
    mutateAnnouncement();
  }, [mutateAuth, mutateLogs, mutateAnnouncement]);

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
  const isPanelOpen = panelMode !== null;

  return (
    <div className="flex min-h-screen flex-col">
      {/* Top Bar */}
      <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-xl">
        <div className="flex h-14 items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary">
              <span className="text-xs font-bold text-primary-foreground">
                T
              </span>
            </div>
            <span className="text-sm font-semibold text-foreground">Prets</span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleNewLog}
              className="gap-2 text-muted-foreground hover:text-foreground"
            >
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">New Log</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() =>
                isPanelOpen ? handleClosePanel() : handleNewLog()
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
        <aside className="hidden w-72 shrink-0 flex-col gap-4 overflow-y-auto border-r border-border p-4 lg:flex">
          <SidebarProfile
            user={user}
            onLogout={() => mutateAuth()}
            onGroupChanged={handleGroupChanged}
          />
          <TagFilter
            tags={tags}
            activeTags={activeTags}
            onToggle={handleToggleTag}
            onClear={handleClearTags}
          />
        </aside>

        {/* Middle Column: Log Feed */}
        <main className="flex-1 overflow-y-auto p-6">
          <div className="mx-auto max-w-2xl">
            {/* Mobile tag filter */}
            <div className="mb-4 lg:hidden">
              <TagFilter
                tags={tags}
                activeTags={activeTags}
                onToggle={handleToggleTag}
                onClear={handleClearTags}
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

            {/* Feed header */}
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h1 className="text-xl font-bold text-foreground">
                  Training Feed
                </h1>
                <p className="text-sm text-muted-foreground">
                  {logs.length} {logs.length === 1 ? "entry" : "entries"}
                  {activeTags.length > 0 && " (filtered)"}
                </p>
              </div>

              {/* Mobile new log button */}
              <Button
                size="sm"
                className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90 lg:hidden"
                onClick={handleNewLog}
              >
                <Plus className="h-4 w-4" />
                Log
              </Button>
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
              <div className="h-full w-[380px] overflow-y-auto p-5">
                <AnimatePresence mode="wait">
                  {panelMode === "new" && (
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
                      />
                    </motion.div>
                  )}

                  {panelMode === "edit" && selectedLog && (
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
                className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-t-3xl border border-border bg-card p-6 pb-10"
              >
                {panelMode === "new" && (
                  <LogForm
                    onLogCreated={() => {
                      handleLogCreated();
                      handleClosePanel();
                    }}
                    onClose={handleClosePanel}
                  />
                )}
                {panelMode === "view" && selectedLog && (
                  <LogDetail
                    log={selectedLog}
                    onClose={handleClosePanel}
                    onEdit={handleEditLog}
                    onDelete={handleDeleteLog}
                  />
                )}
                {panelMode === "edit" && selectedLog && (
                  <LogForm
                    editLog={selectedLog}
                    onLogCreated={() => {
                      handleLogCreated();
                      handleClosePanel();
                    }}
                    onClose={handleClosePanel}
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
