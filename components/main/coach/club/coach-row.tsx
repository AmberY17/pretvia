"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { UserMinus, ArrowRightLeft, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { DeleteConfirmDialog } from "@/components/main/shared/delete-confirm-dialog";
import { toast } from "sonner";
import { queryKeys } from "@/lib/query-keys";
import type { CoachMember } from "@/types/dashboard";

interface CoachRowProps {
  coach: CoachMember;
  groupId: string;
  otherGroups?: { id: string; name: string }[];
}

export function CoachRow({ coach, groupId, otherGroups = [] }: CoachRowProps) {
  const queryClient = useQueryClient();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [moveOpen, setMoveOpen] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [moving, setMoving] = useState(false);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.club.overview });
  };

  const handleRemove = async () => {
    setRemoving(true);
    try {
      const res = await fetch(`/api/groups/${groupId}/coaches/${coach.id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to remove coach");
        return;
      }
      toast.success(`${coach.displayName} removed from group`);
      invalidate();
    } catch {
      toast.error("Something went wrong");
    } finally {
      setRemoving(false);
      setConfirmOpen(false);
    }
  };

  const handleMoveTo = async (targetGroupId: string, targetGroupName: string) => {
    setMoving(true);
    setMoveOpen(false);
    try {
      const removeRes = await fetch(`/api/groups/${groupId}/coaches/${coach.id}`, {
        method: "DELETE",
      });
      if (!removeRes.ok) {
        const data = await removeRes.json();
        toast.error(data.error || "Failed to move coach");
        return;
      }

      const addRes = await fetch(`/api/groups/${targetGroupId}/coaches`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ coachId: coach.id }),
      });
      if (!addRes.ok) {
        const data = await addRes.json();
        toast.error(data.error || `Removed from this group but could not add to ${targetGroupName}`);
        invalidate();
        return;
      }
      toast.success(`${coach.displayName} moved to ${targetGroupName}`);
      invalidate();
    } catch {
      toast.error("Something went wrong");
    } finally {
      setMoving(false);
    }
  };

  return (
    <div className="flex items-center gap-3 py-1.5">
      <div className="min-w-0 flex-1">
        <span className="text-sm font-medium text-foreground">{coach.displayName}</span>
        <span className="ml-2 text-xs text-muted-foreground truncate">{coach.email}</span>
      </div>
      {!coach.isHead && (
        <div className="flex shrink-0 items-center gap-1">
          {otherGroups.length > 0 && (
            <Popover open={moveOpen} onOpenChange={setMoveOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 gap-1 px-2 text-xs text-muted-foreground"
                  disabled={moving || removing}
                >
                  <ArrowRightLeft className="h-3 w-3" />
                  Move to
                  <ChevronDown className="h-3 w-3" />
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-44 p-1">
                {otherGroups.map((g) => (
                  <button
                    key={g.id}
                    className="w-full rounded px-3 py-1.5 text-left text-sm hover:bg-secondary"
                    onClick={() => handleMoveTo(g.id, g.name)}
                  >
                    {g.name}
                  </button>
                ))}
              </PopoverContent>
            </Popover>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground hover:text-destructive"
            onClick={() => setConfirmOpen(true)}
            disabled={removing || moving}
            aria-label={`Remove ${coach.displayName}`}
          >
            <UserMinus className="h-3.5 w-3.5" />
          </Button>
          <DeleteConfirmDialog
            open={confirmOpen}
            onOpenChange={setConfirmOpen}
            title="Remove coach"
            description={`Remove ${coach.displayName} from this group? They will lose access immediately.`}
            onConfirm={handleRemove}
          />
        </div>
      )}
    </div>
  );
}
