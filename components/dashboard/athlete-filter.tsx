"use client";

import { User, X } from "lucide-react";

type Athlete = {
  id: string;
  displayName: string;
  email: string;
};

interface AthleteFilterProps {
  athletes: Athlete[];
  filterAthleteId: string | null;
  onFilter: (athleteId: string | null) => void;
  variant?: "sidebar" | "mobile";
}

export function AthleteFilter({
  athletes,
  filterAthleteId,
  onFilter,
  variant = "sidebar",
}: AthleteFilterProps) {
  if (athletes.length === 0) return null;

  const isSidebar = variant === "sidebar";

  const buttonBase =
    "text-xs transition-colors " +
    (isSidebar
      ? "flex items-center gap-2 rounded-lg px-2.5 py-1.5"
      : "inline-flex items-center gap-1 rounded-full px-2.5 py-1");

  const buttonActive = "bg-primary/10 font-medium text-primary";
  const buttonInactive = isSidebar
    ? "text-muted-foreground hover:bg-secondary hover:text-foreground"
    : "bg-secondary text-muted-foreground hover:text-foreground";

  if (isSidebar) {
    return (
      <div className="flex flex-col gap-2 rounded-2xl border border-border bg-card p-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Filter by Athlete
          </h3>
          {filterAthleteId && (
            <button
              type="button"
              onClick={() => onFilter(null)}
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
            onClick={() => onFilter(null)}
            className={`${buttonBase} ${
              !filterAthleteId ? buttonActive : buttonInactive
            }`}
          >
            <User className="h-3 w-3" />
            All Athletes
          </button>
          <div
            className={`flex flex-col gap-0.5 ${
              athletes.length > 5
                ? "max-h-32 overflow-y-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
                : ""
            }`}
          >
            {athletes.map((athlete) => (
              <button
                key={athlete.id}
                type="button"
                onClick={() => onFilter(athlete.id)}
                className={`${buttonBase} ${
                  filterAthleteId === athlete.id ? buttonActive : buttonInactive
                }`}
              >
                <User className="h-3 w-3" />
                {athlete.displayName || athlete.email}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mb-4 flex flex-wrap gap-1.5 lg:hidden">
      <button
        type="button"
        onClick={() => onFilter(null)}
        className={`${buttonBase} ${
          !filterAthleteId ? buttonActive : buttonInactive
        }`}
      >
        All
      </button>
      {athletes.map((athlete) => (
        <button
          key={athlete.id}
          type="button"
          onClick={() => onFilter(athlete.id)}
          className={`${buttonBase} ${
            filterAthleteId === athlete.id ? buttonActive : buttonInactive
          }`}
        >
          {athlete.displayName || athlete.email}
        </button>
      ))}
    </div>
  );
}
