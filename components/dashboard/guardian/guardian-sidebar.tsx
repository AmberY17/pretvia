"use client";

import { useRouter } from "next/navigation";
import { User as UserIcon, LogOut } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { CollapsibleFilterSection } from "@/components/dashboard/filters/collapsible-filter-section";
import type { User } from "@/hooks/use-auth";

export type GuardianPair = {
  athleteId: string;
  athleteName: string;
  groupId: string;
  groupName: string;
};

interface GuardianSidebarProps {
  user: User;
  availablePairs: GuardianPair[];
  selectedPairs: GuardianPair[];
  onSelectedPairsChange: (pairs: GuardianPair[]) => void;
  onLogout: () => void;
}

export function GuardianSidebar({
  user,
  availablePairs,
  selectedPairs,
  onSelectedPairsChange,
  onLogout,
}: GuardianSidebarProps) {
  const router = useRouter();

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    onLogout();
    router.push("/");
  };

  const pairKey = (p: GuardianPair) => `${p.athleteId}:${p.groupId}`;
  const selectedSet = new Set(selectedPairs.map(pairKey));

  const togglePair = (p: GuardianPair) => {
    const key = pairKey(p);
    if (selectedSet.has(key)) {
      onSelectedPairsChange(selectedPairs.filter((x) => pairKey(x) !== key));
    } else {
      onSelectedPairsChange([...selectedPairs, p]);
    }
  };

  const content = (
    <div className="flex flex-1 flex-col gap-2 overflow-y-auto p-3">
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex flex-col items-center text-center">
            <Avatar className="h-14 w-14">
              <AvatarFallback className="bg-secondary text-foreground text-2xl">
                {user.profileEmoji ||
                  (user.displayName ?? user.email ?? "?")[0].toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <p className="mt-2 truncate w-full text-sm font-medium text-foreground">
              {user.displayName ?? "Guardian"}
            </p>
            <p className="truncate w-full text-xs text-muted-foreground">
              {user.email}
            </p>
            <div className="mt-3 flex flex-col gap-1 w-full">
              <Button
                variant="ghost-secondary"
                size="sm"
                className="justify-center gap-2"
                onClick={() => router.push("/dashboard/account")}
              >
                <UserIcon className="h-3.5 w-3.5" />
                Account Settings
              </Button>
              <Button
                variant="ghost-secondary"
                size="sm"
                className="justify-center gap-2"
                onClick={handleLogout}
              >
                <LogOut className="h-3.5 w-3.5" />
                Sign out
              </Button>
            </div>
          </div>
        </div>

        {availablePairs.length > 0 && (
          <CollapsibleFilterSection title="Athletes & groups" defaultOpen>
            <div className="flex flex-col gap-1">
              {availablePairs.map((p) => {
                const key = pairKey(p);
                const checked = selectedSet.has(key);
                return (
                  <label
                    key={key}
                    className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-xs transition-colors hover:bg-secondary"
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => togglePair(p)}
                      className="rounded border-border"
                    />
                    <span className="truncate text-foreground">
                      {p.athleteName} – {p.groupName}
                    </span>
                  </label>
                );
              })}
            </div>
          </CollapsibleFilterSection>
        )}
    </div>
  );

  return (
    <aside className="hidden w-96 flex-shrink-0 flex-col border-r border-border bg-background/80 lg:flex">
      {content}
    </aside>
  );
}
