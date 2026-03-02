"use client";

import { useState, useEffect } from "react";
import { useTheme } from "next-themes";
import { Palette, Sun, Moon, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";

const colorThemes = [
  {
    id: "green",
    label: "Green + Amber",
    primary: "hsl(152 48% 36%)",
    accent: "hsl(38 92% 50%)",
    primaryDark: "hsl(152 55% 42%)",
    accentDark: "hsl(38 92% 50%)",
  },
  {
    id: "blue",
    label: "Blue + Yellow",
    primary: "hsl(217 72% 50%)",
    accent: "hsl(45 93% 47%)",
    primaryDark: "hsl(217 80% 56%)",
    accentDark: "hsl(45 93% 50%)",
  },
  {
    id: "indigo",
    label: "Indigo + Rose",
    primary: "hsl(239 60% 55%)",
    accent: "hsl(350 70% 55%)",
    primaryDark: "hsl(239 70% 64%)",
    accentDark: "hsl(350 75% 60%)",
  },
] as const;

type ColorThemeId = (typeof colorThemes)[number]["id"];

export function ThemeSwitcher() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [colorTheme, setColorTheme] = useState<ColorThemeId>("green");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const stored = localStorage.getItem("pretvia-color") as ColorThemeId | null;
    if (stored && colorThemes.some((t) => t.id === stored)) {
      setColorTheme(stored);
      document.documentElement.setAttribute("data-theme", stored);
    }
  }, []);

  const handleColorChange = (id: ColorThemeId) => {
    setColorTheme(id);
    document.documentElement.setAttribute("data-theme", id);
    localStorage.setItem("pretvia-color", id);
  };

  const isDark = resolvedTheme === "dark";

  if (!mounted) {
    return (
      <Button
        variant="ghost-secondary"
        size="icon"
        className="h-8 w-8"
        aria-label="Theme settings"
      >
        <Palette className="h-4 w-4" />
      </Button>
    );
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost-secondary"
          size="icon"
          className="h-8 w-8"
          aria-label="Theme settings"
        >
          <Palette className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-56 p-3">
        {/* Color choices */}
        <p className="mb-2 text-xs font-medium text-muted-foreground">Color</p>
        <div className="flex flex-col gap-1">
          {colorThemes.map((ct) => {
            const isActive = colorTheme === ct.id;
            const primaryColor = isDark ? ct.primaryDark : ct.primary;
            const accentColor = isDark ? ct.accentDark : ct.accent;
            return (
              <button
                key={ct.id}
                type="button"
                onClick={() => handleColorChange(ct.id)}
                className={`flex items-center gap-3 rounded-md px-2 py-1.5 text-sm transition-colors ${
                  isActive
                    ? "bg-secondary text-foreground"
                    : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
                }`}
                aria-label={`${ct.label} theme`}
              >
                <span className="flex items-center gap-1.5">
                  <span
                    className="block h-3.5 w-3.5 rounded-full"
                    style={{ backgroundColor: primaryColor }}
                  />
                  <span
                    className="block h-3.5 w-3.5 rounded-full"
                    style={{ backgroundColor: accentColor }}
                  />
                </span>
                <span className="flex-1 text-left">{ct.label}</span>
                {isActive && <Check className="h-3.5 w-3.5 text-primary" />}
              </button>
            );
          })}
        </div>

        {/* Divider */}
        <div className="my-2 h-px bg-border" />

        {/* Light / Dark toggle */}
        <p className="mb-2 text-xs font-medium text-muted-foreground">Mode</p>
        <div className="flex gap-1">
          <button
            type="button"
            onClick={() => setTheme("light")}
            className={`flex flex-1 items-center justify-center gap-2 rounded-md px-3 py-1.5 text-sm transition-colors ${
              theme === "light"
                ? "bg-secondary text-foreground"
                : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
            }`}
            aria-label="Light mode"
          >
            <Sun className="h-3.5 w-3.5" />
            Light
          </button>
          <button
            type="button"
            onClick={() => setTheme("dark")}
            className={`flex flex-1 items-center justify-center gap-2 rounded-md px-3 py-1.5 text-sm transition-colors ${
              theme === "dark"
                ? "bg-secondary text-foreground"
                : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
            }`}
            aria-label="Dark mode"
          >
            <Moon className="h-3.5 w-3.5" />
            Dark
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
