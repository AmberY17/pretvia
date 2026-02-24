# Pretvia

**Log Your Training, Visually.**

Pretvia is an emoji-first training log platform built for athletes and coaches. Create quick, expressive session logs, get private feedback from your coach, and track progress with powerful filtering—all in one clean dashboard.

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
| **Visual Emoji Logs** | Log sessions in seconds with expressive emoji indicators. No complex forms—tap an emoji to capture how your workout felt |
| **Tags & Filtering**  | Organize logs by tags (e.g., strength, cardio) and filter by date range, tags, and more                                  |
| **Session Check-Ins** | Respond to coach check-in cards for training sessions with a single tap                                                  |
| **Privacy Controls**  | Share logs with your coach for feedback or keep them completely private                                                  |
| **Private Feedback**  | Receive personalized coaching comments directly on your logs—visible only to you and your coach                          |

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
- **Dark/Light theme** — System-aware theme switching
- **Responsive layout** — Works on mobile and desktop with adaptive panels and filters

---

## Tech Stack

| Layer                  | Technologies                                         |
| ---------------------- | ---------------------------------------------------- |
| **Framework**          | Next.js 16 (App Router), React 19                    |
| **Database**           | MongoDB (NoSQL)                                      |
| **Auth**               | JWT (jose) in httpOnly cookies, bcrypt for passwords |
| **Styling**            | Tailwind CSS                                         |
| **UI Components**      | Radix UI, shadcn/ui                                  |
| **Data Fetching**      | SWR                                                  |
| **Forms & Validation** | React Hook Form, Zod                                 |
| **Animations**         | Framer Motion                                        |
| **Charts**             | Recharts                                             |
| **Emoji Picker**       | Emoji Mart                                           |
| **Toasts**             | Sonner                                               |
| **Utilities**          | date-fns, Lucide icons                               |

---

## Project Structure

```
├── app/
│   ├── api/           # API routes (auth, logs, comments, checkins, announcements, groups, tags)
│   ├── auth/          # Auth page (login/signup)
│   ├── dashboard/     # Main dashboard
│   ├── layout.tsx
│   └── page.tsx       # Landing page
├── components/
│   ├── dashboard/     # Log form, log card, comment section, checkin card, filters, etc.
│   └── ui/            # shadcn components
├── hooks/             # useAuth
├── lib/               # auth, mongodb, utils
└── ...
```

---

## Acknowledgements

[V0](https://v0.dev) was used to help implement the light/dark theme with multiple colour combination modes and the comments section.

---

## License

Private project.
