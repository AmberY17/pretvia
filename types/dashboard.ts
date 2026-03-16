/** Group member (from groups API) */
export type Member = {
  id: string;
  displayName: string;
  email: string;
  role: string;
  roleIds: string[];
  /** First name (if available) */
  firstName?: string;
  /** Last name (if available) */
  lastName?: string;
  /** Date of birth ISO string (athletes only) */
  dateOfBirth?: string;
  /** True if this row represents a pending invite, not yet a real member */
  status?: "pending";
};

/** Pending athlete from an unredeemed invite */
export type PendingAthlete = {
  id: string;
  displayName: string;
  email: string;
  status: "pending";
};

/** Invite type */
export type InviteType = "under13_parent" | "athlete" | "parent";

/** Linked guardian for an athlete */
export type Guardian = {
  id: string;
  displayName: string;
  email: string;
};

/** Custom role within a group */
export type Role = {
  id: string;
  name: string;
};

/** Athlete summary used in filters and lists */
export type Athlete = {
  id: string;
  displayName: string;
  email: string;
};

/** Training session used in session filters and sidebar */
export type SessionItem = {
  id: string;
  title: string | null;
  sessionDate: string;
  checkedInCount: number;
  totalAthletes: number;
};

/** Base training slot (day + time) */
export type TrainingSlot = {
  dayOfWeek: number;
  time: string;
};

/** Training schedule slot with optional source group */
export type TrainingSlotItem = {
  dayOfWeek: number;
  time: string;
  sourceGroupId?: string;
};

/** Review status for coach log review */
export type ReviewStatus = "pending" | "reviewed" | "revisit";

/** Review status filter value (includes null for "all") */
export type ReviewStatusFilterValue = ReviewStatus | null;

/** Visibility filter value for athlete log type filter (includes null for "all") */
export type VisibilityFilterValue = "coach" | "private" | null;

/** Attendance status for a session */
export type AttendanceStatus = "present" | "absent" | "excused" | null;

/** Check-in session card */
export type CheckinItem = {
  id: string;
  groupId: string;
  coachId: string;
  title: string | null;
  sessionDate: string;
  createdAt: string;
  expiresAt: string;
  checkedInCount: number;
  totalAthletes: number;
  hasUserLogged: boolean;
  userLogId: string | null;
};

/** Announcement from a coach */
export type Announcement = {
  id: string;
  text: string;
  coachName: string;
  createdAt: string;
};

/** Training log entry (from logs API) */
export type LogEntry = {
  id: string;
  emoji: string;
  timestamp: string;
  visibility: "coach" | "private";
  notes: string;
  tags: string[];
  userId: string;
  userName: string;
  isOwn: boolean;
  checkinId?: string | null;
  createdAt: string;
  reviewStatus?: ReviewStatus;
};
