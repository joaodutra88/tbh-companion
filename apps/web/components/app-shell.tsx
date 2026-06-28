"use client";

import React from "react";

// ── Tab definitions ──────────────────────────────────────────────────────────

interface TabDef {
  id: string;
  label: string;
  active: boolean;
  disabled: boolean;
}

const TABS: TabDef[] = [
  { id: "overview",  label: "Overview",  active: true,  disabled: false },
  { id: "farm",      label: "Farm",      active: false, disabled: true  },
  { id: "runas",     label: "Runas",     active: false, disabled: true  },
  { id: "gear",      label: "Gear",      active: false, disabled: true  },
  { id: "loja",      label: "Loja",      active: false, disabled: true  },
  { id: "vender",    label: "Vender",    active: false, disabled: true  },
  { id: "historico", label: "Histórico", active: false, disabled: true  },
  { id: "baus",      label: "Baús",      active: false, disabled: true  },
];

// ── Types ────────────────────────────────────────────────────────────────────

interface AppShellProps {
  children: React.ReactNode;
  /** Optional slot rendered in the top-bar right side (status, save controls). */
  statusSlot?: React.ReactNode;
}

// ── Component ────────────────────────────────────────────────────────────────

export function AppShell({ children, statusSlot }: AppShellProps) {
  return (
    <div className="min-h-screen flex flex-col bg-bg text-text">
      {/* ── Top bar ── */}
      <header className="flex items-center justify-between px-4 md:px-6 h-[52px] bg-surface border-b border-line shrink-0">
        {/* Logo */}
        <span className="select-none font-display font-semibold text-[18px] tracking-[-0.01em] text-text">
          TBH{" "}
          <span className="text-gold">Companion</span>
        </span>

        {/* Right-side status/save slot */}
        <div className="flex items-center gap-3 min-w-0">
          {statusSlot ?? (
            <span className="text-[12px] text-dim font-body">
              {/* Preenchido pela Task 2 */}
            </span>
          )}
        </div>
      </header>

      {/* ── Tab navigation ── */}
      <nav aria-label="Seções do app" className="bg-surface border-b border-line shrink-0">
        {/* role="tablist" required by ARIA tab pattern */}
        <div
          role="tablist"
          className="flex overflow-x-auto px-4 gap-0.5"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
          {TABS.map((tab) => (
            <TabButton key={tab.id} tab={tab} />
          ))}
        </div>
      </nav>

      {/* ── Main content ── */}
      <main className="flex-1 flex flex-col min-h-0">
        {children}
      </main>
    </div>
  );
}

// ── TabButton ─────────────────────────────────────────────────────────────────

function TabButton({ tab }: { tab: TabDef }) {
  // outline: "none" intentionally omitted — let :focus-visible gold ring show
  const baseClass =
    "inline-flex items-center py-[10px] px-[14px] " +
    "text-[13px] font-body font-medium whitespace-nowrap " +
    "border-b-2 bg-transparent " +
    "select-none shrink-0 transition-colors duration-150 -mb-px " +
    (tab.disabled ? "cursor-default" : "cursor-pointer");

  if (tab.active) {
    return (
      <button
        role="tab"
        aria-selected="true"
        className={`${baseClass} text-gold border-b-gold`}
      >
        {tab.label}
      </button>
    );
  }

  if (tab.disabled) {
    return (
      <button
        role="tab"
        aria-selected="false"
        aria-disabled="true"
        title="em breve"
        tabIndex={-1}
        className={`${baseClass} text-dim border-b-transparent opacity-55`}
      >
        {tab.label}
      </button>
    );
  }

  return (
    <button
      role="tab"
      aria-selected="false"
      className={`${baseClass} text-dim border-b-transparent`}
    >
      {tab.label}
    </button>
  );
}
