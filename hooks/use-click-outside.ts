"use client";

import { useEffect, useRef, type RefObject } from "react";

/**
 * Listens for mousedown outside the given ref and calls onOutsideClick when active.
 * Use for dropdowns, popovers, etc. to close on outside click.
 */
export function useClickOutside<T extends HTMLElement>(
  ref: RefObject<T | null>,
  isActive: boolean,
  onOutsideClick: () => void,
) {
  // Held in a ref so callers passing an inline arrow don't force the
  // listener to be torn down and re-added on every render.
  const onOutsideClickRef = useRef(onOutsideClick);
  onOutsideClickRef.current = onOutsideClick;

  useEffect(() => {
    if (!isActive) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onOutsideClickRef.current();
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [ref, isActive]);
}
