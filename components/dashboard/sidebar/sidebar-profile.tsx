"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  LogOut,
  Users,
  Plus,
  ArrowRightLeft,
  Loader2,
  Copy,
  Check,
  Shield,
  ChevronDown,
  User as UserIcon,
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { User } from "@/hooks/use-auth";
import { toast } from "sonner";

type UserGroup = { id: string; name: string; code: string; coachId: string };

interface SidebarProfileProps {
  user: User;
  onLogout: () => void;
  onGroupChanged: () => void;
}

export function SidebarProfile({
  user,
  onLogout,
  onGroupChanged,
}: SidebarProfileProps) {
  const router = useRouter();
  const [showGroupAction, setShowGroupAction] = useState(false);
  const [groupAction, setGroupAction] = useState<"create" | "join">("join");
  const [groupInput, setGroupInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showGroupSwitcher, setShowGroupSwitcher] = useState(false);
  const [groupSearch, setGroupSearch] = useState("");
  const [leaveConfirmOpen, setLeaveConfirmOpen] = useState(false);

  const userGroups = user.groups ?? [];
  const hasMultipleGroups = userGroups.length > 1;
  const filteredGroups = groupSearch.trim()
    ? userGroups.filter((g: UserGroup) =>
        g.name.toLowerCase().includes(groupSearch.trim().toLowerCase())
      )
    : userGroups;

  const handleSwitchGroup = async (groupId: string) => {
    setLoading(true);
    try {
      const res = await fetch("/api/groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "switch", groupId }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to switch group");
        return;
      }
      toast.success(`Switched to "${data.group.name}"`);
      setShowGroupSwitcher(false);
      setGroupSearch("");
      onGroupChanged();
    } catch {
      toast.error("Network error");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    onLogout();
    router.push("/");
  };

  const handleGroupAction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!groupInput.trim()) return;
    setLoading(true);

    try {
      const res = await fetch("/api/groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: groupAction,
          ...(groupAction === "create"
            ? { name: groupInput.trim() }
            : { code: groupInput.trim() }),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed");
        return;
      }
      toast.success(
        groupAction === "create"
          ? `Group "${data.group.name}" created! Code: ${data.group.code}`
          : `Joined "${data.group.name}"!`,
      );
      setShowGroupAction(false);
      setGroupInput("");
      onGroupChanged();
    } catch {
      toast.error("Network error");
    } finally {
      setLoading(false);
    }
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
      setShowGroupSwitcher(false);
      onGroupChanged();
    } catch {
      toast.error("Network error");
    } finally {
      setLoading(false);
    }
  };

  const copyCode = () => {
    if (user.group?.code) {
      navigator.clipboard.writeText(user.group.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
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
          <div className="flex items-center gap-2">
            <p className="truncate text-sm font-semibold text-foreground">
              {user.displayName || "Athlete"}
            </p>
            <Badge
              variant="secondary"
              className={`shrink-0 text-xs ${
                user.role === "coach"
                  ? "bg-primary/10 text-primary border-primary/20"
                  : "bg-secondary text-muted-foreground border-border"
              }`}
            >
              {user.role === "coach" ? (
                <Shield className="mr-1 h-2.5 w-2.5" />
              ) : null}
              {user.role === "coach" ? "Coach" : "Athlete"}
            </Badge>
          </div>
          <p className="truncate text-xs text-muted-foreground">{user.email}</p>
        </div>
      </div>

      {/* Active Group Info */}
      {user.group ? (
        <div className="rounded-xl border border-border bg-secondary/50 p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="h-3.5 w-3.5 text-primary" />
              <span className="text-xs font-medium text-foreground">
                {user.group.name}
              </span>
            </div>
            <button
              type="button"
              onClick={copyCode}
              className="flex items-center gap-1 rounded-md px-2 py-0.5 text-xs text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
              title="Copy invite code"
            >
              {copied ? (
                <Check className="h-3 w-3 text-primary" />
              ) : (
                <Copy className="h-3 w-3" />
              )}
              {user.group.code}
            </button>
          </div>

          {/* Group switcher (available to ALL users with multiple groups) */}
          {hasMultipleGroups && (
            <div className="mt-2">
              <button
                type="button"
                onClick={() => setShowGroupSwitcher((prev) => !prev)}
                className="flex w-full items-center justify-between rounded-lg bg-secondary px-2.5 py-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
              >
                <span className="flex items-center gap-1.5">
                  <ArrowRightLeft className="h-3 w-3" />
                  Switch Group
                  {userGroups.length > 0 && (
                    <span className="text-muted-foreground/80">
                      ({userGroups.length})
                    </span>
                  )}
                </span>
                <ChevronDown
                  className={`h-3 w-3 transition-transform ${showGroupSwitcher ? "rotate-180" : ""}`}
                />
              </button>
              {showGroupSwitcher && (
                <div className="mt-1.5 flex flex-col gap-1 rounded-lg border border-border bg-card p-1">
                  {userGroups.length >= 5 && (
                    <input
                      type="text"
                      value={groupSearch}
                      onChange={(e) => setGroupSearch(e.target.value)}
                      placeholder="Search groups..."
                      className="mx-1 mb-0.5 rounded-md border border-border bg-secondary px-2 py-1 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
                    />
                  )}
                  {filteredGroups.length === 0 ? (
                    <p className="px-2.5 py-2 text-xs text-muted-foreground">
                      No groups match
                    </p>
                  ) : (
                    <div
                      className={`flex flex-col gap-1 ${
                        filteredGroups.length > 5
                          ? "max-h-36 overflow-y-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
                          : ""
                      }`}
                    >
                    {filteredGroups.map((g: UserGroup) => (
                    <button
                      key={g.id}
                      type="button"
                      onClick={() => handleSwitchGroup(g.id)}
                      disabled={loading || g.id === user.group?.id}
                      className={`flex items-center gap-2 rounded-md px-2.5 py-1.5 text-xs transition-colors ${
                        g.id === user.group?.id
                          ? "bg-primary/10 font-medium text-primary"
                          : "text-foreground hover:bg-secondary"
                      }`}
                    >
                      <Users className="h-3 w-3" />
                      <span className="flex-1 text-left truncate">{g.name}</span>
                      {g.id === user.group?.id && (
                        <Check className="h-3 w-3 shrink-0 text-primary" />
                      )}
                    </button>
                  ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Actions: Join another group / Leave */}
          <div className="mt-2 flex gap-1.5">
            <Button
              variant="ghost-primary"
              size="sm"
              onClick={() => {
                setShowGroupAction(true);
                setGroupAction("join");
              }}
              disabled={loading}
              className="h-7 flex-1 gap-1 text-xs"
            >
              <Plus className="h-3 w-3" />
              Join Another
            </Button>
            <AlertDialog open={leaveConfirmOpen} onOpenChange={setLeaveConfirmOpen}>
              <Button
                variant="ghost-destructive"
                size="sm"
                onClick={() => setLeaveConfirmOpen(true)}
                disabled={loading}
                className="h-7 gap-1 text-xs"
              >
                Leave
              </Button>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you sure you want to leave?</AlertDialogTitle>
                  <AlertDialogDescription>
                    You will lose access to this group and its content.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleLeaveGroup}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Leave
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      ) : null}

      {/* Join/Create group form (shown when no group, or when user clicks "Join Another") */}
      {(!user.group || showGroupAction) && (
        <div>
          {!showGroupAction && !user.group ? (
            <Button
              variant="ghost-primary"
              size="sm"
              onClick={() => setShowGroupAction(true)}
              className="w-full gap-2"
            >
              <Users className="h-3.5 w-3.5" />
              {user.role === "coach" ? "Create or Join Group" : "Join a Group"}
            </Button>
          ) : showGroupAction ? (
            <div className="rounded-xl border border-border bg-secondary/50 p-3">
              {/* Toggle create/join (coach can do both, athlete can only join) */}
              {user.role === "coach" && (
                <div className="mb-3 grid grid-cols-2 gap-1 rounded-lg bg-secondary p-0.5">
                  <button
                    type="button"
                    onClick={() => {
                      setGroupAction("join");
                      setGroupInput("");
                    }}
                    className={`rounded-md px-2 py-1 text-xs font-medium transition-colors ${
                      groupAction === "join"
                        ? "bg-card text-foreground shadow-sm"
                        : "text-muted-foreground"
                    }`}
                  >
                    Join
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setGroupAction("create");
                      setGroupInput("");
                    }}
                    className={`rounded-md px-2 py-1 text-xs font-medium transition-colors ${
                      groupAction === "create"
                        ? "bg-card text-foreground shadow-sm"
                        : "text-muted-foreground"
                    }`}
                  >
                    Create
                  </button>
                </div>
              )}
              <form
                onSubmit={handleGroupAction}
                className="flex flex-col gap-2"
              >
                <Label className="text-xs text-foreground">
                  {groupAction === "create" ? "Group Name" : "Invite Code"}
                </Label>
                <Input
                  value={groupInput}
                  onChange={(e) => setGroupInput(e.target.value)}
                  placeholder={
                    groupAction === "create"
                      ? "e.g. Morning Squad"
                      : "e.g. AB3K9Z"
                  }
                  className="h-8 bg-card border-border text-xs text-foreground placeholder:text-muted-foreground"
                />
                <div className="flex gap-2">
                  <Button
                    type="submit"
                    size="sm"
                    disabled={loading || !groupInput.trim()}
                    className="h-7 flex-1 gap-1 bg-primary text-xs text-primary-foreground hover:bg-primary/90"
                  >
                    {loading ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <Plus className="h-3 w-3" />
                    )}
                    {groupAction === "create" ? "Create" : "Join"}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost-secondary"
                    size="sm"
                    onClick={() => {
                      setShowGroupAction(false);
                      setGroupInput("");
                    }}
                    className="h-7 text-xs"
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </div>
          ) : null}
        </div>
      )}

      <Button variant="ghost-secondary" size="sm" asChild className="w-full gap-2">
        <Link href="/dashboard/account">
          <UserIcon className="h-4 w-4" />
          Account Settings
        </Link>
      </Button>
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
