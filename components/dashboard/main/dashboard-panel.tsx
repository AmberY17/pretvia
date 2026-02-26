"use client";

import { motion, AnimatePresence } from "framer-motion";
import { LogForm } from "@/components/dashboard/logs/log-form";
import { LogDetail } from "@/components/dashboard/logs/log-detail";
import { ConfettiCelebration } from "@/components/dashboard/shared/confetti-celebration";
import type { User } from "@/hooks/use-auth";
import type { LogEntry } from "@/components/dashboard/logs/log-card";

export interface PanelState {
  panelMode: "new" | "view" | "edit" | null;
  selectedLog: LogEntry | null;
  checkinPrefill: { timestamp: string; checkinId: string } | null;
  celebrationCount: number | null;
  isPanelOpen: boolean;
}

export interface PanelHandlers {
  handleLogCreated: (totalCount?: number) => void;
  handleCelebrationDismiss: () => void;
  handleClosePanel: () => void;
  handleCloseEditToView?: () => void;
  handleEditLog: (log: LogEntry) => void;
  handleDeleteLog: (id: string) => void;
  handleMutateLogs: () => void;
}

interface DashboardPanelProps {
  user: User;
  panelState: PanelState;
  panelHandlers: PanelHandlers;
  tagNames: string[];
}

export function DashboardPanel({
  user,
  panelState,
  panelHandlers,
  tagNames,
}: DashboardPanelProps) {
  const { panelMode, selectedLog, checkinPrefill, celebrationCount, isPanelOpen } = panelState;
  const {
    handleLogCreated,
    handleCelebrationDismiss,
    handleClosePanel,
    handleCloseEditToView,
    handleEditLog,
    handleDeleteLog,
    handleMutateLogs,
  } = panelHandlers;

  const formProps = {
    onLogCreated: handleLogCreated,
    onClose: handleClosePanel,
    existingTags: tagNames,
    prefillTimestamp: checkinPrefill?.timestamp ?? null,
    checkinId: checkinPrefill?.checkinId ?? null,
  };

  const desktopPanelContent = (
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
            <LogForm {...formProps} />
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
              onMutateLogs={handleMutateLogs}
            />
          </motion.div>
        )}

        {panelMode === "edit" && selectedLog && user.role !== "coach" && (
          <motion.div
            key={`edit-${selectedLog.id}`}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
          >
            <LogForm
              editLog={selectedLog}
              {...formProps}
              onClose={handleCloseEditToView ?? handleClosePanel}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );

  const mobileFormProps = {
    ...formProps,
    onLogCreated: (totalCount?: number) => {
      handleLogCreated(totalCount);
      handleClosePanel();
    },
    onClose: handleClosePanel,
  };

  const mobilePanelContent = (
    <motion.div
      initial={{ y: "100%" }}
      animate={{ y: 0 }}
      exit={{ y: "100%" }}
      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
      className="max-h-[85vh] w-full max-w-lg overflow-y-auto scrollbar-hidden rounded-t-3xl border border-border bg-card p-6 pb-10"
    >
      {panelMode === "new" && user.role !== "coach" && (
        <LogForm {...mobileFormProps} />
      )}
      {panelMode === "view" && selectedLog && (
        <LogDetail
          log={selectedLog}
          onClose={handleClosePanel}
          onEdit={handleEditLog}
          onDelete={handleDeleteLog}
          isCoach={user.role === "coach"}
          onMutateLogs={handleMutateLogs}
        />
      )}
      {panelMode === "edit" && selectedLog && user.role !== "coach" && (
        <LogForm
          editLog={selectedLog}
          {...mobileFormProps}
          onClose={handleCloseEditToView ?? handleClosePanel}
        />
      )}
    </motion.div>
  );

  return (
    <>
      <AnimatePresence>
        {celebrationCount !== null && (
          <ConfettiCelebration
            key={celebrationCount}
            totalCount={celebrationCount}
            onDismiss={handleCelebrationDismiss}
            userId={user.id}
          />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {isPanelOpen && (
          <motion.aside
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 380, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="hidden shrink-0 overflow-hidden border-l border-border lg:block"
          >
            {desktopPanelContent}
          </motion.aside>
        )}
      </AnimatePresence>

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
            {mobilePanelContent}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
