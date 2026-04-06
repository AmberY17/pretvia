"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { queryKeys } from "@/lib/query-keys";
import type { CoachMember } from "@/types/dashboard";

interface AddClubCoachesModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  groupId: string;
  groupName: string;
  availableCoaches: CoachMember[];
}

export function AddClubCoachesModal({
  open,
  onOpenChange,
  groupId,
  groupName,
  availableCoaches,
}: AddClubCoachesModalProps) {
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleClose = (open: boolean) => {
    if (!open) setSelected(new Set());
    onOpenChange(open);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selected.size === 0) return;

    setLoading(true);
    try {
      const results = await Promise.all(
        [...selected].map((coachId) =>
          fetch(`/api/groups/${groupId}/coaches`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ coachId }),
          }).then(async (r) => ({ ok: r.ok, data: await r.json() }))
        )
      );

      const failures = results.filter((r) => !r.ok);
      if (failures.length > 0) {
        toast.error(`Failed to add ${failures.length} coach${failures.length !== 1 ? "es" : ""}`);
      } else {
        const count = selected.size;
        toast.success(`${count} coach${count !== 1 ? "es" : ""} added to ${groupName}`);
      }

      queryClient.invalidateQueries({ queryKey: queryKeys.club.overview });
      handleClose(false);
    } catch {
      toast.error("Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Add coaches to {groupName}</DialogTitle>
        </DialogHeader>
        {availableCoaches.length === 0 ? (
          <p className="py-2 text-sm text-muted-foreground">
            All club coaches are already assigned to this group.
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4 pt-1">
            <div className="flex max-h-56 flex-col gap-0.5 overflow-y-auto">
              {availableCoaches.map((coach) => (
                <label
                  key={coach.id}
                  className="flex cursor-pointer items-center gap-3 rounded-md px-2 py-2 hover:bg-secondary"
                >
                  <Checkbox
                    checked={selected.has(coach.id)}
                    onCheckedChange={() => toggle(coach.id)}
                  />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground">{coach.displayName}</p>
                    <p className="text-xs text-muted-foreground">{coach.email}</p>
                  </div>
                </label>
              ))}
            </div>
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleClose(false)}
              >
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={loading || selected.size === 0}>
                {loading && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />}
                Add{selected.size > 0 ? ` ${selected.size}` : ""} coach{selected.size !== 1 ? "es" : ""}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
