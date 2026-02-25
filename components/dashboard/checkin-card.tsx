"use client";

import React from "react";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ClipboardCheck,
  Calendar,
  Clock,
  CheckCircle2,
  Plus,
  Loader2,
  Trash2,
  Send,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { format } from "date-fns";

export interface CheckinItem {
  id: string;
  groupId: string;
  coachId: string;
  title: string | null;
  sessionDate: string;
  createdAt: string;
  expiresAt: string;
  checkedInCount: number;
  totalAthletes: number;
  hasUserLoggged: boolean;
}

interface CheckinCardProps {
  checkins: CheckinItem[];
  isCoach: boolean;
  onCheckinLog: (sessionDate: string, checkinId: string) => void;
  onMutate: () => void;
}

function toLocalDatetime(isoString?: string) {
  const d = isoString ? new Date(isoString) : new Date();
  const offset = d.getTimezoneOffset();
  const local = new Date(d.getTime() - offset * 60 * 1000);
  return local.toISOString().slice(0, 16);
}

export function CheckinCard({
  checkins,
  isCoach,
  onCheckinLog,
  onMutate,
}: CheckinCardProps) {
  const [isComposing, setIsComposing] = useState(false);
  const [title, setTitle] = useState("");
  const [sessionDate, setSessionDate] = useState(toLocalDatetime());
  const [loading, setLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const handleCreate = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/checkins", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionDate: new Date(sessionDate).toISOString(),
          title: title.trim() || null,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || "Failed to create check-in");
        return;
      }
      setTitle("");
      setSessionDate(toLocalDatetime());
      setIsComposing(false);
      onMutate();
    } catch {
      toast.error("Network error");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      const res = await fetch(`/api/checkins?id=${id}`, { method: "DELETE" });
      if (!res.ok) {
        toast.error("Failed to delete check-in");
        return;
      }
      onMutate();
    } catch {
      toast.error("Network error");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="mb-6 flex flex-col gap-3">
      {/* Active check-in cards */}
      <AnimatePresence>
        {checkins.map((checkin) => {
          const sessionDateObj = new Date(checkin.sessionDate);
          const formattedDate = format(sessionDateObj, "MMM d, yyyy");
          const formattedTime = format(sessionDateObj, "h:mm a");
          const progress =
            checkin.totalAthletes > 0
              ? Math.round(
                  (checkin.checkedInCount / checkin.totalAthletes) * 100,
                )
              : 0;

          return (
            <motion.div
              key={checkin.id}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="group/checkin relative rounded-2xl border border-checkin/20 bg-checkin/5 p-4"
            >
              <div className="flex items-start gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-checkin/10">
                  <ClipboardCheck className="h-4 w-4 text-checkin" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-checkin">
                      Session Check-In
                    </span>
                    {checkin.title && (
                      <span className="text-xs text-foreground font-medium">
                        {checkin.title}
                      </span>
                    )}
                  </div>

                  {/* Date & Time */}
                  <div className="mt-1.5 flex items-center gap-3 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {formattedDate}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {formattedTime}
                    </span>
                  </div>

                  {/* Progress */}
                  <div className="mt-3 flex items-center gap-3">
                    <div className="flex items-center gap-1.5 text-xs font-medium text-foreground">
                      <CheckCircle2 className="h-3.5 w-3.5 text-checkin" />
                      {checkin.checkedInCount}/{checkin.totalAthletes} checked
                      in
                    </div>
                    <div className="h-1.5 flex-1 rounded-full bg-secondary">
                      <div
                        className="h-full rounded-full bg-primary transition-all duration-500"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>

                  {/* Athlete action */}
                  {!isCoach && (
                    <div className="mt-3">
                      {checkin.hasUserLoggged ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                          <CheckCircle2 className="h-3 w-3" />
                          Logged
                        </span>
                      ) : (
                        <Button
                          size="sm"
                          onClick={() =>
                            onCheckinLog(checkin.sessionDate, checkin.id)
                          }
                          className="h-7 gap-1.5 bg-checkin text-xs text-checkin-foreground hover:bg-checkin/90"
                        >
                          <ClipboardCheck className="h-3 w-3" />
                          Log Session
                        </Button>
                      )}
                    </div>
                  )}
                </div>

                {/* Coach delete */}
                {isCoach && (
                  <AlertDialog
                    open={deleteConfirmId === checkin.id}
                    onOpenChange={(open) => !open && setDeleteConfirmId(null)}
                  >
                    <button
                      type="button"
                      onClick={() => setDeleteConfirmId(checkin.id)}
                      disabled={deletingId === checkin.id}
                      className="shrink-0 rounded-lg p-1.5 text-muted-foreground opacity-0 transition-opacity group-hover/checkin:opacity-100 hover:bg-destructive/10 hover:text-destructive"
                      aria-label="Remove check-in"
                    >
                      {deletingId === checkin.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Trash2 className="h-3.5 w-3.5" />
                      )}
                    </button>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>
                          Are you sure you want to delete?
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                          This session check-in will be removed.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() =>
                            deleteConfirmId && handleDelete(deleteConfirmId)
                          }
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>

      {/* Coach compose */}
      {isCoach && (
        <AnimatePresence mode="wait">
          {!isComposing ? (
            <motion.div
              key="button"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <Button
                variant="ghost-primary"
                size="sm"
                onClick={() => setIsComposing(true)}
                className="w-full gap-2"
              >
                <Plus className="h-3.5 w-3.5" />
                Create Session Check-In
              </Button>
            </motion.div>
          ) : (
            <motion.div
              key="form"
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              className="rounded-2xl border border-border bg-card p-4"
            >
              <div className="mb-3 flex items-center gap-2">
                <ClipboardCheck className="h-3.5 w-3.5 text-primary" />
                <span className="text-xs font-semibold text-foreground">
                  New Session Check-In
                </span>
              </div>

              <div className="mb-3 flex flex-col gap-3">
                <div className="flex flex-col gap-1.5">
                  <Label
                    htmlFor="checkin-title"
                    className="text-xs text-muted-foreground"
                  >
                    Title (optional)
                  </Label>
                  <Input
                    id="checkin-title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Morning Session"
                    maxLength={100}
                    className="h-8 border-border bg-secondary text-sm text-foreground placeholder:text-muted-foreground"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label
                    htmlFor="checkin-date"
                    className="text-xs text-muted-foreground"
                  >
                    Session Date & Time
                  </Label>
                  <input
                    id="checkin-date"
                    type="datetime-local"
                    value={sessionDate}
                    onChange={(e) => setSessionDate(e.target.value)}
                    className="flex h-8 w-full rounded-md border border-border bg-secondary px-3 py-1 text-sm text-foreground ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2">
                <Button
                  type="button"
                  variant="ghost-secondary"
                  size="sm"
                  onClick={() => {
                    setIsComposing(false);
                    setTitle("");
                    setSessionDate(toLocalDatetime());
                  }}
                  className="h-7 text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  variant="ghost-primary"
                  size="sm"
                  disabled={loading}
                  onClick={handleCreate}
                  className="h-7 gap-1.5 text-xs"
                >
                  {loading ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Send className="h-3 w-3" />
                  )}
                  Create
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      )}
    </div>
  );
}
