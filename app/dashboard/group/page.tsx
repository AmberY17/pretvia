"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import useSWR from "swr";
import { urlFetcher } from "@/lib/swr-utils";
import { Settings } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/dashboard/page-header";
import { LoadingScreen } from "@/components/ui/loading-screen";
import { GroupRolesSection } from "@/components/dashboard/group/group-roles-section";
import { GroupTrainingScheduleSection } from "@/components/dashboard/group/group-training-schedule-section";
import { GroupAthletesSection } from "@/components/dashboard/group/group-athletes-section";
import { toast } from "sonner";
import type { Member, Role } from "@/types/dashboard";

export default function GroupManagementPage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
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
  const [trainingSchedule, setTrainingSchedule] = useState<
    { dayOfWeek: number; time: string }[]
  >([]);
  const [savingTrainingSchedule, setSavingTrainingSchedule] = useState(false);
  const [athleteSearch, setAthleteSearch] = useState("");

  const groupsUrl =
    user?.role === "coach" ? "/api/groups?mode=coach-groups" : null;
  const { data: coachGroupsData } = useSWR<{
    groups: { id: string; name: string }[];
  }>(groupsUrl && user ? [groupsUrl, user.id] : null, urlFetcher);

  const membersUrl = user?.groupId
    ? `/api/groups?groupId=${user.groupId}`
    : null;
  const { data: membersData, mutate: mutateMembers } = useSWR<{
    members: Member[];
    roles: Role[];
  }>(
    membersUrl && user ? [membersUrl, user.id, user.groupId] : null,
    urlFetcher,
  );

  useEffect(() => {
    if (!authLoading && (!user || user.role !== "coach")) {
      router.push("/dashboard");
    }
  }, [authLoading, user, router]);

  const allAthletes = (membersData?.members ?? []).filter(
    (m) => m.role !== "coach",
  );
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
  useEffect(() => {
    if (!user?.groupId) return;
    let cancelled = false;
    const loadTrainingSchedule = async () => {
      try {
        const res = await fetch(
          `/api/groups/${user.groupId}/training-schedule`,
        );
        if (!res.ok) return;
        const data = await res.json();
        if (cancelled) return;
        const slots = Array.isArray(data.trainingScheduleTemplate)
          ? data.trainingScheduleTemplate
          : [];
        setTrainingSchedule(
          slots.map((s: { dayOfWeek: number; time: string }) => ({
            dayOfWeek: s.dayOfWeek,
            time: s.time || "09:00",
          })),
        );
      } catch {
        // ignore for now
      }
    };
    loadTrainingSchedule();
    return () => {
      cancelled = true;
    };
  }, [user?.groupId]);

  const addTrainingSlot = () => {
    setTrainingSchedule((prev) => [...prev, { dayOfWeek: 1, time: "09:00" }]);
  };

  const removeTrainingSlot = (index: number) => {
    setTrainingSchedule((prev) => prev.filter((_, i) => i !== index));
  };

  const updateTrainingSlot = (
    index: number,
    field: "dayOfWeek" | "time",
    value: number | string,
  ) => {
    setTrainingSchedule((prev) =>
      prev.map((s, i) => (i === index ? { ...s, [field]: value } : s)),
    );
  };

  const handleSaveTrainingSchedule = async () => {
    if (!user?.groupId) return;
    setSavingTrainingSchedule(true);
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
      toast.success(
        "Training schedule updated and applied to all athletes in this group.",
      );
    } catch {
      toast.error("Network error");
    } finally {
      setSavingTrainingSchedule(false);
    }
  };
  const filteredTransferGroups = transferSearch.trim()
    ? transferableGroups.filter((g) =>
        g.name.toLowerCase().includes(transferSearch.trim().toLowerCase()),
      )
    : transferableGroups;

  const handleCancelEditRole = () => {
    setEditingRoleId(null);
    setNewRoleName("");
  };

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
    <div className="flex min-h-screen flex-col">
      <PageHeader title="Manage Group" />

      <main className="flex-1 overflow-y-auto p-6">
        <div className="mx-auto max-w-2xl space-y-8">
          {!user.groupId ? (
            <div className="rounded-2xl border border-dashed border-border py-16 text-center">
              <Settings className="mx-auto h-12 w-12 text-muted-foreground" />
              <p className="mt-3 text-sm text-muted-foreground">
                Join a group to manage it.
              </p>
              <Link href="/dashboard">
                <Button variant="ghost-primary" size="sm" className="mt-4">
                  Go to Dashboard
                </Button>
              </Link>
            </div>
          ) : (
            <>
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
                onSave={handleSaveTrainingSchedule}
                saving={savingTrainingSchedule}
              />
              <GroupAthletesSection
                athletes={athletes}
                allAthletes={allAthletes}
                athleteSearch={athleteSearch}
                setAthleteSearch={setAthleteSearch}
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
            </>
          )}
        </div>
      </main>
    </div>
  );
}
