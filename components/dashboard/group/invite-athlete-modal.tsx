"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";

interface InviteAthleteModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  groupId: string;
  onSent: () => void;
}

export function InviteAthleteModal({
  open,
  onOpenChange,
  groupId,
  onSent,
}: InviteAthleteModalProps) {
  const [isUnder13, setIsUnder13] = useState(false);
  const [athleteEmail, setAthleteEmail] = useState("");
  const [parentEmail, setParentEmail] = useState("");
  const [athleteNamePlaceholder, setAthleteNamePlaceholder] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch(`/api/groups/${groupId}/invites`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          isUnder13,
          athleteEmail: isUnder13 ? undefined : athleteEmail.trim() || undefined,
          parentEmail: isUnder13 ? parentEmail.trim() : parentEmail.trim() || undefined,
          athleteNamePlaceholder: athleteNamePlaceholder.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to send invite");
        setLoading(false);
        return;
      }
      toast.success(data.message ?? "Invite sent");
      onOpenChange(false);
      setAthleteEmail("");
      setParentEmail("");
      setAthleteNamePlaceholder("");
      setIsUnder13(false);
      onSent();
    } catch {
      toast.error("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-border bg-card sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Invite athlete</DialogTitle>
          <DialogDescription>
            Send an invite by email. Under 13? Send to the parent&apos;s email.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex items-center justify-between rounded-lg border border-border p-3">
            <Label htmlFor="under13" className="cursor-pointer text-sm font-medium">
              Under 13?
            </Label>
            <Switch
              id="under13"
              checked={isUnder13}
              onCheckedChange={setIsUnder13}
            />
          </div>
          {isUnder13 ? (
            <div className="space-y-2">
              <Label htmlFor="parent-email">Parent&apos;s email</Label>
              <Input
                id="parent-email"
                type="email"
                placeholder="parent@example.com"
                value={parentEmail}
                onChange={(e) => setParentEmail(e.target.value)}
                required
                className="bg-secondary border-border"
              />
            </div>
          ) : (
            <>
              <div className="space-y-2">
                <Label htmlFor="athlete-email">Athlete&apos;s email</Label>
                <Input
                  id="athlete-email"
                  type="email"
                  placeholder="athlete@example.com"
                  value={athleteEmail}
                  onChange={(e) => setAthleteEmail(e.target.value)}
                  required
                  className="bg-secondary border-border"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="guardian-email">
                  Parent/guardian email <span className="text-muted-foreground">(optional)</span>
                </Label>
                <Input
                  id="guardian-email"
                  type="email"
                  placeholder="parent@example.com"
                  value={parentEmail}
                  onChange={(e) => setParentEmail(e.target.value)}
                  className="bg-secondary border-border"
                />
              </div>
            </>
          )}
          <div className="space-y-2">
            <Label htmlFor="athlete-name-placeholder">
              Athlete name <span className="text-muted-foreground">(placeholder)</span>
            </Label>
            <Input
              id="athlete-name-placeholder"
              type="text"
              placeholder="e.g. Jamie S."
              value={athleteNamePlaceholder}
              onChange={(e) => setAthleteNamePlaceholder(e.target.value)}
              className="bg-secondary border-border"
            />
            <p className="text-xs text-muted-foreground">
              Optional. Shows in the athletes list until they create their account.
            </p>
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Send invite"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
