"use client";

import { Eye, Lock } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface VisibilityBadgeProps {
  visibility: "coach" | "private";
}

export function VisibilityBadge({ visibility }: VisibilityBadgeProps) {
  const isShared = visibility === "coach";
  return (
    <Badge
      variant={isShared ? "default" : "secondary"}
      className={`pointer-events-none text-xs ${
        isShared
          ? "border-primary/20 bg-primary/10 text-primary hover:bg-primary/10"
          : "border-border bg-secondary text-muted-foreground hover:bg-secondary"
      }`}
    >
      {isShared ? (
        <Eye className="h-3 w-3 sm:mr-1" />
      ) : (
        <Lock className="h-3 w-3 sm:mr-1" />
      )}
      <span className="hidden sm:inline">
        {isShared ? "Shared" : "Private"}
      </span>
    </Badge>
  );
}
