"use client";

import type { User } from "@/hooks/use-auth";

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
    <div className="mb-6 rounded-2xl border border-border bg-card p-4">
      <div className="mb-4 flex items-center gap-2">
        <Skeleton className="h-4 w-4 rounded" />
        <Skeleton className="h-4 w-32" />
      </div>
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between rounded-lg border border-border p-3">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-6 w-16 rounded-full" />
        </div>
        <div className="flex items-center justify-between rounded-lg border border-border p-3">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-6 w-16 rounded-full" />
        </div>
      </div>
    </div>
  );
}

export function DashboardFeedSkeleton({ user }: { user: User }) {
  return (
    <main className="flex-1 overflow-y-auto scrollbar-hidden p-6">
      <div className="mx-auto max-w-2xl space-y-6">
        {user.groupId && <AnnouncementSkeleton />}
        {user.groupId && <CheckinSkeleton />}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-4 w-24" />
            </div>
          </div>
          <div className="flex flex-col gap-3">
            {[1, 2, 3, 4].map((i) => (
              <LogCardSkeleton key={i} />
            ))}
          </div>
        </div>
      </div>
    </main>
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
