"use client"

import React, { useState } from "react"
import { Users, Search, UserPlus, Upload } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { InviteAthleteModal } from "./invitations/invite-athlete-modal"
import { BulkInviteModal } from "./invitations/bulk-invite-modal"
import { AthleteRow } from "./athlete-row"
import type { Member, Role } from "@/types/dashboard"

interface GroupAthletesSectionProps {
  groupId: string
  athletes: Member[]
  allAthletes: Member[]
  athleteSearch: string
  setAthleteSearch: (v: string) => void
  onMutateMembers?: () => void
  roles: Role[]
  roleDropdownAthleteId: string | null
  setRoleDropdownAthleteId: React.Dispatch<React.SetStateAction<string | null>>
  transferUserId: string | null
  setTransferUserId: React.Dispatch<React.SetStateAction<string | null>>
  transferGroupId: string
  setTransferGroupId: (v: string) => void
  transferDropdownOpen: boolean
  setTransferDropdownOpen: React.Dispatch<React.SetStateAction<boolean>>
  transferSearch: string
  setTransferSearch: (v: string) => void
  transferableGroups: { id: string; name: string }[]
  filteredTransferGroups: { id: string; name: string }[]
  removeConfirmUserId: string | null
  setRemoveConfirmUserId: React.Dispatch<React.SetStateAction<string | null>>
  saving: boolean
  onAssignRoles: (userId: string, roleIds: string[]) => void
  onTransfer: () => void
  onRemoveAthlete: (userId: string) => void
  onCancelInvite?: (inviteId: string) => void
}

export function GroupAthletesSection({
  groupId,
  athletes,
  allAthletes,
  athleteSearch,
  setAthleteSearch,
  onMutateMembers,
  roles,
  roleDropdownAthleteId,
  setRoleDropdownAthleteId,
  transferUserId,
  setTransferUserId,
  transferGroupId,
  setTransferGroupId,
  transferDropdownOpen,
  setTransferDropdownOpen,
  transferSearch,
  setTransferSearch,
  transferableGroups,
  filteredTransferGroups,
  removeConfirmUserId,
  setRemoveConfirmUserId,
  saving,
  onAssignRoles,
  onTransfer,
  onRemoveAthlete,
  onCancelInvite,
}: GroupAthletesSectionProps) {
  const [inviteOpen, setInviteOpen] = useState(false)
  const [bulkOpen, setBulkOpen] = useState(false)

  return (
    <section className="rounded-2xl border border-border bg-card p-6">
      <div className="mb-4 flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-base font-semibold text-foreground">
          <Users className="h-4 w-4" />
          Athletes
        </h2>
        <div className="flex items-center gap-1.5">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setBulkOpen(true)}
            className="gap-1 text-xs"
          >
            <Upload className="h-3.5 w-3.5" />
            Import CSV
          </Button>
          <Button
            size="sm"
            variant="ghost-primary"
            onClick={() => setInviteOpen(true)}
            className="gap-1 text-xs"
          >
            <UserPlus className="h-3.5 w-3.5" />
            Invite
          </Button>
        </div>
      </div>
      <InviteAthleteModal
        open={inviteOpen}
        onOpenChange={setInviteOpen}
        groupId={groupId}
        onSent={onMutateMembers ?? (() => {})}
      />
      <BulkInviteModal
        open={bulkOpen}
        onOpenChange={setBulkOpen}
        groupId={groupId}
        onSent={onMutateMembers ?? (() => {})}
      />
      {allAthletes.length > 0 && (
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search athletes by name or email..."
            value={athleteSearch}
            onChange={(e) => setAthleteSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      )}
      {allAthletes.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No athletes in this group yet. Invite athletes by email to add them.
        </p>
      ) : athletes.length === 0 ? (
        <p className="text-sm text-muted-foreground">No athletes match your search.</p>
      ) : (
        <div
          className={`space-y-4 ${
            athletes.length > 4 ? "max-h-[340px] overflow-y-auto scrollbar-hidden" : ""
          }`}
        >
          {athletes.map((a) => (
            <AthleteRow
              key={a.id}
              athlete={a}
              groupId={groupId}
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
              onAssignRoles={onAssignRoles}
              onTransfer={onTransfer}
              onRemoveAthlete={onRemoveAthlete}
              onCancelInvite={onCancelInvite}
            />
          ))}
        </div>
      )}
    </section>
  )
}
