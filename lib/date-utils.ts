export type DateFilterKey = "all" | "today" | "7d" | "30d" | "custom";

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
