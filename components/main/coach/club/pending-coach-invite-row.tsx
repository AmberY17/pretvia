"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { queryKeys } from "@/lib/query-keys";
import { apiMutate } from "@/lib/query-client";
import type { PendingCoachInvite } from "@/types/dashboard";

interface PendingCoachInviteRowProps {
  invite: PendingCoachInvite;
  groupId: string;
}

export function PendingCoachInviteRow({ invite, groupId }: PendingCoachInviteRowProps) {
  const queryClient = useQueryClient();
  const [cancelling, setCancelling] = useState(false);

  const handleCancel = async () => {
    setCancelling(true);
    try {
      await apiMutate(`/api/groups/${groupId}/invites?token=${invite.token}`, {
        method: "DELETE",
      });
      toast.success("Invite cancelled");
      queryClient.invalidateQueries({ queryKey: queryKeys.club.overview });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to cancel invite");
    } finally {
      setCancelling(false);
    }
  };

  const expiresAt = new Date(invite.expiresAt);
  const daysLeft = Math.max(
    0,
    Math.ceil((expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
  );

  return (
    <div className="flex items-center justify-between py-2">
      <div className="flex flex-col gap-0.5 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm text-foreground truncate">{invite.email}</span>
          <Badge variant="outline" className="text-xs shrink-0 text-muted-foreground">
            Pending
          </Badge>
        </div>
        <span className="text-xs text-muted-foreground">
          Expires in {daysLeft} day{daysLeft !== 1 ? "s" : ""}
        </span>
      </div>
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 text-muted-foreground hover:text-destructive shrink-0"
        onClick={handleCancel}
        disabled={cancelling}
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
}
