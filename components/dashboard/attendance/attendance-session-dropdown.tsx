"use client";

import { useRef } from "react";
import { ClipboardCheck, ChevronDown, Check } from "lucide-react";
import { useClickOutside } from "@/hooks/use-click-outside";
import { format } from "date-fns";

export interface CheckinItem {
  id: string;
  title: string | null;
  sessionDate: string;
}

interface AttendanceSessionDropdownProps {
  checkins: CheckinItem[];
  filteredCheckins: CheckinItem[];
  selectedCheckinId: string | null;
  sessionDropdownOpen: boolean;
  sessionSearch: string;
  onSelectedCheckinIdChange: (id: string) => void;
  onSessionDropdownOpenChange: (open: boolean) => void;
  onSessionSearchChange: (v: string) => void;
}

export function AttendanceSessionDropdown({
  checkins,
  filteredCheckins,
  selectedCheckinId,
  sessionDropdownOpen,
  sessionSearch,
  onSelectedCheckinIdChange,
  onSessionDropdownOpenChange,
  onSessionSearchChange,
}: AttendanceSessionDropdownProps) {
  const sessionDropdownRef = useRef<HTMLDivElement>(null);

  useClickOutside(sessionDropdownRef, sessionDropdownOpen, () =>
    onSessionDropdownOpenChange(false),
  );

  const selectedCheckin = checkins.find((c) => c.id === selectedCheckinId);

  return (
    <div className="relative mb-6" ref={sessionDropdownRef}>
      <label className="mb-2 block text-xs font-medium uppercase tracking-wider text-muted-foreground">
        Session
      </label>
      <button
        type="button"
        onClick={() => onSessionDropdownOpenChange(!sessionDropdownOpen)}
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
              onChange={(e) => onSessionSearchChange(e.target.value)}
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
                      onSelectedCheckinIdChange(c.id);
                      onSessionDropdownOpenChange(false);
                      onSessionSearchChange("");
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
  );
}
