"use client"

import { useState, useCallback } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { apiMutate } from "@/lib/query-client"

type WaitlistStatus = "pending" | "approved" | "rejected"

export interface WaitlistEntry {
  _id: string
  email: string
  name: string
  firstName?: string
  lastName?: string
  clubName?: string
  groups?: { ageGroups: string[]; level: string }[]
  status: WaitlistStatus
  createdAt: string
  approvedAt?: string
  inviteSentAt?: string
  usedAt?: string
}

interface WaitlistTableProps {
  initialEntries: WaitlistEntry[]
}

function formatGroups(groups?: { ageGroups: string[]; level: string }[]) {
  if (!groups || groups.length === 0) return "—"
  return groups
    .map((g, i) => {
      const ages = g.ageGroups.join(", ")
      const level = g.level || "—"
      return `Group ${i + 1}: ${ages} · ${level}`
    })
    .join(" / ")
}

export function WaitlistTable({ initialEntries }: WaitlistTableProps) {
  const [entries, setEntries] = useState(initialEntries)
  const [approving, setApproving] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [resending, setResending] = useState<string | null>(null)

  const handleApprove = useCallback(async (id: string) => {
    setApproving(id)
    try {
      const data = await apiMutate<{ emailOk?: boolean }>(`/api/admin/waitlist/${id}/approve`, {
        method: "POST",
      })
      setEntries((prev) =>
        prev.map((e) => (e._id === id ? { ...e, status: "approved" as WaitlistStatus } : e))
      )
      if (data.emailOk === false) {
        toast.warning("Approved — but email failed to send. Use Resend to retry.")
      } else {
        toast.success("Approved — invite email sent")
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to approve")
    } finally {
      setApproving(null)
    }
  }, [])

  const handleDelete = useCallback(async (id: string) => {
    setDeleting(id)
    try {
      await apiMutate(`/api/admin/waitlist/${id}`, { method: "DELETE" })
      setEntries((prev) => prev.filter((e) => e._id !== id))
      toast.success("Entry deleted")
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to delete")
    } finally {
      setDeleting(null)
    }
  }, [])

  const handleResend = useCallback(async (id: string) => {
    setResending(id)
    try {
      const data = await apiMutate<{ emailOk?: boolean }>(`/api/admin/waitlist/${id}/resend`, {
        method: "POST",
      })
      if (data.emailOk === false) {
        toast.error("Email failed to send — try again")
      } else {
        toast.success("Invite email resent")
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to resend")
    } finally {
      setResending(null)
    }
  }, [])

  const statusBadge = (entry: WaitlistEntry) => {
    if (entry.usedAt) {
      return (
        <div className="flex flex-col gap-0.5">
          <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800 dark:bg-green-900/30 dark:text-green-400">Account created</span>
          <span className="text-xs text-muted-foreground">{new Date(entry.usedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
        </div>
      )
    }
    if (entry.status === "approved") {
      return (
        <div className="flex flex-col gap-0.5">
          <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
            {entry.inviteSentAt ? "Invite sent" : "Approved — email pending"}
          </span>
          {entry.inviteSentAt && (
            <span className="text-xs text-muted-foreground">
              {new Date(entry.inviteSentAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
            </span>
          )}
        </div>
      )
    }
    if (entry.status === "rejected") {
      return <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-800 dark:bg-red-900/30 dark:text-red-400">Rejected</span>
    }
    return <span className="rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400">Pending</span>
  }

  if (entries.length === 0) {
    return <p className="text-muted-foreground py-8 text-center">No waitlist entries yet.</p>
  }

  return (
    <div className="rounded-xl border border-border">
      <table className="w-full text-sm">
        <thead className="border-b border-border bg-muted/50">
          <tr>
            <th className="px-4 py-3 text-left font-medium text-muted-foreground">Name</th>
            <th className="px-4 py-3 text-left font-medium text-muted-foreground">Email</th>
            <th className="px-4 py-3 text-left font-medium text-muted-foreground">Club</th>
            <th className="px-4 py-3 text-left font-medium text-muted-foreground">Groups</th>
            <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
            <th className="px-4 py-3 text-left font-medium text-muted-foreground">Submitted</th>
            <th className="px-4 py-3 text-left font-medium text-muted-foreground">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {entries.map((entry) => (
            <tr key={entry._id} className="bg-card hover:bg-muted/30 transition-colors">
              <td className="px-4 py-3 font-medium text-foreground">
                {entry.firstName && entry.lastName
                  ? `${entry.firstName} ${entry.lastName}`
                  : entry.name}
              </td>
              <td className="px-4 py-3 text-muted-foreground">{entry.email}</td>
              <td className="px-4 py-3 text-muted-foreground">{entry.clubName || "—"}</td>
              <td className="px-4 py-3 text-muted-foreground">{formatGroups(entry.groups)}</td>
              <td className="px-4 py-3">{statusBadge(entry)}</td>
              <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                {new Date(entry.createdAt).toLocaleDateString()}
              </td>
              <td className="px-4 py-3">
                {entry.usedAt ? (
                  <span className="text-muted-foreground text-xs">—</span>
                ) : entry.status === "pending" ? (
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => handleApprove(entry._id)}
                      disabled={approving === entry._id}
                    >
                      {approving === entry._id ? "Approving…" : "Approve"}
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleDelete(entry._id)}
                      disabled={deleting === entry._id}
                    >
                      {deleting === entry._id ? "Deleting…" : "Delete"}
                    </Button>
                  </div>
                ) : entry.status === "approved" ? (
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleDelete(entry._id)}
                      disabled={deleting === entry._id}
                    >
                      {deleting === entry._id ? "Deleting…" : "Delete"}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleResend(entry._id)}
                      disabled={resending === entry._id}
                    >
                      {resending === entry._id ? "Resending…" : "Resend"}
                    </Button>
                  </div>
                ) : (
                  <span className="text-muted-foreground text-xs">—</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
