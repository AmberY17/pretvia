"use client";

import { useState } from "react";
import { Plus, Loader2, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

interface GroupActionFormProps {
  onGroupChanged: () => void;
  /** If true, skip the trigger button and render the form directly */
  forceOpen?: boolean;
  /** Called when user cancels (only relevant when forceOpen=true) */
  onCancel?: () => void;
}

export function GroupActionForm({
  onGroupChanged,
  forceOpen = false,
  onCancel,
}: GroupActionFormProps) {
  const [showForm, setShowForm] = useState(forceOpen);
  const [groupAction, setGroupAction] = useState<"create" | "join">("join");
  const [groupInput, setGroupInput] = useState("");
  const [loading, setLoading] = useState(false);

  const handleCancel = () => {
    setShowForm(false);
    setGroupInput("");
    onCancel?.();
  };

  const handleSubmit = async (e: React.FormEvent) => {
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
      setShowForm(false);
      setGroupInput("");
      onGroupChanged();
    } catch {
      toast.error("Network error");
    } finally {
      setLoading(false);
    }
  };

  if (!showForm) {
    return (
      <Button
        variant="ghost-primary"
        size="sm"
        onClick={() => setShowForm(true)}
        className="w-full gap-2"
      >
        <Users className="h-3.5 w-3.5" />
        Create or Join Group
      </Button>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-secondary/50 p-3">
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
      <form onSubmit={handleSubmit} className="flex flex-col gap-2">
        <Label className="text-xs text-foreground">
          {groupAction === "create" ? "Group Name" : "Invite Code"}
        </Label>
        <Input
          value={groupInput}
          onChange={(e) => setGroupInput(e.target.value)}
          placeholder={
            groupAction === "create" ? "e.g. Morning Squad" : "e.g. AB3K9Z"
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
            onClick={handleCancel}
            className="h-7 text-xs"
          >
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}
