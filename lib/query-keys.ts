export const queryKeys = {
  auth: {
    session: ["auth", "session"] as const,
  },
  logs: {
    all: ["logs"] as const,
  },
  tags: {
    all: ["tags"] as const,
  },
  members: {
    all: ["members"] as const,
  },
  checkins: {
    all: ["checkins"] as const,
  },
  stats: {
    all: ["stats"] as const,
  },
  announcements: {
    all: ["announcements"] as const,
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
  club: {
    overview: ["club", "overview"] as const,
  },
} as const;
