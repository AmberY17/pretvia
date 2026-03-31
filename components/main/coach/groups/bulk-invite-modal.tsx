"use client"

import { useRef, useState } from "react"
import { Upload, X, CheckCircle2, AlertCircle, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"

interface ParsedRow {
  isUnder13: boolean
  athleteEmail: string
  parentEmail: string
  athleteNamePlaceholder: string
  error?: string
}

interface ResultRow {
  email: string
  ok: boolean
  error?: string
}

function parseCSV(text: string): ParsedRow[] {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
  if (lines.length === 0) return []

  // Detect header row
  const firstLine = lines[0].toLowerCase()
  const hasHeader =
    firstLine.includes("is_over_13") ||
    firstLine.includes("athlete_email") ||
    firstLine.includes("over_13")
  const dataLines = hasHeader ? lines.slice(1) : lines

  return dataLines.map((line) => {
    // Simple CSV split — handles basic quoting
    const cols = line.split(",").map((c) => c.trim().replace(/^"|"$/g, ""))
    const [col0 = "", col1 = "", col2 = "", col3 = ""] = cols

    const isOver13Val = col0.toLowerCase()
    const isUnder13 = isOver13Val === "false" || isOver13Val === "0" || isOver13Val === "no"
    const athleteEmail = col1.toLowerCase()
    const parentEmail = col2.toLowerCase()
    const athleteNamePlaceholder = col3

    const errors: string[] = []
    if (isUnder13 && !parentEmail) errors.push("parent email required for under-13")
    if (!isUnder13 && !athleteEmail) errors.push("athlete email required")
    if (athleteEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(athleteEmail))
      errors.push("invalid athlete email")
    if (parentEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(parentEmail))
      errors.push("invalid parent email")

    return {
      isUnder13,
      athleteEmail,
      parentEmail,
      athleteNamePlaceholder,
      error: errors.length > 0 ? errors.join("; ") : undefined,
    }
  })
}

interface BulkInviteModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  groupId: string
  onSent: () => void
}

