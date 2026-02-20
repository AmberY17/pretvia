export type DateFilterKey = "all" | "today" | "7d" | "30d" | "custom";

export function getDateRangeParams(
  dateFilter: DateFilterKey,
  customDate: string,
): { dateFrom?: string; dateTo?: string } {
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
  } else if (dateFilter === "custom" && customDate) {
    const [y, m, d] = customDate.split("-").map(Number);
    start = new Date(y, m - 1, d, 0, 0, 0, 0);
    end = new Date(y, m - 1, d, 23, 59, 59, 999);
  } else {
    return {};
  }

  return {
    dateFrom: start.toISOString(),
    dateTo: end.toISOString(),
  };
}
