"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { TrendingUp, TrendingDown, Minus, Send, BarChart2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { queryKeys } from "@/lib/query-keys";
import type { ClubGroup } from "@/types/dashboard";

interface ClubInsightsSectionProps {
  weeklyLogCount: number;
  prevWeeklyLogCount: number;
  groups: ClubGroup[];
}

export function ClubInsightsSection({
  weeklyLogCount,
  prevWeeklyLogCount,
  groups,
}: ClubInsightsSectionProps) {
  const queryClient = useQueryClient();
  const [announcementText, setAnnouncementText] = useState("");
  const [posting, setPosting] = useState(false);

  const delta = weeklyLogCount - prevWeeklyLogCount;
  const deltaPercent =
    prevWeeklyLogCount > 0
      ? Math.round(Math.abs(delta / prevWeeklyLogCount) * 100)
      : null;

  const handlePostAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = announcementText.trim();
    if (!text) return;

    setPosting(true);
    try {
      const res = await fetch("/api/announcements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, scope: "club" }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to post announcement");
        return;
      }
      toast.success("Club-wide announcement posted");
      setAnnouncementText("");
      queryClient.invalidateQueries({ queryKey: queryKeys.announcements.all });
    } catch {
      toast.error("Something went wrong");
    } finally {
      setPosting(false);
    }
  };

  const totalAthletes = groups.reduce((sum, g) => sum + g.athleteCount, 0);

  return (
    <div className="flex flex-col gap-4">
      <section className="rounded-2xl border border-border bg-card p-6">
        <h2 className="mb-4 flex items-center gap-2 text-base font-semibold text-foreground">
          <BarChart2 className="h-4 w-4" />
          Activity
        </h2>
        <div className="grid grid-cols-2 gap-6">
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-1">Logs this week</p>
            <div className="flex items-end gap-2">
              <span className="text-3xl font-bold text-foreground">{weeklyLogCount}</span>
              {delta !== 0 && (
                <div className="flex items-center gap-1 mb-1">
                  {delta > 0 ? (
                    <TrendingUp className="h-4 w-4 text-green-500" />
                  ) : (
                    <TrendingDown className="h-4 w-4 text-red-500" />
                  )}
                  <span className={`text-xs font-medium ${delta > 0 ? "text-green-500" : "text-red-500"}`}>
                    {deltaPercent !== null ? `${deltaPercent}%` : `${Math.abs(delta)}`} vs last week
                  </span>
                </div>
              )}
              {delta === 0 && prevWeeklyLogCount > 0 && (
                <div className="flex items-center gap-1 mb-1">
                  <Minus className="h-4 w-4 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">same as last week</span>
                </div>
              )}
            </div>
          </div>
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-1">Total athletes</p>
            <div className="flex items-end gap-2">
              <span className="text-3xl font-bold text-foreground">{totalAthletes}</span>
              <span className="text-xs text-muted-foreground mb-1">
                across {groups.length} group{groups.length !== 1 ? "s" : ""}
              </span>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-card p-6">
        <h2 className="mb-4 flex items-center gap-2 text-base font-semibold text-foreground">
          <Send className="h-4 w-4" />
          Club-wide announcement
        </h2>
        <form onSubmit={handlePostAnnouncement} className="flex flex-col gap-3">
          <Textarea
            value={announcementText}
            onChange={(e) => setAnnouncementText(e.target.value)}
            placeholder="Share an update with your entire club..."
            className="bg-secondary border-border resize-none min-h-[80px]"
            maxLength={1000}
          />
          <div className="flex justify-end">
            <Button type="submit" size="sm" disabled={posting || !announcementText.trim()}>
              {!posting && <Send className="mr-2 h-3.5 w-3.5" />}
              Post announcement
            </Button>
          </div>
        </form>
      </section>
    </div>
  );
}
