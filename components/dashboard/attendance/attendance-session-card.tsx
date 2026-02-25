"use client";

import {
  User,
  Loader2,
  Save,
  CheckCircle2,
  XCircle,
  MinusCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import type { AttendanceStatus } from "@/types/dashboard";
import type { CheckinItem } from "./attendance-session-dropdown";

interface Athlete {
  id: string;
  displayName?: string;
  email?: string;
  status?: string | null;
}

interface AttendanceSessionCardProps {
  selectedCheckin: CheckinItem;
  athletes: Athlete[];
  entries: Record<string, AttendanceStatus>;
  saving: boolean;
  onSetStatus: (athleteId: string, status: AttendanceStatus) => void;
  onSave: () => void;
}

export function AttendanceSessionCard({
  selectedCheckin,
  athletes,
  entries,
  saving,
  onSetStatus,
  onSave,
}: AttendanceSessionCardProps) {
  return (
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
                      onSetStatus(
                        athlete.id,
                        entries[athlete.id] === status ? null : status,
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
            onClick={onSave}
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
  );
}
