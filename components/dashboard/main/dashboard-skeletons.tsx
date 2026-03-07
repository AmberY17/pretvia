"use client";

function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`animate-pulse rounded-md bg-muted ${className ?? ""}`}
      aria-hidden
      {...props}
    />
  );
}

export { Skeleton };

export function LogCardSkeleton() {
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="flex items-start gap-4">
        <Skeleton className="h-14 w-14 shrink-0 rounded-xl" />
        <div className="min-w-0 flex-1 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex gap-2">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-3 w-14" />
            </div>
            <Skeleton className="h-5 w-16 rounded-full" />
          </div>
          <div className="flex flex-wrap gap-2">
            <Skeleton className="h-5 w-12 rounded-full" />
            <Skeleton className="h-5 w-16 rounded-full" />
            <Skeleton className="h-5 w-14 rounded-full" />
          </div>
          <Skeleton className="h-4 w-full max-w-[200px]" />
        </div>
      </div>
    </div>
  );
}

export function AnnouncementSkeleton() {
  return (
    <div className="mb-6 rounded-2xl border border-primary/20 bg-primary/5 p-4">
      <div className="flex items-start gap-3">
        <Skeleton className="h-8 w-8 shrink-0 rounded-lg" />
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex gap-2">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-3 w-20" />
          </div>
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </div>
      </div>
    </div>
  );
}

export function CheckinSkeleton() {
  return (
    <div className="mb-6 rounded-2xl border border-checkin/20 bg-checkin/5 p-4">
      <div className="flex items-start gap-3">
        <Skeleton className="h-8 w-8 shrink-0 rounded-lg" />
        <div className="min-w-0 flex-1 space-y-3">
          <div className="flex items-center gap-2">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-3 w-20" />
          </div>
          <div className="flex items-center gap-3">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-3 w-16" />
          </div>
          <div className="flex items-center gap-3">
            <Skeleton className="h-3 w-28" />
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-secondary">
              <Skeleton className="h-full w-2/3 rounded-full" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function SidebarFilterSkeleton() {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
        <div className="mb-4 flex items-center justify-between">
          <Skeleton className="h-3 w-20" />
        </div>
        <div className="flex flex-col gap-3">
          <div className="space-y-2">
            <Skeleton className="h-3 w-16" />
            <div className="flex flex-wrap gap-2">
              <Skeleton className="h-7 w-14 rounded-full" />
              <Skeleton className="h-7 w-16 rounded-full" />
              <Skeleton className="h-7 w-12 rounded-full" />
              <Skeleton className="h-7 w-20 rounded-full" />
            </div>
          </div>
          <div className="space-y-2">
            <Skeleton className="h-3 w-20" />
            <div className="flex flex-wrap gap-2">
              <Skeleton className="h-7 w-20 rounded-full" />
              <Skeleton className="h-7 w-24 rounded-full" />
              <Skeleton className="h-7 w-16 rounded-full" />
            </div>
          </div>
          <div className="space-y-2">
            <Skeleton className="h-3 w-24" />
            <div className="space-y-1">
              <Skeleton className="h-8 w-full rounded-lg" />
              <Skeleton className="h-8 w-full rounded-lg" />
              <Skeleton className="h-8 w-3/4 rounded-lg" />
            </div>
          </div>
        </div>
    </div>
  );
}

export function AttendancePageSkeleton() {
  return (
    <div className="min-w-0 space-y-6">
      <div className="min-w-0">
        <Skeleton className="mb-2 h-3 w-16" />
        <div className="flex h-10 w-full min-w-0 items-center justify-between gap-2 rounded-lg border border-border bg-secondary px-3">
          <Skeleton className="h-4 min-w-0 flex-1 max-w-48" />
          <Skeleton className="h-3.5 w-3.5 shrink-0 rounded" />
        </div>
      </div>
      <div className="min-w-0 overflow-hidden rounded-2xl border border-border bg-card">
        <div className="space-y-2 border-b border-border px-4 py-3">
          <Skeleton className="h-4 w-32 max-w-full" />
          <Skeleton className="h-3 w-40 min-w-0 max-w-full" />
        </div>
        <div className="divide-y divide-border">
          {[1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className="flex min-w-0 items-center justify-between gap-2 px-4 py-3"
            >
              <div className="flex min-w-0 flex-1 items-center gap-3">
                <Skeleton className="h-4 w-4 shrink-0 rounded" />
                <Skeleton className="h-4 min-w-0 flex-1 max-w-24" />
              </div>
              <div className="flex shrink-0 gap-1">
                <Skeleton className="h-8 w-8 rounded-full sm:w-20" />
                <Skeleton className="h-8 w-8 rounded-full sm:w-20" />
                <Skeleton className="h-8 w-8 rounded-full sm:w-20" />
              </div>
            </div>
          ))}
        </div>
        <div className="border-t border-border px-4 py-3">
          <Skeleton className="h-9 w-24 rounded-lg" />
        </div>
      </div>
    </div>
  );
}

