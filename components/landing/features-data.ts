import {
  Users,
  MessageCircle,
  ClipboardCheck,
  Settings,
  Filter,
  Megaphone,
  Smile,
  EyeOff,
  Calendar,
  Heart,
  Shield,
  Flame,
  PartyPopper,
  type LucideIcon,
} from "lucide-react";

export interface FeatureScreenshot {
  src: string;
  alt: string;
  title: string;
  description?: string;
}

export interface Feature {
  icon: LucideIcon;
  title: string;
  description: string;
  details?: string[];
  screenshot?: FeatureScreenshot;
}

export interface RoleSection {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  features: Feature[];
}

export const roleSections: RoleSection[] = [
  {
    id: "coach",
    title: "For Coaches",
    subtitle: "Lead your team with clarity and precision",
    description:
      "Manage multiple groups, track attendance, provide personalized feedback, and keep everyone informed with powerful yet simple tools.",
    features: [
      {
        icon: Users,
        title: "Multiple Groups",
        description:
          "Organize athletes into separate training groups with individual rosters, schedules, and settings.",
        details: [
          "Create unlimited training groups",
          "Set group-specific training schedules",
          "Manage roles and permissions per group",
          "Transfer athletes between groups easily",
        ],
        screenshot: {
          src: "/screenshots/coach-group-switcher.png",
          alt: "Multiple Groups - Group switcher",
          title: "Multiple Groups",
          description: "Switch between training groups and see overview",
        },
      },
      {
        icon: MessageCircle,
        title: "1-on-1 Feedback",
        description:
          "Provide personalized coaching feedback directly on each athlete's training logs.",
        details: [
          "Comment on individual log entries",
          "Private conversations with each athlete",
          "Track feedback history over time",
          "Build stronger coach-athlete relationships",
        ],
        screenshot: {
          src: "/screenshots/coach-1-on-1.png",
          alt: "1-on-1 Feedback",
          title: "1-on-1 Feedback",
          description: "Provide personalized coaching feedback on training logs",
        },
      },
      {
        icon: ClipboardCheck,
        title: "Session Check-Ins",
        description:
          "Create check-in cards for training sessions and track attendance in real time.",
        details: [
          "One-tap session creation",
          "Visual progress bar for attendance",
          "Automatic reminders for athletes",
          "Historical attendance tracking",
        ],
        screenshot: {
          src: "/screenshots/coach-check-in.png",
          alt: "Session Check-Ins",
          title: "Session Check-Ins",
          description: "Track attendance with visual progress",
        },
      },
      {
        icon: Settings,
        title: "Group Management",
        description:
          "Full control over your group settings, roles, training schedules, and athlete management.",
        details: [
          "Custom athlete roles (e.g., Captain, Senior)",
          "Training schedule templates",
          "Invite athletes via email",
          "Guardian/parent linking",
        ],
        screenshot: {
          src: "/screenshots/coach-manage-group.png",
          alt: "Group Management",
          title: "Group Management",
          description: "Manage athletes, roles, and training schedules",
        },
      },
      {
        icon: Filter,
        title: "Smart Filtering",
        description:
          "Find exactly what you need with powerful filtering by athlete, date, tags, or mood.",
        details: [
          "Filter by athlete name",
          "Date range selection",
          "Tag-based filtering",
          "Emoji mood filtering",
        ],
        screenshot: {
          src: "/screenshots/coach-filters-expanded.png",
          alt: "Smart Filtering",
          title: "Smart Filtering",
          description: "Filter by athlete, date, tags, or mood",
        },
      },
      {
        icon: Megaphone,
        title: "Announcements",
        description:
          "Pin important updates that appear prominently at the top of everyone's feed.",
        details: [
          "Pinned announcement cards",
          "Visible to all group members",
          "Easy create and remove",
          "Keep team informed instantly",
        ],
        screenshot: {
          src: "/screenshots/coach-announcement.png",
          alt: "Announcements",
          title: "Announcements",
          description: "Pin important updates at the top of the feed",
        },
      },
    ],
  },
  {
    id: "athlete",
    title: "For Athletes",
    subtitle: "Log sessions your way, in seconds",
    description:
      "Simple emoji-based logging that captures how you feel without complex forms. Keep logs private or share them with your coach.",
    features: [
      {
        icon: Smile,
        title: "Easy Emoji Logging",
        description:
          "Capture how your session felt with a single tap. No complicated forms required.",
        details: [
          "One-tap emoji selection",
          "Optional notes and details",
          "Custom tags for categorization",
          "Quick and intuitive interface",
        ],
        screenshot: {
          src: "/screenshots/athlete-log-emoji.png",
          alt: "Easy Emoji Logging",
          title: "Easy Emoji Logging",
          description: "Log your session with emojis and optional notes",
        },
      },
      {
        icon: MessageCircle,
        title: "Coach Feedback",
        description:
          "Receive personalized insights and encouragement from your coach on your logs.",
        details: [
          "Direct comments from coach",
          "Two-way conversation",
          "Build on your progress",
          "Notification when coach responds",
        ],
        screenshot: {
          src: "/screenshots/coach-1-on-1-purple.png",
          alt: "Coach Feedback",
          title: "Coach Feedback",
          description: "See your logs and coach feedback in one place",
        },
      },
      {
        icon: EyeOff,
        title: "Private or Shared",
        description:
          "You control your data. Keep logs completely private, or share them for coaching.",
        details: [
          "Private by default option",
          "Share specific logs",
          "Coach sees only what you allow",
          "Full privacy control",
        ],
        screenshot: {
          src: "/screenshots/athlete-visibility.png",
          alt: "Private or Shared",
          title: "Private or Shared",
          description: "Control log visibility and privacy",
        },
      },
      {
        icon: Flame,
        title: "Streaks",
        description:
          "Build consistency with visual streak tracking. See how many sessions you've logged in a row and stay motivated.",
        details: [
          "Visual streak counter",
          "Track consecutive training days",
          "Stay motivated to keep showing up",
          "Celebrate your consistency",
        ],
        screenshot: {
          src: "/screenshots/athlete-streaks.png",
          alt: "Streaks",
          title: "Streaks",
          description: "Track your consecutive training days",
        },
      },
      {
        icon: PartyPopper,
        title: "Celebration",
        description:
          "Moments worth celebrating. Get a little confetti and recognition when you hit milestones or keep your streak alive.",
        details: [
          "Confetti when you hit milestones",
          "Moment Ready when fully prepared",
          "Recognition for your hard work",
          "Feel the win",
        ],
        screenshot: {
          src: "/screenshots/athlete-celebration.png",
          alt: "Celebration",
          title: "Celebration",
          description: "Celebrate milestones and achievements",
        },
      },
      {
        icon: Calendar,
        title: "Custom Training Schedule",
        description:
          "Set your own training days and times. Plan when you train so you stay on track and never miss a session.",
        details: [
          "Define your weekly schedule",
          "Flexible days and times",
          "See when you're due to log",
          "Works with or without coach sessions",
        ],
        screenshot: {
          src: "/screenshots/athlete-custom-schedule.png",
          alt: "Custom Training Schedule",
          title: "Custom Training Schedule",
          description: "Plan your training days and times",
        },
      },
    ],
  },
  {
    id: "guardian",
    title: "For Guardians",
    subtitle: "Stay connected with their journey",
    description:
      "See your child's training moods on a calendar view without invading their privacy. Start meaningful conversations about their day.",
    features: [
      {
        icon: Calendar,
        title: "Emoji Calendar",
        description:
          "View your child's training sessions displayed as emojis on a clean monthly or weekly calendar.",
        details: [
          "Month and week views",
          "Color-coded by mood",
          "Attendance tracking",
          "Multiple children support",
        ],
        screenshot: {
          src: "/screenshots/parent-month.png",
          alt: "Emoji Calendar",
          title: "Emoji Calendar",
          description: "See training moods at a glance",
        },
      },
      {
        icon: Heart,
        title: "Conversation Starters",
        description:
          "Each emoji tells a story. Use them to ask about training in a natural, supportive way.",
        details: [
          "See mood trends over time",
          "Natural talking points",
          "Celebrate good days",
          "Support tough sessions",
        ],
        screenshot: {
          src: "/screenshots/parent-week-purple.png",
          alt: "Conversation Starters",
          title: "Conversation Starters",
          description: "Week view for natural talking points",
        },
      },
      {
        icon: Shield,
        title: "Respectful Access",
        description:
          "View training moods without reading private details. Trust builds together.",
        details: [
          "Emoji-only visibility",
          "No private notes access",
          "Respects athlete privacy",
          "Coach-controlled linking",
        ],
      },
    ],
  },
];
