"use client";

import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

interface EmptyStateCardProps {
  icon: LucideIcon;
  message: string;
  actionHref?: string;
  actionLabel?: string;
}

export function EmptyStateCard({
  icon: Icon,
  message,
  actionHref = "/dashboard",
  actionLabel = "Go to Dashboard",
}: EmptyStateCardProps) {
  return (
    <div className="rounded-2xl border border-dashed border-border py-16 text-center">
      <Icon className="mx-auto h-12 w-12 text-muted-foreground" />
      <p className="mt-3 text-sm text-muted-foreground">{message}</p>
      <Link href={actionHref}>
        <Button variant="ghost-primary" size="sm" className="mt-4">
          {actionLabel}
        </Button>
      </Link>
    </div>
  );
}
