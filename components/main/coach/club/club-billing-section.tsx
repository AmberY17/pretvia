"use client";

import { Crown, Users, FolderOpen, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { CoachSubscription } from "@/types/dashboard";

const PLAN_LABELS: Record<CoachSubscription["plan"], string> = {
  squad: "Squad",
  varsity: "Varsity",
  club: "Club",
};

const PLAN_LIMITS: Record<CoachSubscription["plan"], { groups: number | null; coachSeats: number }> = {
  squad: { groups: 1, coachSeats: 0 },
  varsity: { groups: null, coachSeats: 0 },
  club: { groups: 10, coachSeats: 3 },
};

interface ClubBillingSectionProps {
  subscription: CoachSubscription;
  groupCount: number;
  coachCount: number;
  addOnsVisible: boolean;
}

export function ClubBillingSection({
  subscription,
  groupCount,
  coachCount,
  addOnsVisible,
}: ClubBillingSectionProps) {
  const base = PLAN_LIMITS[subscription.plan];
  const effectiveGroupLimit =
    base.groups !== null ? base.groups + subscription.addOnGroups * 5 : null;
  const effectiveCoachSeats = base.coachSeats + subscription.addOnSeats * 3;

  return (
    <div className="flex flex-col gap-4">
      <section className="rounded-2xl border border-border bg-card p-6">
        <h2 className="mb-4 flex items-center gap-2 text-base font-semibold text-foreground">
          <Crown className="h-4 w-4" />
          Plan &amp; usage
        </h2>
        <div className="mb-4">
          <Badge className="text-sm px-3 py-1">{PLAN_LABELS[subscription.plan]}</Badge>
        </div>
        <div className="grid grid-cols-2 gap-6">
          <div>
            <div className="flex items-center gap-1.5 mb-1">
              <FolderOpen className="h-3.5 w-3.5 text-muted-foreground" />
              <p className="text-xs font-medium text-muted-foreground">Groups</p>
            </div>
            <p className="text-2xl font-bold text-foreground">
              {groupCount}
              {effectiveGroupLimit !== null && (
                <span className="text-base font-normal text-muted-foreground"> / {effectiveGroupLimit}</span>
              )}
            </p>
            {effectiveGroupLimit === null && (
              <p className="text-xs text-muted-foreground mt-1">Unlimited</p>
            )}
          </div>
          {subscription.plan === "club" && (
            <div>
              <div className="flex items-center gap-1.5 mb-1">
                <Users className="h-3.5 w-3.5 text-muted-foreground" />
                <p className="text-xs font-medium text-muted-foreground">Coach seats</p>
              </div>
              <p className="text-2xl font-bold text-foreground">
                {coachCount}
                <span className="text-base font-normal text-muted-foreground"> / {effectiveCoachSeats}</span>
              </p>
            </div>
          )}
        </div>
      </section>

      {addOnsVisible && subscription.plan === "club" && (
        <section className="rounded-2xl border border-border bg-card p-6">
          <h2 className="mb-4 flex items-center gap-2 text-base font-semibold text-foreground">
            <Plus className="h-4 w-4" />
            Add-ons
          </h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-border p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-medium text-foreground">+5 groups</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Add groups beyond your included 10</p>
                  <p className="text-sm font-semibold text-foreground mt-2">$10 / month</p>
                </div>
                <Button size="sm" variant="outline" className="shrink-0" asChild>
                  <a href="mailto:hello@pretvia.com?subject=Add-on: +5 groups">
                    <Plus className="mr-1 h-3 w-3" />
                    Add
                  </a>
                </Button>
              </div>
            </div>

            <div className="rounded-xl border border-border p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-medium text-foreground">+3 coach seats</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Expand your coaching staff</p>
                  <p className="text-sm font-semibold text-foreground mt-2">$15 / month</p>
                </div>
                <Button size="sm" variant="outline" className="shrink-0" asChild>
                  <a href="mailto:hello@pretvia.com?subject=Add-on: +3 coach seats">
                    <Plus className="mr-1 h-3 w-3" />
                    Add
                  </a>
                </Button>
              </div>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
