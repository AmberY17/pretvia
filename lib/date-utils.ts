export type DateFilterKey = "all" | "today" | "7d" | "30d" | "custom";

/** Compute age from dateOfBirth (ISO string) and format as "Age: N · MMM d" */
export function formatAgeAndBirthday(dateOfBirth: string | undefined | null): string | null {
  if (!dateOfBirth) return null;
  const dob = new Date(dateOfBirth);
  if (Number.isNaN(dob.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - dob.getFullYear();
  const m = now.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < dob.getDate())) age--;
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const mmm = monthNames[dob.getMonth()];
  return `Age: ${age} · ${mmm} ${dob.getDate()}`;
}

/** Array of ISO date strings (yyyy-MM-dd) for multiple discrete date selection */
export type CustomDateSelection = string[];

export function getDateFilterParams(
  dateFilter: DateFilterKey,
  customDates: CustomDateSelection | null,
): { dateFrom?: string; dateTo?: string; dates?: string } {
  if (dateFilter === "all") return {};
  const now = new Date();
  let start: Date;
  let end: Date;

  if (dateFilter === "today") {
    start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    end = new Date(start.getTime() + 86400000 - 1);
  } else if (dateFilter === "7d") {
    start = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() - 6,
      0,
      0,
      0,
      0,
    );
    end = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      23,
      59,
      59,
      999,
    );
  } else if (dateFilter === "30d") {
    start = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() - 29,
      0,
      0,
      0,
      0,
    );
    end = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      23,
      59,
      59,
      999,
    );
  } else if (dateFilter === "custom" && customDates && customDates.length > 0) {
    return { dates: customDates.join(",") };
  } else {
    return {};
  }

  return {
    dateFrom: start.toISOString(),
    dateTo: end.toISOString(),
  };
}
