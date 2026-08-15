"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Megaphone, Shield, Send, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { apiMutate } from "@/lib/query-client";

interface AnnouncementComposerProps {
  onMutate: () => void;
}

export function AnnouncementComposer({ onMutate }: AnnouncementComposerProps) {
  const [isComposing, setIsComposing] = useState(false);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);

  const handlePost = async () => {
    if (!text.trim()) return;
    setLoading(true);
    try {
      await apiMutate("/api/announcements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: text.trim() }),
      });
      setText("");
      setIsComposing(false);
      onMutate();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to post announcement");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence mode="wait">
      {!isComposing ? (
        <motion.div
          key="button"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] }}
        >
          <Button
            variant="ghost-primary"
            size="sm"
            onClick={() => setIsComposing(true)}
            className="w-full gap-2"
          >
            <Megaphone className="h-3.5 w-3.5" />
            New Announcement
          </Button>
        </motion.div>
      ) : (
        <motion.div
          key="form"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 12 }}
          transition={{ duration: 0.45, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="rounded-2xl border border-border bg-card p-4"
        >
          <div className="mb-3 flex items-center gap-2">
            <Shield className="h-3.5 w-3.5 text-primary" />
            <span className="text-xs font-semibold text-foreground">
              New Announcement
            </span>
            <span className="text-xs text-muted-foreground">
              Visible to all group members
            </span>
          </div>
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Write your announcement..."
            rows={2}
            maxLength={500}
            className="mb-3 resize-none border-border bg-secondary text-foreground placeholder:text-muted-foreground"
          />
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">
              {text.length}/500
            </span>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="ghost-secondary"
                size="sm"
                onClick={() => {
                  setIsComposing(false);
                  setText("");
                }}
                className="h-7 text-xs"
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="ghost-primary"
                size="sm"
                disabled={loading || !text.trim()}
                onClick={handlePost}
                className="h-7 gap-1.5 text-xs"
              >
                {loading ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Send className="h-3 w-3" />
                )}
                Post
              </Button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
