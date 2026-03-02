"use client"

import { motion } from "framer-motion"
import { Tag, X } from "lucide-react"

interface TagFilterProps {
  tags: { id: string; name: string }[]
  activeTags: string[]
  onToggle: (tag: string) => void
  onClear: () => void
  hideHeader?: boolean
}

export function TagFilter({
  tags,
  activeTags,
  onToggle,
  onClear,
  hideHeader = false,
}: TagFilterProps) {
  const content = tags.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No tags yet. Create logs with tags to see them here.
        </p>
      ) : (
        <div
          className={
            hideHeader
              ? "flex gap-2 overflow-x-auto scrollbar-hidden"
              : "flex flex-wrap gap-2"
          }
        >
          {tags.map((tag) => {
            const isActive = activeTags.includes(tag.name)
            return (
              <motion.button
                key={tag.id}
                type="button"
                onClick={() => onToggle(tag.name)}
                whileTap={{ scale: 0.95 }}
                className={`inline-flex shrink-0 items-center rounded-full px-3 py-1.5 text-xs font-medium transition-all ${
                  isActive
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "bg-secondary text-muted-foreground hover:bg-secondary/80 hover:text-foreground"
                }`}
              >
                {tag.name}
              </motion.button>
            )
          })}
        </div>
      );

  if (hideHeader) {
    return <div className="min-w-0">{content}</div>
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Tag className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold text-foreground">
            Filter by Tags
          </h3>
        </div>
        {activeTags.length > 0 && (
          <button
            type="button"
            onClick={onClear}
            className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          >
            <X className="h-3 w-3" />
            Clear
          </button>
        )}
      </div>
      {content}
    </div>
  )
}
