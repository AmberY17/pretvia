"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { UserPlus, Users, Pencil, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CoachRow } from "./coach-row";
import { PendingCoachInviteRow } from "./pending-coach-invite-row";
import { InviteCoachModal } from "./invite-coach-modal";
import { AddClubCoachesModal } from "./add-club-coaches-modal";
import { toast } from "sonner";
import { queryKeys } from "@/lib/query-keys";
import { apiMutate } from "@/lib/query-client";
import type { ClubGroup, CoachMember } from "@/types/dashboard";

interface ClubCoachSectionProps {
  groups: ClubGroup[];
}

export function ClubCoachSection({ groups }: ClubCoachSectionProps) {
  const queryClient = useQueryClient();
  const [inviteModalGroup, setInviteModalGroup] = useState<ClubGroup | null>(null);
  const [addCoachesGroup, setAddCoachesGroup] = useState<ClubGroup | null>(null);
  const [renamingGroupId, setRenamingGroupId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [renameSaving, setRenameSaving] = useState(false);

  const allClubCoaches: CoachMember[] = [];
  const seenIds = new Set<string>();
  for (const g of groups) {
    for (const c of g.coaches) {
      if (!seenIds.has(c.id)) {
        seenIds.add(c.id);
        allClubCoaches.push(c);
      }
    }
  }

  const startRename = (group: ClubGroup) => {
    setRenamingGroupId(group.id);
    setRenameValue(group.name);
  };

  const cancelRename = () => {
    setRenamingGroupId(null);
    setRenameValue("");
  };

  const handleRename = async (groupId: string) => {
    const name = renameValue.trim();
    if (!name || name.length < 2) {
      toast.error("Group name must be at least 2 characters");
      return;
    }
    setRenameSaving(true);
    try {
      await apiMutate(`/api/groups/${groupId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      toast.success("Group renamed");
      cancelRename();
      queryClient.invalidateQueries({ queryKey: queryKeys.club.overview });
      queryClient.invalidateQueries({ queryKey: queryKeys.groups.coachGroups });
      queryClient.invalidateQueries({ queryKey: queryKeys.auth.session });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to rename group");
    } finally {
      setRenameSaving(false);
    }
  };

  if (groups.length === 0) {
    return <p className="text-sm text-muted-foreground">No groups found.</p>;
  }

  return (
    <div className="flex flex-col gap-4">
      {groups.map((group) => {
        const isRenaming = renamingGroupId === group.id;
        const hasCoaches = group.coaches.length > 0;
        const hasPending = group.pendingCoachInvites.length > 0;
        const currentGroupCoachIds = new Set(group.coaches.map((c) => c.id));
        const availableToAdd = allClubCoaches.filter((c) => !currentGroupCoachIds.has(c.id));
        const otherGroups = groups
          .filter((g) => g.id !== group.id)
          .map((g) => ({ id: g.id, name: g.name }));

        return (
          <section key={group.id} className="rounded-2xl border border-border bg-card p-5">
            <div className="mb-3 flex items-center justify-between gap-2">
              <div className="flex min-w-0 flex-1 items-center gap-1.5">
                <Users className="h-4 w-4 shrink-0 text-muted-foreground" />
                {isRenaming ? (
                  <div className="flex flex-1 items-center gap-1">
                    <Input
                      value={renameValue}
                      onChange={(e) => setRenameValue(e.target.value)}
                      className="h-7 flex-1 bg-secondary border-border text-sm"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleRename(group.id);
                        if (e.key === "Escape") cancelRename();
                      }}
                      autoFocus
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 shrink-0 text-foreground"
                      onClick={() => handleRename(group.id)}
                      disabled={renameSaving}
                    >
                      <Check className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 shrink-0 text-muted-foreground"
                      onClick={cancelRename}
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ) : (
                  <div className="flex min-w-0 items-center gap-1">
                    <h3 className="truncate text-sm font-semibold text-foreground">{group.name}</h3>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 shrink-0 text-muted-foreground hover:text-foreground"
                      onClick={() => startRename(group)}
                      aria-label={`Rename ${group.name}`}
                    >
                      <Pencil className="h-3 w-3" />
                    </Button>
                  </div>
                )}
              </div>
              {!isRenaming && (
                <div className="flex shrink-0 items-center gap-1.5">
                  {availableToAdd.length > 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => setAddCoachesGroup(group)}
                    >
                      <Users className="mr-1.5 h-3 w-3" />
                      Add
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => setInviteModalGroup(group)}
                  >
                    <UserPlus className="mr-1.5 h-3 w-3" />
                    Invite
                  </Button>
                </div>
              )}
            </div>

            {!hasCoaches && !hasPending ? (
              <p className="py-1 text-xs text-muted-foreground">No coaches assigned yet.</p>
            ) : (
              <div className="divide-y divide-border">
                {group.coaches.map((coach) => (
                  <CoachRow
                    key={coach.id}
                    coach={coach}
                    groupId={group.id}
                    otherGroups={otherGroups}
                  />
                ))}
                {hasPending && (
                  <>
                    {hasCoaches && <div className="border-t border-border" />}
                    {group.pendingCoachInvites.map((invite) => (
                      <PendingCoachInviteRow
                        key={invite.id}
                        invite={invite}
                        groupId={group.id}
                      />
                    ))}
                  </>
                )}
              </div>
            )}
          </section>
        );
      })}

      {inviteModalGroup && (
        <InviteCoachModal
          groupId={inviteModalGroup.id}
          groupName={inviteModalGroup.name}
          open={!!inviteModalGroup}
          onOpenChange={(open) => {
            if (!open) setInviteModalGroup(null);
          }}
        />
      )}

      {addCoachesGroup && (
        <AddClubCoachesModal
          groupId={addCoachesGroup.id}
          groupName={addCoachesGroup.name}
          open={!!addCoachesGroup}
          onOpenChange={(open) => {
            if (!open) setAddCoachesGroup(null);
          }}
          availableCoaches={allClubCoaches.filter(
            (c) => !addCoachesGroup.coaches.some((gc) => gc.id === c.id)
          )}
        />
      )}
    </div>
  );
}
