"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Plus, FolderOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { queryKeys } from "@/lib/query-keys";
import type { ClubGroup } from "@/types/dashboard";

interface ClubGroupSectionProps {
  groups: ClubGroup[];
}

export function ClubGroupSection({ groups }: ClubGroupSectionProps) {
  const queryClient = useQueryClient();
  const [creatingGroup, setCreatingGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [showForm, setShowForm] = useState(false);

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = newGroupName.trim();
    if (!name) return;

    setCreatingGroup(true);
    try {
      const res = await fetch("/api/groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "create", name }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to create group");
        return;
      }
      toast.success(`Group "${name}" created`);
      setNewGroupName("");
      setShowForm(false);
      queryClient.invalidateQueries({ queryKey: queryKeys.club.overview });
      queryClient.invalidateQueries({ queryKey: queryKeys.auth.session });
      queryClient.invalidateQueries({ queryKey: queryKeys.groups.coachGroups });
      queryClient.invalidateQueries({ queryKey: queryKeys.groups.myGroups });
    } catch {
      toast.error("Something went wrong");
    } finally {
      setCreatingGroup(false);
    }
  };

  return (
    <section className="rounded-2xl border border-border bg-card p-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-base font-semibold text-foreground">
          <FolderOpen className="h-4 w-4" />
          Groups
          <span className="text-sm font-normal text-muted-foreground">({groups.length})</span>
        </h2>
        <Button size="sm" onClick={() => setShowForm(!showForm)}>
          <Plus className="mr-2 h-3.5 w-3.5" />
          Create group
        </Button>
      </div>

      {showForm && (
        <form onSubmit={handleCreateGroup} className="mb-4 flex gap-2">
          <input
            type="text"
            value={newGroupName}
            onChange={(e) => setNewGroupName(e.target.value)}
            placeholder="Group name"
            className="flex h-9 w-full rounded-md border border-border bg-secondary px-3 py-1 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            autoFocus
          />
          <Button type="submit" size="sm" disabled={creatingGroup || !newGroupName.trim()}>
            Create
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => {
              setShowForm(false);
              setNewGroupName("");
            }}
          >
            Cancel
          </Button>
        </form>
      )}

      {groups.length === 0 ? (
        <p className="py-4 text-center text-sm text-muted-foreground">
          No groups yet. Create your first group above.
        </p>
      ) : (
        <div className="rounded-lg border border-border overflow-hidden">
          <div className="grid grid-cols-4 gap-4 px-4 py-2 bg-secondary text-xs font-medium text-muted-foreground">
            <span>Name</span>
            <span>Code</span>
            <span>Coaches</span>
            <span>Athletes</span>
          </div>
          {groups.map((group, i) => (
            <div
              key={group.id}
              className={`grid grid-cols-4 gap-4 px-4 py-3 text-sm ${i !== 0 ? "border-t border-border" : ""}`}
            >
              <span className="font-medium text-foreground truncate">{group.name}</span>
              <span className="font-mono text-xs text-muted-foreground">{group.code}</span>
              <span className="text-foreground">{group.coaches.length}</span>
              <span className="text-foreground">{group.athleteCount}</span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
