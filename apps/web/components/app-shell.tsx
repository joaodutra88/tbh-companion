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
    <div className="min-h-screen flex flex-col" style={{ background: "var(--bg)", color: "var(--text)" }}>
      {/* ── Top bar ── */}
      <header
        className="flex items-center justify-between px-4 md:px-6"
        style={{
          height: 52,
          background: "var(--surface)",
          borderBottom: "1px solid var(--line)",
          flexShrink: 0,
        }}
      >
        {/* Logo */}
        <span
          className="select-none"
          style={{
            fontFamily: "var(--font-display), system-ui, sans-serif",
            fontWeight: 600,
            fontSize: 18,
            letterSpacing: "-0.01em",
            color: "var(--text)",
          }}
        >
          TBH{" "}
          <span style={{ color: "var(--gold)" }}>
            Companion
          </span>
        </span>

        {/* Right-side status/save slot */}
        <div className="flex items-center gap-3" style={{ minWidth: 0 }}>
          {statusSlot ?? (
            <span
              style={{
                fontSize: 12,
                color: "var(--dim)",
                fontFamily: "var(--font-body), system-ui, sans-serif",
              }}
            >
              {/* Preenchido pela Task 2 */}
            </span>
          )}
        </div>
      </header>

      {/* ── Tab navigation ── */}
      <nav
        aria-label="Seções do app"
        style={{
          background: "var(--surface)",
          borderBottom: "1px solid var(--line)",
          flexShrink: 0,
        }}
      >
        <div
          className="flex overflow-x-auto"
          style={{
            scrollbarWidth: "none",
            msOverflowStyle: "none",
            paddingLeft: "1rem",
            paddingRight: "1rem",
            gap: 2,
          }}
        >
          {TABS.map((tab) => (
            <TabButton key={tab.id} tab={tab} />
          ))}
        </div>
      </nav>

      {/* ── Main content ── */}
      <main className="flex-1 flex flex-col" style={{ minHeight: 0 }}>
        {children}
      </main>
    </div>
  );
}

// ── TabButton ─────────────────────────────────────────────────────────────────

function TabButton({ tab }: { tab: TabDef }) {
  const baseStyle: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    paddingTop: 10,
    paddingBottom: 10,
    paddingLeft: 14,
    paddingRight: 14,
    fontSize: 13,
    fontFamily: "var(--font-body), system-ui, sans-serif",
    fontWeight: 500,
    whiteSpace: "nowrap",
    border: "none",
    background: "transparent",
    cursor: tab.disabled ? "default" : "pointer",
    userSelect: "none",
    flexShrink: 0,
    transition: "color 0.15s, border-color 0.15s",
    borderBottom: "2px solid transparent",
    marginBottom: -1, /* overlap nav border */
    outline: "none",
  };

  if (tab.active) {
    return (
      <button
        role="tab"
        aria-selected="true"
        style={{
          ...baseStyle,
          color: "var(--gold)",
          borderBottomColor: "var(--gold)",
        }}
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
        style={{
          ...baseStyle,
          color: "var(--dim)",
          opacity: 0.55,
        }}
      >
        {tab.label}
      </button>
    );
  }

  return (
    <button
      role="tab"
      aria-selected="false"
      style={{
        ...baseStyle,
        color: "var(--dim)",
      }}
    >
      {tab.label}
    </button>
  );
}
