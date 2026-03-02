/** Day names for training schedule selectors (0 = Sunday) */
export const DAYS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const;

/** localStorage key for coach filter order preference */
export const COACH_FILTER_ORDER_KEY = "pretvia-coach-filter-order";

/** Default order of filter sections in coach dashboard sidebar */
export const DEFAULT_COACH_ORDER = [
  "sessions",
  "role",
  "reviewStatus",
  "athlete",
  "date",
] as const;

/** Labels for coach filter sections */
export const FILTER_LABELS: Record<
  (typeof DEFAULT_COACH_ORDER)[number],
  string
> = {
  sessions: "Training Sessions",
  role: "Role",
  reviewStatus: "Review Status",
  athlete: "Athlete",
  date: "Date",
};

/** Coach filter section id (for drag-to-reorder) */
export type CoachFilterId = (typeof DEFAULT_COACH_ORDER)[number];

/** localStorage key for celebration-on-log preference */
export const CELEBRATION_KEY = "pretvia-celebration-enabled";
