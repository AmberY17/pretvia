"use client";

import { User, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmojiPicker } from "@/components/dashboard/shared/emoji-picker";

interface AccountProfileEmojiSectionProps {
  profileEmoji: string;
  savingEmoji: boolean;
  onEmojiChange: (emoji: string) => void;
}

export function AccountProfileEmojiSection({
  profileEmoji,
  savingEmoji,
  onEmojiChange,
}: AccountProfileEmojiSectionProps) {
  return (
    <section className="rounded-2xl border border-border bg-card p-6">
      <h2 className="mb-4 flex items-center gap-2 text-base font-semibold text-foreground">
        <User className="h-4 w-4" />
        Profile Emoji
      </h2>
      <p className="mb-4 text-xs text-muted-foreground">
        Choose an emoji to represent you. It will appear next to your name in
        the sidebar and in comments.
      </p>
      <div className="flex items-center gap-4">
        <div className="relative">
          <EmojiPicker value={profileEmoji} onChange={onEmojiChange} />
          {savingEmoji && (
            <div className="absolute inset-0 flex items-center justify-center rounded-2xl bg-background/60">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          )}
        </div>
        <div className="flex flex-1 items-center gap-2">
          {!profileEmoji && (
            <p className="text-sm text-muted-foreground">
              Click to choose an emoji
            </p>
          )}
          {profileEmoji && (
            <Button
              variant="ghost-destructive"
              size="sm"
              onClick={() => onEmojiChange("")}
              disabled={savingEmoji}
              className="h-7 text-xs"
            >
              Delete
            </Button>
          )}
        </div>
      </div>
    </section>
  );
}
