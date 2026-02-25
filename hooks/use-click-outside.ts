"use client";

import { useEffect, type RefObject } from "react";

/**
 * Listens for mousedown outside the given ref and calls onOutsideClick when active.
 * Use for dropdowns, popovers, etc. to close on outside click.
 */
export function useClickOutside<T extends HTMLElement>(
  ref: RefObject<T | null>,
  isActive: boolean,
  onOutsideClick: () => void,
) {
  useEffect(() => {
    if (!isActive) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onOutsideClick();
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [ref, isActive, onOutsideClick]);
}
