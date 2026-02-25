"use client"

import React from "react"

import { useState, useCallback, useRef, useEffect } from "react"
import { X } from "lucide-react"
import { Input } from "@/components/ui/input"
import { useClickOutside } from "@/hooks/use-click-outside"

interface TagInputProps {
  tags: string[]
  onChange: (tags: string[]) => void
  placeholder?: string
  suggestions?: string[]
}

export function TagInput({
  tags,
  onChange,
  placeholder = "Add tag and press Enter",
  suggestions = [],
}: TagInputProps) {
  const [inputValue, setInputValue] = useState("")
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(-1)
  const wrapperRef = useRef<HTMLDivElement>(null)

  useClickOutside(wrapperRef, showSuggestions, () => setShowSuggestions(false))

  // Filter suggestions based on input
  const filteredSuggestions =
    inputValue.trim().length > 0
      ? suggestions.filter(
          (s) =>
            s.toLowerCase().includes(inputValue.toLowerCase()) &&
            !tags.includes(s)
        )
      : []

  // Reset selected index when suggestions change
  useEffect(() => {
    setSelectedIndex(-1)
  }, [inputValue])

  const addTag = useCallback(
    (value: string) => {
      const trimmed = value.trim().toLowerCase()
      if (trimmed && !tags.includes(trimmed)) {
        onChange([...tags, trimmed])
      }
      setInputValue("")
      setShowSuggestions(false)
    },
    [tags, onChange]
  )

  const removeTag = useCallback(
    (tagToRemove: string) => {
      onChange(tags.filter((t) => t !== tagToRemove))
    },
    [tags, onChange]
  )

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "ArrowDown") {
        e.preventDefault()
        if (filteredSuggestions.length > 0) {
          setShowSuggestions(true)
          setSelectedIndex((prev) =>
            prev < filteredSuggestions.length - 1 ? prev + 1 : 0
          )
        }
      } else if (e.key === "ArrowUp") {
        e.preventDefault()
        if (filteredSuggestions.length > 0) {
          setSelectedIndex((prev) =>
            prev > 0 ? prev - 1 : filteredSuggestions.length - 1
          )
        }
      } else if (e.key === "Enter") {
        e.preventDefault()
        if (selectedIndex >= 0 && filteredSuggestions[selectedIndex]) {
          addTag(filteredSuggestions[selectedIndex])
        } else {
          addTag(inputValue)
        }
      } else if (e.key === "Escape") {
        setShowSuggestions(false)
      } else if (e.key === "Backspace" && !inputValue && tags.length > 0) {
        removeTag(tags[tags.length - 1])
      }
    },
    [inputValue, tags, addTag, removeTag, filteredSuggestions, selectedIndex]
  )

  return (
    <div className="flex flex-col gap-2" ref={wrapperRef}>
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {tags.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary"
            >
              {tag}
              <button
                type="button"
                onClick={() => removeTag(tag)}
                className="rounded-full p-0.5 transition-colors hover:bg-primary/20"
                aria-label={`Remove ${tag} tag`}
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}
      <div className="relative">
        <Input
          value={inputValue}
          onChange={(e) => {
            setInputValue(e.target.value)
            setShowSuggestions(true)
          }}
          onFocus={() => {
            if (inputValue.trim()) setShowSuggestions(true)
          }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="bg-secondary border-border text-foreground placeholder:text-muted-foreground"
        />
        {/* Suggestions dropdown */}
        {showSuggestions && filteredSuggestions.length > 0 && (
          <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-36 overflow-y-auto rounded-lg border border-border bg-card shadow-lg">
            {filteredSuggestions.map((suggestion, i) => (
              <button
                key={suggestion}
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault() // Prevent blur before click
                  addTag(suggestion)
                }}
                onMouseEnter={() => setSelectedIndex(i)}
                className={`flex w-full items-center px-3 py-1.5 text-left text-xs transition-colors ${
                  i === selectedIndex
                    ? "bg-primary/10 text-primary"
                    : "text-foreground hover:bg-secondary"
                }`}
              >
                {suggestion}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
