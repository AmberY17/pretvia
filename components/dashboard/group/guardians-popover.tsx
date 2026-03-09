"use client";

import { useState } from "react";
import useSWR from "swr";
import { urlFetcher } from "@/lib/swr-utils";
import { UsersRound, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { toast } from "sonner";

interface GuardiansPopoverProps {
  groupId: string;
  athleteId: string;
  athleteName: string;
  athleteEmail: string;
}

export function GuardiansPopover({
  groupId,
  athleteId,
  athleteName,
  athleteEmail,
}: GuardiansPopoverProps) {
  const [guardianEmail, setGuardianEmail] = useState("");
  const [sending, setSending] = useState(false);

  const { data, isLoading, mutate } = useSWR<{
    guardians: { id: string; displayName: string; email: string }[];
  }>(
    groupId && athleteId
      ? `/api/groups/${groupId}/members/${athleteId}/guardians`
      : null,
    urlFetcher,
  );
  const guardians = data?.guardians ?? [];

  async function handleInviteGuardian(e: React.FormEvent) {
    e.preventDefault();
    const email = guardianEmail.trim().toLowerCase();
    if (!email) return;
    if (email === athleteEmail.trim().toLowerCase()) {
      toast.error("Guardian email must be different from athlete email");
      return;
    }
    setSending(true);
    try {
      const res = await fetch(`/api/groups/${groupId}/invites`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          parentOnly: true,
          parentEmail: email,
          athleteEmail: athleteEmail.trim().toLowerCase(),
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error ?? "Failed to send invite");
        return;
      }
      toast.success(json.message ?? `Guardian invite sent to ${email}`);
      setGuardianEmail("");
      mutate();
    } catch {
      toast.error("Network error. Please try again.");
    } finally {
      setSending(false);
    }
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          size="sm"
          variant="ghost-primary"
          className="gap-1 text-xs"
          title="Guardians"
        >
          <UsersRound className="h-3 w-3" />
          <span className="hidden sm:inline">Guardians</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 border-border bg-card p-3" align="start">
        <p className="mb-2 text-xs font-medium text-muted-foreground">
          Guardians for {athleteName}
        </p>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading...</p>
        ) : guardians.length === 0 ? (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              No guardians linked yet
            </p>
            <form onSubmit={handleInviteGuardian} className="flex gap-2">
              <Input
                type="email"
                placeholder="Guardian email"
                value={guardianEmail}
                onChange={(e) => setGuardianEmail(e.target.value)}
                className="flex-1 text-sm"
                disabled={sending}
              />
              <Button
                type="submit"
                size="sm"
                variant="ghost-primary"
                disabled={sending || !guardianEmail.trim()}
                className="shrink-0"
              >
                <Send className="h-3 w-3" />
              </Button>
            </form>
          </div>
        ) : (
          <ul className="space-y-2">
            {guardians.map((g) => (
              <li key={g.id} className="text-sm">
                <span className="font-medium text-foreground">
                  {g.displayName}
                </span>
                <br />
                <span className="text-xs text-muted-foreground">{g.email}</span>
              </li>
            ))}
          </ul>
        )}
      </PopoverContent>
    </Popover>
  );
}
