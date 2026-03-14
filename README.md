# Pretvia

**Log Your Training, Visually.**

Pretvia is an emoji-first training log platform built for athletes and coaches. Create quick, expressive session logs, get private feedback from your coach, and track progress with powerful filtering — all in one clean dashboard.

_En garde, Pretvia, Allez!_

---

## Initiatives

- **Visual-first logging** — Replace lengthy forms with emoji-based session capture that makes tracking intuitive and low-friction
- **Coach–athlete collaboration** — Connect coaches with their groups for session check-ins, announcements, and private 1-on-1 feedback on logs
- **Privacy by design** — Athletes choose whether to share logs with their coach or keep them private
- **Fast, delightful UX** — Modern UI with smooth animations and smart filtering so athletes and coaches can focus on training, not software

---

## Main Features

### For Athletes

| Feature               | Description                                                                                                              |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| **Visual Emoji Logs** | Log sessions in seconds with expressive emoji indicators. No complex forms — tap an emoji to capture how your workout felt |
| **Tags & Filtering**  | Organize logs by tags (e.g., strength, cardio) and filter by date range, tags, and more                                  |
| **Session Check-Ins** | Respond to coach check-in cards for training sessions with a single tap                                                  |
| **Privacy Controls**  | Share logs with your coach for feedback or keep them completely private                                                   |
| **Private Feedback**  | Receive personalized coaching comments directly on your logs — visible only to you and your coach                         |

### For Coaches

| Feature               | Description                                                                  |
| --------------------- | ---------------------------------------------------------------------------- |
| **Group Management**  | Create groups, invite athletes, and switch between groups                    |
| **Session Check-Ins** | Create check-in cards for training sessions; see who has logged in real time |
| **Athlete Filter**    | Filter the feed by individual athlete to review progress                     |
| **Session Filter**    | Filter logs by check-in session to see all entries for a given practice      |
| **Announcements**     | Pin announcements at the top of everyone's feed                              |
| **Private Comments**  | Leave feedback on athlete logs in a private 1-on-1 thread                    |

### Shared

- **Date range filtering** — All time, today, last 7 days, last 30 days, or custom date picker
- **Dark/Light theme** — System-aware theme switching with multiple color themes
- **Responsive layout** — Works on mobile and desktop with adaptive panels and filters

---

## Tech Stack

| Layer                  | Technologies                                         |
| ---------------------- | ---------------------------------------------------- |
| **Framework**          | Next.js 16 (App Router), React 19, TypeScript 5.7    |
| **Database**           | MongoDB (NoSQL)                                      |
| **Auth**               | JWT (jose) in httpOnly cookies, bcrypt for passwords  |
| **Styling**            | Tailwind CSS 3.4                                     |
| **UI Components**      | Radix UI, shadcn/ui                                  |
| **Data Fetching**      | SWR                                                  |
| **Forms & Validation** | React Hook Form, Zod                                 |
| **Animations**         | Framer Motion                                        |
| **Charts**             | Recharts                                             |
| **Emoji Picker**       | Emoji Mart                                           |
| **Toasts**             | Sonner                                               |
| **Email**              | Resend                                               |
| **Utilities**          | date-fns, Lucide icons                               |
| **E2E Testing**        | Cypress                                              |

---

## Getting Started

### Prerequisites

- Node.js 18+
- pnpm
- MongoDB instance (local or Atlas)

### Setup

1. Clone the repository
2. Install dependencies:
   ```bash
   pnpm install
   ```
3. Copy `.env.example` to `.env.local` and fill in the values:
   ```bash
   cp .env.example .env.local
   ```
   Required environment variables:
   - `AUTH_SECRET` — Secret key for JWT signing
   - `MONGODB_URI` — MongoDB connection string
   - `NEXT_PUBLIC_APP_URL` — App URL (default: `http://localhost:3000`)
   - `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` — Google OAuth credentials
   - `RESEND_API_KEY` / `RESEND_FROM_EMAIL` — Email service credentials
   - `TEST_ACCOUNT_EMAILS` — Comma-separated emails that bypass email verification (optional)

4. Start the development server:
   ```bash
   pnpm dev
   ```

### Available Scripts

| Script           | Description                                           |
| ---------------- | ----------------------------------------------------- |
| `pnpm dev`       | Start dev server with Turbopack                       |
| `pnpm build`     | Production build                                      |
| `pnpm start`     | Start production server                               |
| `pnpm lint`      | Run ESLint                                            |
| `pnpm e2e`       | Open Cypress test runner                              |
| `pnpm e2e:ci`    | Run E2E tests headlessly (starts dev server)          |
| `pnpm seed:test` | Seed test users for E2E testing                       |

---

## Project Structure

```
app/
├── api/              # REST API route handlers (30+ endpoints)
│   ├── auth/         # Login, signup, logout, password reset, Google OAuth
│   ├── logs/         # Training log CRUD
│   ├── comments/     # Comment threads
│   ├── checkins/     # Session check-in CRUD
│   ├── groups/       # Group management, members, roles, invites
│   ├── announcements/# Announcements CRUD
│   ├── attendance/   # Attendance tracking
│   └── ...           # tags, stats, guardian, feedback, invites
├── auth/             # Auth pages (login/signup)
├── dashboard/        # Main dashboard (athlete/coach views)
└── invite/           # Invite redemption flow

components/
├── auth/             # Auth forms and components
├── dashboard/        # Feature components (logs, filters, sidebar, etc.)
│   ├── filters/      # Filter sidebar components
│   ├── logs/         # Log creation, editing, display
│   ├── group/        # Group management UI
│   └── shared/       # Shared components (DeleteConfirmDialog, etc.)
├── landing/          # Landing page sections
├── ui/               # shadcn/ui primitives (Button, Dialog, etc.)
└── feedback/         # Feedback components

hooks/                # Custom React hooks (useAuth, useDashboardFilters, etc.)
lib/                  # Shared utilities (auth, mongodb, streak, date/time utils)
types/                # Shared TypeScript type definitions
cypress/              # E2E test suite (20 spec files across 9 feature areas)
scripts/              # Seed scripts
```

---

## Acknowledgements

[V0](https://v0.dev) was used to help implement the light/dark theme with multiple colour combination modes and the comments section.

---

## License

Private project.