export function BulkInviteModal({ open, onOpenChange, groupId, onSent }: BulkInviteModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [rows, setRows] = useState<ParsedRow[]>([])
  const [results, setResults] = useState<ResultRow[] | null>(null)
  const [loading, setLoading] = useState(false)

  const validRows = rows.filter((r) => !r.error)
  const hasErrors = rows.some((r) => r.error)

  const reset = () => {
    setRows([])
    setResults(null)
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  const handleFile = (file: File) => {
    if (!file.name.endsWith(".csv") && file.type !== "text/csv") {
      toast.error("Please upload a .csv file")
      return
    }
    const reader = new FileReader()
    reader.onload = (e) => {
      const text = e.target?.result as string
      setRows(parseCSV(text))
      setResults(null)
    }
    reader.readAsText(file)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  const handleSend = async () => {
    if (validRows.length === 0) return
    setLoading(true)
    try {
      const res = await fetch(`/api/groups/${groupId}/invites/bulk`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          invites: validRows.map((r) => ({
            isUnder13: r.isUnder13,
            athleteEmail: r.athleteEmail || undefined,
            parentEmail: r.parentEmail || undefined,
            athleteNamePlaceholder: r.athleteNamePlaceholder || undefined,
          })),
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error ?? "Failed to send invites")
        return
      }
      const resultRows: ResultRow[] = [
        ...(data.sent as string[]).map((email: string) => ({ email, ok: true })),
        ...(data.errors as { email: string; error: string }[]).map((e) => ({
          email: e.email,
          ok: false,
          error: e.error,
        })),
      ]
      setResults(resultRows)
      if (data.sent.length > 0) {
        toast.success(`${data.sent.length} invite${data.sent.length !== 1 ? "s" : ""} sent`)
        onSent()
      }
    } catch {
      toast.error("Something went wrong")
    } finally {
      setLoading(false)
    }
  }

  const handleClose = (o: boolean) => {
    if (!o) reset()
    onOpenChange(o)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Import CSV</DialogTitle>
        </DialogHeader>

        {results ? (
          /* Results screen */
          <div className="flex flex-col gap-4">
            <div className="max-h-64 overflow-y-auto flex flex-col gap-1.5">
              {results.map((r, i) => (
                <div
                  key={i}
                  className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm ${
                    r.ok
                      ? "bg-green-500/10 text-green-700 dark:text-green-400"
                      : "bg-destructive/10 text-destructive"
                  }`}
                >
                  {r.ok ? (
                    <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                  ) : (
                    <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                  )}
                  <span className="truncate">{r.email}</span>
                  {!r.ok && r.error && (
                    <span className="ml-auto shrink-0 text-xs opacity-70">{r.error}</span>
                  )}
                </div>
              ))}
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={reset}>
                Import Another
              </Button>
              <Button size="sm" onClick={() => handleClose(false)}>
                Done
              </Button>
            </div>
          </div>
        ) : rows.length === 0 ? (
          /* Upload screen */
          <div className="flex flex-col gap-4">
            <div
              className="flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-border bg-secondary/30 px-6 py-10 text-center transition-colors hover:border-primary/40 hover:bg-secondary/50 cursor-pointer"
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="h-7 w-7 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium text-foreground">Drop your CSV here</p>
                <p className="text-xs text-muted-foreground mt-0.5">or click to browse</p>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) handleFile(file)
                }}
              />
            </div>
            <div className="rounded-lg bg-secondary/50 px-4 py-3">
              <p className="text-xs font-medium text-foreground mb-1.5">Expected columns:</p>
              <code className="text-xs text-muted-foreground">
                is_over_13, athlete_email, parent_email, athlete_name_placeholder
              </code>
              <p className="text-xs text-muted-foreground mt-1.5">
                Set <code className="text-foreground">is_over_13</code> to{" "}
                <code className="text-foreground">false</code> for under-13 athletes (parent email
                required, athlete email optional).
              </p>
            </div>
          </div>
        ) : (
          /* Preview screen */
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                {validRows.length} valid row{validRows.length !== 1 ? "s" : ""}
                {hasErrors && (
                  <span className="ml-1.5 text-destructive">
                    · {rows.filter((r) => r.error).length} with errors
                  </span>
                )}
              </p>
              <button
                type="button"
                onClick={reset}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
              >
                <X className="h-3 w-3" />
                Clear
              </button>
            </div>
            <div className="max-h-64 overflow-y-auto flex flex-col gap-1.5">
              {rows.map((row, i) => (
                <div
                  key={i}
                  className={`rounded-lg px-3 py-2.5 text-xs ${
                    row.error ? "bg-destructive/10" : "bg-secondary/50"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={`shrink-0 rounded px-1 py-0.5 text-[10px] font-medium ${
                        row.isUnder13
                          ? "bg-amber-500/15 text-amber-700 dark:text-amber-400"
                          : "bg-primary/10 text-primary"
                      }`}
                    >
                      {row.isUnder13 ? "U13" : "13+"}
                    </span>
                    <span className="truncate text-foreground">
                      {row.athleteEmail || row.parentEmail || "(no email)"}
                    </span>
                    {row.parentEmail && row.athleteEmail && (
                      <span className="shrink-0 text-muted-foreground">+ parent</span>
                    )}
                    {row.athleteNamePlaceholder && (
                      <span className="shrink-0 text-muted-foreground italic">
                        {row.athleteNamePlaceholder}
                      </span>
                    )}
                  </div>
                  {row.error && <p className="mt-1 text-destructive">{row.error}</p>}
                </div>
              ))}
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={reset}>
                Re-upload
              </Button>
              <Button size="sm" onClick={handleSend} disabled={loading || validRows.length === 0}>
                {loading && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
                Send {validRows.length} Invite{validRows.length !== 1 ? "s" : ""}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
