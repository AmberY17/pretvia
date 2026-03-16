"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  ClipboardCheck,
  Calendar,
  Clock,
  CheckCircle2,
  Loader2,
  Trash2,
  Pencil,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { DeleteConfirmDialog } from "@/components/ui/delete-confirm-dialog";
import { toast } from "sonner";
import { format } from "date-fns";
import type { CheckinItem } from "@/types/dashboard";

interface CheckinCardItemProps {
  checkin: CheckinItem;
  isCoach: boolean;
  onCheckinLog: (sessionDate: string, checkinId: string) => void;
  onEditCheckinLog?: (logId: string) => void;
  onMutate: () => void;
}

export function CheckinCardItem({
  checkin,
  isCoach,
  onCheckinLog,
  onEditCheckinLog,
  onMutate,
}: CheckinCardItemProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/checkins?id=${checkin.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        toast.error("Failed to delete check-in");
        return;
      }
      onMutate();
    } catch {
      toast.error("Network error");
    } finally {
      setIsDeleting(false);
    }
  };

  const sessionDateObj = new Date(checkin.sessionDate);
  const formattedDate = format(sessionDateObj, "MMM d, yyyy");
  const formattedTime = format(sessionDateObj, "h:mm a");
  const progress =
    checkin.totalAthletes > 0
      ? Math.round((checkin.checkedInCount / checkin.totalAthletes) * 100)
      : 0;

  return (
    <motion.div
      data-testid="checkin-card"
      initial={{ opacity: 0, y: 10 }}
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
              <span className="text-xs font-medium text-foreground">
                {checkin.title}
              </span>
            )}
          </div>

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

          <div className="mt-3 flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-xs font-medium text-foreground">
              <CheckCircle2 className="h-3.5 w-3.5 text-checkin" />
              {checkin.checkedInCount}/{checkin.totalAthletes} checked in
            </div>
            <div className="h-1.5 flex-1 rounded-full bg-secondary">
              <div
                className="h-full rounded-full bg-primary transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          {!isCoach && (
            <div className="mt-3 flex items-center gap-2">
              {checkin.hasUserLogged ? (
                <>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                    <CheckCircle2 className="h-3 w-3" />
                    Logged
                  </span>
                  {checkin.userLogId && onEditCheckinLog && (
                    <button
                      type="button"
                      onClick={() => onEditCheckinLog(checkin.userLogId!)}
                      className="inline-flex items-center gap-1 rounded-full border border-border px-2.5 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                    >
                      <Pencil className="h-3 w-3" />
                      Edit
                    </button>
                  )}
                </>
              ) : (
                <Button
                  size="sm"
                  onClick={() => onCheckinLog(checkin.sessionDate, checkin.id)}
                  className="h-7 gap-1.5 bg-checkin text-xs text-checkin-foreground hover:bg-checkin/90"
                >
                  <ClipboardCheck className="h-3 w-3" />
                  Log Session
                </Button>
              )}
            </div>
          )}
        </div>

        {isCoach && (
          <>
            <button
              type="button"
              onClick={() => setConfirmOpen(true)}
              disabled={isDeleting}
              className="shrink-0 rounded-lg p-1.5 text-muted-foreground opacity-0 transition-opacity group-hover/checkin:opacity-100 hover:bg-destructive/10 hover:text-destructive"
              aria-label="Remove check-in"
            >
              {isDeleting ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Trash2 className="h-3.5 w-3.5" />
              )}
            </button>
            <DeleteConfirmDialog
              open={confirmOpen}
              onOpenChange={(open) => !open && setConfirmOpen(false)}
              description="This session check-in will be removed."
              onConfirm={handleDelete}
            />
          </>
        )}
      </div>
    </motion.div>
  );
}
