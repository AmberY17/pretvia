"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut, Users, Plus } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { DeleteConfirmDialog } from "@/components/main/shared/delete-confirm-dialog";
import type { User } from "@/hooks/use-auth";
import { toast } from "sonner";
import { GroupSwitcher } from "./group-switcher";
import { GroupActionForm } from "./group-action-form";

interface SidebarProfileProps {
  user: User;
  onLogout: () => void;
  onGroupChanged: (newGroupId?: string) => void;
}

export function SidebarProfile({
  user,
  onLogout,
  onGroupChanged,
}: SidebarProfileProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [leaveConfirmOpen, setLeaveConfirmOpen] = useState(false);
  const [showJoinForm, setShowJoinForm] = useState(false);

  const isCoach = user.role === "coach";
  const userGroups = user.groups ?? [];
  const hasMultipleGroups = userGroups.length > 1;

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    onLogout();
    router.push("/");
  };

  const handleLeaveGroup = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "leave" }),
      });
      if (!res.ok) {
        toast.error("Failed to leave group");
        return;
      }
      toast.success("Left the group");
      setShowJoinForm(false);
      onGroupChanged();
    } catch {
      toast.error("Network error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-5">
      {/* User Info */}
      <div className="flex items-center gap-3">
        <Avatar className="h-11 w-11 text-lg">
          <AvatarFallback className="bg-secondary text-foreground">
            {user.profileEmoji || user.displayName?.charAt(0)?.toUpperCase() || "?"}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-foreground">
            {user.displayName || "Athlete"}
          </p>
          <p className="truncate text-xs text-muted-foreground">{user.email}</p>
        </div>
      </div>

      {/* Active Group Info */}
      {user.group ? (
        <div className="rounded-xl border border-border bg-secondary/50 p-3">
          <div className="flex items-center gap-2">
            <Users className="h-3.5 w-3.5 text-primary" />
            <span className="text-xs font-medium text-foreground">
              {user.group.name}
            </span>
          </div>

          {hasMultipleGroups && (
            <GroupSwitcher
              userGroups={userGroups}
              currentGroupId={user.group?.id}
              onGroupChanged={(newGroupId) => onGroupChanged(newGroupId)}
            />
          )}

          {/* Actions: Join another group / Leave — coaches only */}
          {isCoach && !user.subscription?.isAssistant && (
            <div className="mt-2 flex gap-1.5">
              <Button
                variant="ghost-primary"
                size="sm"
                onClick={() => setShowJoinForm(true)}
                disabled={loading}
                className="h-7 flex-1 gap-1 text-xs"
              >
                <Plus className="h-3 w-3" />
                Join Another
              </Button>
              <Button
                variant="ghost-destructive"
                size="sm"
                onClick={() => setLeaveConfirmOpen(true)}
                disabled={loading}
                className="h-7 gap-1 text-xs"
              >
                Leave
              </Button>
              <DeleteConfirmDialog
                open={leaveConfirmOpen}
                onOpenChange={setLeaveConfirmOpen}
                title="Are you sure you want to leave?"
                description="You will lose access to this group and its content."
                onConfirm={handleLeaveGroup}
              />
            </div>
          )}
        </div>
      ) : null}

      {/* Join/Create group form — coaches only */}
      {isCoach && showJoinForm && (
        <GroupActionForm
          onGroupChanged={() => {
            setShowJoinForm(false);
            onGroupChanged();
          }}
          onCancel={() => setShowJoinForm(false)}
          forceOpen
        />
      )}
      {isCoach && !user.group && !showJoinForm && (
        <GroupActionForm onGroupChanged={onGroupChanged} />
      )}
      {!isCoach && !user.group && (
        <p className="rounded-xl border border-border bg-secondary/50 px-3 py-2.5 text-xs text-muted-foreground">
          Your coach will add you to a group via invite.
        </p>
      )}

      <Button
        variant="ghost-secondary"
        size="sm"
        onClick={handleLogout}
        className="w-full gap-2"
      >
        <LogOut className="h-4 w-4" />
        Sign Out
      </Button>
    </div>
  );
}
