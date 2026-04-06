"use client";

import React from "react";
import { useQuery } from "@tanstack/react-query";
import { apiFetcher } from "@/lib/query-client";
import { queryKeys } from "@/lib/query-keys";
import { useRequireAuth } from "@/hooks/use-require-auth";
import { PageHeader, EmptyStateCard } from "@/components/main/shared";
import { LoadingScreen } from "@/components/loading-screen";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ClubCoachSection,
  ClubGroupSection,
  ClubInsightsSection,
  ClubBillingSection,
} from "@/components/main/coach/club";
import { Building2 } from "lucide-react";
import type { ClubOverview } from "@/types/dashboard";

export default function ClubPage() {
  const { user, isLoading: authLoading } = useRequireAuth({ requireCoach: true });

  const {
    data: overview,
    isLoading: overviewLoading,
    error,
  } = useQuery<ClubOverview>({
    queryKey: queryKeys.club.overview,
    queryFn: () => apiFetcher<ClubOverview>("/api/club/overview"),
    enabled: !!user && user.subscription?.plan === "club",
    retry: false,
  });

  if (authLoading) return <LoadingScreen />;

  if (!user) return null;

  const shell = (children: React.ReactNode) => (
    <div className="flex h-screen flex-col overflow-hidden">
      <PageHeader title="Club" />
      <main className="flex-1 overflow-y-auto scrollbar-hidden p-6">
        <div className="mx-auto max-w-2xl">{children}</div>
      </main>
    </div>
  );

  if (user.subscription?.plan !== "club") {
    return shell(
      <EmptyStateCard
        icon={Building2}
        message="Upgrade to the Club plan to access the club dashboard, invite coaches, and manage your entire club from one place."
      />
    );
  }

  if (overviewLoading) return <LoadingScreen />;

  if (error || !overview) {
    return shell(
      <EmptyStateCard
        icon={Building2}
        message="Something went wrong loading club data. Please refresh the page."
      />
    );
  }

  const uniqueCoachIds = new Set(
    overview.groups.flatMap((g) =>
      g.coaches.filter((c) => !c.isHead).map((c) => c.id)
    )
  );
  const totalCoaches = uniqueCoachIds.size;

  return shell(
    <Tabs defaultValue="coaches">
      <div className="w-full overflow-x-auto scrollbar-hidden">
        <TabsList className="mb-6 w-max">
          <TabsTrigger value="coaches">
            <span className="sm:hidden">Coaches</span>
            <span className="hidden sm:inline">Coach Management</span>
          </TabsTrigger>
          <TabsTrigger value="groups">
            <span className="sm:hidden">Groups</span>
            <span className="hidden sm:inline">Group Management</span>
          </TabsTrigger>
          <TabsTrigger value="insights">Insights</TabsTrigger>
          <TabsTrigger value="billing">
            <span className="sm:hidden">Billing</span>
            <span className="hidden sm:inline">Billing & Seats</span>
          </TabsTrigger>
        </TabsList>
      </div>

      <TabsContent value="coaches">
        <ClubCoachSection groups={overview.groups} />
      </TabsContent>

      <TabsContent value="groups">
        <ClubGroupSection groups={overview.groups} />
      </TabsContent>

      <TabsContent value="insights">
        <ClubInsightsSection
          weeklyLogCount={overview.weeklyLogCount}
          prevWeeklyLogCount={overview.prevWeeklyLogCount}
          groups={overview.groups}
        />
      </TabsContent>

      <TabsContent value="billing">
        <ClubBillingSection
          subscription={overview.subscription}
          groupCount={overview.groups.length}
          coachCount={totalCoaches}
          addOnsVisible={overview.addOnsVisible}
        />
      </TabsContent>
    </Tabs>
  );
}
