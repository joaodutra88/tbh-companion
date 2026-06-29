"use client";

import React from "react";
import { TabsRoot, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { TooltipRoot, TooltipTrigger, TooltipPortal, TooltipPositioner, TooltipPopup } from "@/components/ui/tooltip";

// ── Tab definitions ──────────────────────────────────────────────────────────

interface TabDef {
  id: string;
  label: string;
  disabled: boolean;
}

const TABS: TabDef[] = [
  { id: "overview",  label: "Overview",  disabled: false },
  { id: "farm",      label: "Farm",      disabled: false },
  { id: "baus",      label: "Baús",      disabled: false },
  { id: "runas",     label: "Runas",     disabled: false },
  { id: "gear",      label: "Gear",      disabled: true  },
  { id: "loja",      label: "Loja",      disabled: true  },
  { id: "vender",    label: "Vender",    disabled: true  },
  { id: "historico", label: "Histórico", disabled: true  },
];

// ── Types ────────────────────────────────────────────────────────────────────

interface AppShellProps {
  children: React.ReactNode;
  /** Optional slot rendered in the top-bar right side (status, save controls). */
  statusSlot?: React.ReactNode;
  /** The currently active tab id. */
  activeTab: string;
  /** Called when the user clicks an enabled tab. */
  onTabChange: (id: string) => void;
  /** When false the tab nav is hidden (save not yet loaded). */
  ready?: boolean;
}

// ── Component ────────────────────────────────────────────────────────────────

export function AppShell({
  children,
  statusSlot,
  activeTab,
  onTabChange,
  ready = false,
}: AppShellProps) {
  return (
    <div className="min-h-screen flex flex-col bg-bg text-text">
      {/* ── Top bar ── */}
      <header className="flex items-center justify-between px-4 md:px-6 h-[52px] bg-surface border-b border-line shrink-0">
        {/* Logo — h1 for document heading hierarchy */}
        <h1 className="select-none font-display font-semibold text-[18px] tracking-[-0.01em] text-text">
          TBH{" "}
          <span className="text-gold">Companion</span>
        </h1>

        {/* Right-side status/save slot */}
        <div className="flex items-center gap-3 min-w-0">
          {statusSlot ?? (
            <span className="text-[12px] text-dim font-body" />
          )}
        </div>
      </header>

      {/* ── Tabs: nav + main content ── */}
      <TabsRoot
        value={activeTab}
        onValueChange={(v) => onTabChange(v as string)}
        className="flex-1 flex flex-col min-h-0"
      >
        {/* Tab navigation — hidden until save is ready */}
        {ready && (
          <nav aria-label="Seções do app" className="bg-surface border-b border-line shrink-0">
            <TabsList className="px-4">
              {TABS.map((tab) =>
                tab.disabled ? (
                  // Disabled tab: wrapped in Tooltip so "em breve" is keyboard+hover accessible.
                  // TooltipTrigger renders as <span> so pointer events reach it even though
                  // the inner <button disabled> can't be focused/clicked.
                  <TooltipRoot key={tab.id}>
                    <TooltipTrigger
                      render={<span className="inline-flex shrink-0 -mb-px" />}
                    >
                      <TabsTrigger value={tab.id} disabled>
                        {tab.label}
                      </TabsTrigger>
                    </TooltipTrigger>
                    <TooltipPortal>
                      <TooltipPositioner side="bottom">
                        <TooltipPopup>em breve</TooltipPopup>
                      </TooltipPositioner>
                    </TooltipPortal>
                  </TooltipRoot>
                ) : (
                  <TabsTrigger key={tab.id} value={tab.id}>
                    {tab.label}
                  </TabsTrigger>
                ),
              )}
            </TabsList>
          </nav>
        )}

        {/* Main content — always rendered; value matches active tab so panel is always visible */}
        <TabsContent value={activeTab}>
          {children}
        </TabsContent>
      </TabsRoot>
    </div>
  );
}
