export const queryKeys = {
  auth: {
    session: ["auth", "session"] as const,
  },
  logs: {
    all: ["logs"] as const,
    list: (filters: Record<string, unknown>) =>
      ["logs", "list", filters] as const,
  },
  tags: {
    all: ["tags"] as const,
    byUser: (userId: string) => ["tags", userId] as const,
  },
  members: {
    all: ["members"] as const,
    byGroup: (groupId: string) => ["members", groupId] as const,
  },
  checkins: {
    all: ["checkins"] as const,
    active: (groupId: string) => ["checkins", "active", groupId] as const,
    allSessions: (groupId: string) =>
      ["checkins", "allSessions", groupId] as const,
  },
  stats: {
    all: ["stats"] as const,
    byUser: (userId: string) => ["stats", userId] as const,
  },
  announcements: {
    all: ["announcements"] as const,
    byGroup: (groupId: string) => ["announcements", groupId] as const,
  },
  comments: {
    byLog: (logId: string) => ["comments", logId] as const,
  },
  attendance: {
    byCheckin: (checkinId: string) => ["attendance", checkinId] as const,
  },
  guardian: {
    calendar: (params: string) => ["guardian", "calendar", params] as const,
  },
  groups: {
    coachGroups: ["groups", "coachGroups"] as const,
    myGroups: ["groups", "myGroups"] as const,
    trainingSchedule: (groupId: string) =>
      ["groups", "trainingSchedule", groupId] as const,
  },
  guardians: {
    byAthlete: (groupId: string, athleteId: string) =>
      ["guardians", groupId, athleteId] as const,
  },
} as const;
