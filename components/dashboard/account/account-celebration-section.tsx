"use client";

import { PartyPopper } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { CELEBRATION_KEY } from "@/lib/constants";

interface AccountCelebrationSectionProps {
  celebrationEnabled: boolean;
  onCelebrationChange: (enabled: boolean) => void;
  userId: string;
}

export function AccountCelebrationSection({
  celebrationEnabled,
  onCelebrationChange,
  userId,
}: AccountCelebrationSectionProps) {
  return (
    <section className="rounded-2xl border border-border bg-card p-6">
      <h2 className="mb-4 flex items-center gap-2 text-base font-semibold text-foreground">
        <PartyPopper className="h-4 w-4" />
        Celebration
      </h2>
      <p className="mb-4 text-xs text-muted-foreground">
        Show a confetti celebration when you create a new log entry.
      </p>
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">
          Show celebration on new log
        </span>
        <Switch
          checked={celebrationEnabled}
          onCheckedChange={(checked) => {
            onCelebrationChange(checked);
            try {
              localStorage.setItem(`${CELEBRATION_KEY}-${userId}`, String(checked));
            } catch {
              // ignore
            }
          }}
        />
      </div>
    </section>
  );
}
