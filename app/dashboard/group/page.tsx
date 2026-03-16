"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetcher } from "@/lib/query-client";
import { queryKeys } from "@/lib/query-keys";
import { AnimatePresence, motion } from "framer-motion";
import { Settings } from "lucide-react";
import { useRequireAuth } from "@/hooks/use-require-auth";
import { PageHeader } from "@/components/main/shared/page-header";
import { LoadingScreen } from "@/components/ui/loading-screen";
import { EmptyStateCard } from "@/components/ui/empty-state-card";
import { ManageGroupPageSkeleton } from "@/components/main/dashboard/layout/dashboard-skeletons";
import { GroupRolesSection } from "@/components/main/coach/groups/group-roles-section";
import { GroupTrainingScheduleSection } from "@/components/main/coach/groups/group-training-schedule-section";
import { GroupAthletesSection } from "@/components/main/coach/groups/group-athletes-section";
import { toast } from "sonner";
import { useTrainingSlots } from "@/hooks/use-training-slots";
import type { Member, PendingAthlete, Role } from "@/types/dashboard";

export default function GroupManagementPage() {
  const { user, isLoading: authLoading } = useRequireAuth({ requireCoach: true });
  const queryClient = useQueryClient();
  const [newRoleName, setNewRoleName] = useState("");
  const [addingRole, setAddingRole] = useState(false);
  const [editingRoleId, setEditingRoleId] = useState<string | null>(null);
  const [transferUserId, setTransferUserId] = useState<string | null>(null);
  const [transferGroupId, setTransferGroupId] = useState("");
  const [transferDropdownOpen, setTransferDropdownOpen] = useState(false);
  const [transferSearch, setTransferSearch] = useState("");
  const [saving, setSaving] = useState(false);
  const [roleDropdownAthleteId, setRoleDropdownAthleteId] = useState<
    string | null
  >(null);
  const [removeConfirmUserId, setRemoveConfirmUserId] = useState<string | null>(
    null,
  );
  const [deleteRoleConfirmOpen, setDeleteRoleConfirmOpen] = useState(false);
  const {
    slots: trainingSchedule,
    setSlots: setTrainingSchedule,
    addSlot: addTrainingSlot,
    removeSlot: removeTrainingSlot,
    updateSlot: updateTrainingSlot,
  } = useTrainingSlots();
  const trainingScheduleInitializedRef = useRef(false);
  const trainingScheduleSaveSkippedRef = useRef(false);
  const lastSavedTrainingScheduleRef = useRef<typeof trainingSchedule>([]);
  const [athleteSearch, setAthleteSearch] = useState("");

  const { data: coachGroupsData } = useQuery<{
    groups: { id: string; name: string }[];
  }>({
    queryKey: [...queryKeys.groups.coachGroups, user?.id],
    queryFn: () => apiFetcher("/api/groups?mode=coach-groups"),
    enabled: user?.role === "coach",
  });

  const { data: membersData, isLoading: membersLoading } = useQuery<{
    members: Member[];
    roles: Role[];
    pendingAthletes?: PendingAthlete[];
  }>({
    queryKey: [...queryKeys.members.all, user?.id, user?.groupId],
    queryFn: () => apiFetcher(`/api/groups?groupId=${user!.groupId}`),
    enabled: !!user?.groupId,
  });

  const mutateMembers = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: queryKeys.members.all });
  }, [queryClient]);

  const realAthletes = (membersData?.members ?? []).filter(
    (m) => m.role !== "coach",
  );
  const pending = (membersData?.pendingAthletes ?? []).map((p) => ({
    ...p,
    role: "athlete" as const,
    roleIds: [] as string[],
  }));
  const allAthletes: Member[] = [...realAthletes, ...pending];
  const athletes = athleteSearch.trim()
    ? allAthletes.filter(
        (a) =>
          (a.displayName ?? "")
            .toLowerCase()
            .includes(athleteSearch.trim().toLowerCase()) ||
          (a.email ?? "")
            .toLowerCase()
            .includes(athleteSearch.trim().toLowerCase()),
      )
    : allAthletes;
  const roles = membersData?.roles ?? [];
  const coachGroups = coachGroupsData?.groups ?? [];
  const transferableGroups = coachGroups.filter((g) => g.id !== user?.groupId);

  const { data: trainingScheduleData, isLoading: trainingScheduleLoading } = useQuery<{
    trainingScheduleTemplate: { dayOfWeek: number; time: string }[];
  }>({
    queryKey: [...queryKeys.groups.trainingSchedule(user?.groupId ?? ""), user?.id],
    queryFn: () => apiFetcher(`/api/groups/${user!.groupId}/training-schedule`),
    enabled: !!user?.groupId,
  });

  useEffect(() => {
    if (!trainingScheduleData) return;
    if (trainingScheduleInitializedRef.current) return;
    trainingScheduleInitializedRef.current = true;
    const slots = Array.isArray(trainingScheduleData.trainingScheduleTemplate)
      ? trainingScheduleData.trainingScheduleTemplate
      : [];
    const mapped = slots.map((s) => ({ dayOfWeek: s.dayOfWeek, time: s.time || "09:00" }));
    setTrainingSchedule(mapped);
    lastSavedTrainingScheduleRef.current = mapped;
    trainingScheduleSaveSkippedRef.current = false;
  }, [trainingScheduleData]);

  // Auto-save training schedule when it changes (debounced). Skip the first run after load.
  useEffect(() => {
    if (!user?.groupId) return;
    if (!trainingScheduleSaveSkippedRef.current) {
      trainingScheduleSaveSkippedRef.current = true;
      return;
    }
    if (trainingSchedule === lastSavedTrainingScheduleRef.current) return;
    const timeout = setTimeout(async () => {
      try {
        const res = await fetch(`/api/groups/${user.groupId}/training-schedule`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ trainingSchedule }),
        });
        const data = await res.json();
        if (!res.ok) {
          toast.error(data.error || "Failed to update training schedule");
          return;
        }
        lastSavedTrainingScheduleRef.current = trainingSchedule;
        toast.success("Training schedule updated.");
      } catch {
        toast.error("Network error");
      }
    }, 600);
    return () => clearTimeout(timeout);
  }, [user?.groupId, trainingSchedule]);

  const filteredTransferGroups = transferSearch.trim()
    ? transferableGroups.filter((g) =>
        g.name.toLowerCase().includes(transferSearch.trim().toLowerCase()),
      )
    : transferableGroups;

  const handleCancelEditRole = () => {
    setEditingRoleId(null);
    setNewRoleName("");
  };

  // BUG FIX #5: Role CRUD now also invalidates tags and logs
  const handleAddRole = async () => {
    if (!newRoleName.trim() || !user?.groupId) return;
    setAddingRole(true);
    try {
      const res = await fetch(`/api/groups/${user.groupId}/roles`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newRoleName.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to add role");
        return;
      }
      setNewRoleName("");
      mutateMembers();
      queryClient.invalidateQueries({ queryKey: queryKeys.tags.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.logs.all });
    } catch {
      toast.error("Network error");
    } finally {
      setAddingRole(false);
    }
  };

  const handleUpdateRole = async () => {
    if (!editingRoleId || !newRoleName.trim() || !user?.groupId) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/groups/${user.groupId}/roles`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roleId: editingRoleId,
          name: newRoleName.trim(),
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || "Failed to update role");
        return;
      }
      handleCancelEditRole();
      mutateMembers();
      queryClient.invalidateQueries({ queryKey: queryKeys.tags.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.logs.all });
    } catch {
      toast.error("Network error");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteRole = async (roleId?: string) => {
    const id = roleId ?? editingRoleId;
    if (!user?.groupId || !id) return;
    setDeleteRoleConfirmOpen(false);
    try {
      const res = await fetch(
        `/api/groups/${user.groupId}/roles?roleId=${id}`,
        { method: "DELETE" },
      );
      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || "Failed to delete role");
        return;
      }
      handleCancelEditRole();
      mutateMembers();
      queryClient.invalidateQueries({ queryKey: queryKeys.tags.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.logs.all });
    } catch {
      toast.error("Network error");
    }
  };

  const handleAssignRoles = async (userId: string, roleIds: string[]) => {
    if (!user?.groupId) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/groups/${user.groupId}/members`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "assignRoles", userId, roleIds }),
      });
      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || "Failed to update roles");
        return;
      }
      mutateMembers();
    } catch {
      toast.error("Network error");
    } finally {
      setSaving(false);
    }
  };

  // BUG FIX #1: Remove/transfer now properly invalidates logs, checkins, and stats
  const handleRemoveAthlete = async (userId: string) => {
    if (!user?.groupId) return;
    setRemoveConfirmUserId(null);
    setSaving(true);
    try {
      const res = await fetch(`/api/groups/${user.groupId}/members`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "remove", userId }),
      });
      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || "Failed to remove");
        return;
      }
      mutateMembers();
      queryClient.invalidateQueries({ queryKey: queryKeys.logs.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.checkins.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.stats.all });
    } catch {
      toast.error("Network error");
    } finally {
      setSaving(false);
    }
  };

  const handleTransfer = async () => {
    if (!transferUserId || !transferGroupId || !user?.groupId) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/groups/${user.groupId}/members`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "transfer",
          userId: transferUserId,
          targetGroupId: transferGroupId,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || "Failed to transfer");
        return;
      }
      setTransferUserId(null);
      setTransferGroupId("");
      setTransferDropdownOpen(false);
      setTransferSearch("");
      mutateMembers();
      queryClient.invalidateQueries({ queryKey: queryKeys.logs.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.checkins.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.stats.all });
    } catch {
      toast.error("Network error");
    } finally {
      setSaving(false);
    }
  };

  if (authLoading || !user || user.role !== "coach") {
    return <LoadingScreen />;
  }

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <PageHeader title="Manage Group" />

      <main className="flex-1 overflow-y-auto scrollbar-hidden p-6">
        <div className="mx-auto max-w-2xl space-y-8">
          <AnimatePresence mode="wait">
            {!user.groupId ? (
              <motion.div
                key="empty-no-group"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
              >
                <EmptyStateCard
                  icon={Settings}
                  message="Join a group to manage it."
                />
              </motion.div>
            ) : user.groupId && (membersLoading || trainingScheduleLoading) ? (
              <motion.div
                key="skeleton"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
              >
                <ManageGroupPageSkeleton />
              </motion.div>
            ) : (
              <motion.div
                key="content"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="space-y-8"
              >
                <GroupRolesSection
                newRoleName={newRoleName}
                setNewRoleName={setNewRoleName}
                editingRoleId={editingRoleId}
                addingRole={addingRole}
                saving={saving}
                deleteRoleConfirmOpen={deleteRoleConfirmOpen}
                setDeleteRoleConfirmOpen={setDeleteRoleConfirmOpen}
                roles={roles}
                onAddRole={handleAddRole}
                onUpdateRole={handleUpdateRole}
                onDeleteRole={handleDeleteRole}
                onCancelEdit={handleCancelEditRole}
                onSelectRole={(id, name) => {
                  setEditingRoleId(id);
                  setNewRoleName(name);
                }}
              />
              <GroupTrainingScheduleSection
                trainingSchedule={trainingSchedule}
                onAddSlot={addTrainingSlot}
                onRemoveSlot={removeTrainingSlot}
                onUpdateSlot={updateTrainingSlot}
              />
              <GroupAthletesSection
                groupId={user.groupId}
                athletes={athletes}
                allAthletes={allAthletes}
                athleteSearch={athleteSearch}
                setAthleteSearch={setAthleteSearch}
                onMutateMembers={mutateMembers}
                roles={roles}
                roleDropdownAthleteId={roleDropdownAthleteId}
                setRoleDropdownAthleteId={setRoleDropdownAthleteId}
                transferUserId={transferUserId}
                setTransferUserId={setTransferUserId}
                transferGroupId={transferGroupId}
                setTransferGroupId={setTransferGroupId}
                transferDropdownOpen={transferDropdownOpen}
                setTransferDropdownOpen={setTransferDropdownOpen}
                transferSearch={transferSearch}
                setTransferSearch={setTransferSearch}
                transferableGroups={transferableGroups}
                filteredTransferGroups={filteredTransferGroups}
                removeConfirmUserId={removeConfirmUserId}
                setRemoveConfirmUserId={setRemoveConfirmUserId}
                saving={saving}
                onAssignRoles={handleAssignRoles}
                onTransfer={handleTransfer}
                onRemoveAthlete={handleRemoveAthlete}
              />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}
