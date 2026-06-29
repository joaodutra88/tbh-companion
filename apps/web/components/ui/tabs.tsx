"use client";

// ── Tabs (Base UI) — war-table themed ────────────────────────────────────────
// Wraps @base-ui/react/tabs following the same pattern as button.tsx.
// Exposes: TabsRoot, TabsList, TabsTrigger, TabsContent.
//
// Active trigger:  gold underline via aria-selected="true" Tailwind variant.
// Disabled trigger: dimmed (opacity-55, text-dim); no pointer interaction.
// Panel:           always rendered with role="tabpanel" + aria-labelledby.

import { Tabs } from "@base-ui/react/tabs";
import { cn } from "@/lib/utils";

// ── Root ──────────────────────────────────────────────────────────────────────

function TabsRoot({ className, ...props }: Tabs.Root.Props) {
  return (
    <Tabs.Root
      className={cn("flex flex-col", className)}
      {...props}
    />
  );
}

// ── List (renders role="tablist") ─────────────────────────────────────────────

function TabsList({ className, style, ...props }: Tabs.List.Props) {
  return (
    <Tabs.List
      className={cn(
        "flex overflow-x-auto gap-0.5",
        className,
      )}
      style={{ scrollbarWidth: "none", msOverflowStyle: "none", ...style }}
      {...props}
    />
  );
}

// ── Trigger (renders role="tab") ──────────────────────────────────────────────
// Styling mirrors the old TabButton:
//   inactive  → text-dim  + border-b-transparent + hover:text-text
//   active    → text-gold + border-b-gold          (via aria-selected:*)
//   disabled  → opacity-55 + text-dim + cursor-default

function TabsTrigger({ className, ...props }: Tabs.Tab.Props) {
  return (
    <Tabs.Tab
      className={cn(
        // Layout (identical to old TabButton base class)
        "inline-flex items-center py-[10px] px-[14px]",
        "text-[13px] font-body font-medium whitespace-nowrap",
        "border-b-2 bg-transparent",
        "select-none shrink-0 transition-colors duration-150 -mb-px",
        // Focus ring (war-table gold)
        "outline-none focus-visible:outline-2 focus-visible:outline-gold focus-visible:outline-offset-0",
        // Inactive default
        "cursor-pointer text-dim border-b-transparent hover:text-text",
        // Active — Base UI sets aria-selected="true" on the active tab
        "aria-selected:text-gold aria-selected:border-b-gold aria-selected:cursor-default",
        // Disabled
        "disabled:opacity-55 disabled:text-dim disabled:cursor-default",
        className,
      )}
      {...props}
    />
  );
}

// ── Content (renders role="tabpanel") ─────────────────────────────────────────

function TabsContent({ className, ...props }: Tabs.Panel.Props) {
  return (
    <Tabs.Panel
      className={cn("flex-1 flex flex-col min-h-0 outline-none", className)}
      {...props}
    />
  );
}

export { TabsRoot, TabsList, TabsTrigger, TabsContent };
