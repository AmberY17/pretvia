/** Group member (from groups API) */
export type Member = {
  id: string;
  displayName: string;
  email: string;
  role: string;
  roleIds: string[];
};

/** Custom role within a group */
export type Role = {
  id: string;
  name: string;
};

/** Training schedule slot (day + time, optional source group) */
export type TrainingSlotItem = {
  dayOfWeek: number;
  time: string;
  sourceGroupId?: string;
};

/** Attendance status for a session */
export type AttendanceStatus = "present" | "absent" | "excused" | null;