export function ManageGroupPageSkeleton() {
  return (
    <div className="space-y-8">
      <section className="rounded-2xl border border-border bg-card p-6">
        <div className="mb-4 flex items-center gap-2">
          <Skeleton className="h-4 w-4 rounded" />
          <Skeleton className="h-4 w-16" />
        </div>
        <Skeleton className="mb-4 h-3 w-full max-w-[360px]" />
        <div className="mb-4 flex flex-wrap gap-2">
          <Skeleton className="h-9 w-32 rounded-md" />
          <Skeleton className="h-9 w-24 rounded-md" />
        </div>
        <div className="flex flex-wrap gap-2">
          <Skeleton className="h-8 w-20 rounded-full" />
          <Skeleton className="h-8 w-24 rounded-full" />
          <Skeleton className="h-8 w-16 rounded-full" />
        </div>
      </section>
      <section className="rounded-2xl border border-border bg-card p-6">
        <div className="mb-4 flex items-center gap-2">
          <Skeleton className="h-4 w-4 rounded" />
          <Skeleton className="h-4 w-36" />
        </div>
        <Skeleton className="mb-4 h-3 w-full max-w-[400px]" />
        <div className="flex flex-col gap-3">
          {[1, 2].map((i) => (
            <div
              key={i}
              className="flex items-center gap-2 rounded-lg border border-border bg-secondary/50 p-3"
            >
              <Skeleton className="h-9 w-28 rounded-lg" />
              <Skeleton className="h-9 w-20 rounded-lg" />
              <Skeleton className="ml-auto h-8 w-8 shrink-0 rounded" />
            </div>
          ))}
          <Skeleton className="h-9 w-40 rounded-md" />
        </div>
      </section>
      <section className="rounded-2xl border border-border bg-card p-6">
        <div className="mb-4 flex items-center gap-2">
          <Skeleton className="h-4 w-4 rounded" />
          <Skeleton className="h-4 w-20" />
        </div>
        <div className="relative mb-4">
          <Skeleton className="h-9 w-full rounded-md" />
        </div>
        <div className="flex flex-col gap-2">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="flex items-center justify-between rounded-lg border border-border p-3"
            >
              <div className="flex items-center gap-3">
                <Skeleton className="h-8 w-8 shrink-0 rounded-full" />
                <Skeleton className="h-4 w-32" />
              </div>
              <Skeleton className="h-7 w-16 rounded-full" />
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

export function GuardianCalendarSkeleton() {
  return (
    <div className="rounded-2xl border border-border bg-card p-4 sm:p-6">
      <div className="mb-4 flex items-center justify-between">
        <Skeleton className="h-9 w-9 shrink-0 rounded" />
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-9 w-9 shrink-0 rounded" />
      </div>
      <div className="grid grid-cols-7 gap-1">
        {[1, 2, 3, 4, 5, 6, 7].map((i) => (
          <div key={i} className="py-1">
            <Skeleton className="mx-auto h-3 w-8" />
          </div>
        ))}
        {Array.from({ length: 35 }).map((_, i) => (
          <Skeleton
            key={i}
            className="min-h-[44px] rounded-lg"
          />
        ))}
      </div>
    </div>
  );
}

export function GuardianCalendarWeeklySkeleton() {
  return (
    <div className="rounded-2xl border border-border bg-card p-4 sm:p-6">
      <div className="mb-4 flex items-center justify-between">
        <Skeleton className="h-9 w-9 shrink-0 rounded" />
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-9 w-9 shrink-0 rounded" />
      </div>
      <div className="grid grid-cols-7 gap-0.5 sm:gap-1">
        {[1, 2, 3, 4, 5, 6, 7].map((i) => (
          <div key={i} className="py-1">
            <Skeleton className="mx-auto h-3 w-8" />
          </div>
        ))}
        {Array.from({ length: 7 }).map((_, i) => (
          <Skeleton
            key={i}
            className="min-h-[48px] rounded-lg sm:min-h-[44px]"
          />
        ))}
      </div>
    </div>
  );
}

export function SidebarStatsCardSkeleton() {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <Skeleton className="h-4 w-20" />
        </div>
        <div className="flex items-center justify-between">
          <Skeleton className="h-4 w-28" />
        </div>
        <div className="flex flex-wrap gap-2">
          <Skeleton className="h-7 w-20 rounded-md" />
          <Skeleton className="h-7 w-24 rounded-md" />
        </div>
      </div>
    </div>
  );
}
