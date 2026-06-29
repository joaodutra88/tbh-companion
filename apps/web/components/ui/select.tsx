"use client";

// ── Select (Base UI) — war-table themed ──────────────────────────────────────
// Wraps @base-ui/react/select following the same pattern as button.tsx.
// Re-exports Select.Root directly (preserving generics) and wraps the
// visual sub-components with war-table tokens.
//
// Usage:
//   <SelectRoot<string> value={...} onValueChange={...}>
//     <SelectTrigger aria-label="...">
//       <SelectValue placeholder="..." />
//       <SelectIcon />
//     </SelectTrigger>
//     <SelectPortal>
//       <SelectPositioner>
//         <SelectPopup>
//           <SelectList>
//             <SelectItem value="..."><SelectItemText>...</SelectItemText></SelectItem>
//           </SelectList>
//         </SelectPopup>
//       </SelectPositioner>
//     </SelectPortal>
//   </SelectRoot>

import { Select } from "@base-ui/react/select";
import { ChevronDown, Check } from "lucide-react";
import { cn } from "@/lib/utils";

// Re-export Root with generics intact (no wrapping needed)
const SelectRoot = Select.Root;

// ── Trigger ───────────────────────────────────────────────────────────────────
// data-popup-open: applied when the dropdown is open

function SelectTrigger({ className, children, ...props }: Select.Trigger.Props) {
  return (
    <Select.Trigger
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border border-line bg-bg",
        "px-2 py-1.5 text-[12px] text-text font-body",
        "cursor-pointer select-none outline-none transition-colors",
        "hover:border-dim/50",
        "focus-visible:border-gold/60 focus-visible:ring-1 focus-visible:ring-gold/30",
        "data-[popup-open]:border-gold/60",
        "disabled:opacity-50 disabled:cursor-not-allowed",
        className,
      )}
      {...props}
    >
      {children}
    </Select.Trigger>
  );
}

// ── Value ─────────────────────────────────────────────────────────────────────
// Shows the selected item text (or placeholder when no selection).

function SelectValue({ className, ...props }: Select.Value.Props) {
  return (
    <Select.Value
      className={cn("flex-1 min-w-0 truncate text-left", className)}
      {...props}
    />
  );
}

// ── Icon ──────────────────────────────────────────────────────────────────────

function SelectIcon({ className, ...props }: Select.Icon.Props) {
  return (
    <Select.Icon
      className={cn("shrink-0 text-dim", className)}
      {...props}
    >
      <ChevronDown className="size-3.5" aria-hidden="true" />
    </Select.Icon>
  );
}

// ── Portal ────────────────────────────────────────────────────────────────────

function SelectPortal(props: Select.Portal.Props) {
  return <Select.Portal {...props} />;
}

// ── Positioner ────────────────────────────────────────────────────────────────

function SelectPositioner({ className, ...props }: Select.Positioner.Props) {
  return (
    <Select.Positioner
      className={cn("z-50 outline-none", className)}
      {...props}
    />
  );
}

// ── Popup ─────────────────────────────────────────────────────────────────────
// Dark war-table dropdown container.

function SelectPopup({ className, ...props }: Select.Popup.Props) {
  return (
    <Select.Popup
      className={cn(
        "min-w-[8rem] max-h-72 overflow-y-auto",
        "rounded-lg border border-line bg-surface shadow-xl",
        "py-1 outline-none",
        className,
      )}
      {...props}
    />
  );
}

// ── List ──────────────────────────────────────────────────────────────────────

function SelectList({ className, ...props }: Select.List.Props) {
  return (
    <Select.List
      className={cn("py-0.5", className)}
      {...props}
    />
  );
}

// ── Item ──────────────────────────────────────────────────────────────────────
// data-highlighted → bg-surface-2 (hover/focus state)
// data-selected    → text-gold
// data-disabled    → opacity-50, cursor-not-allowed

function SelectItem({ className, children, ...props }: Select.Item.Props) {
  return (
    <Select.Item
      className={cn(
        "flex items-center gap-2 px-2.5 py-1.5",
        "text-[12px] font-body text-text",
        "cursor-pointer select-none outline-none",
        "data-[highlighted]:bg-surface-2",
        "data-[selected]:text-gold",
        "data-[disabled]:opacity-50 data-[disabled]:cursor-not-allowed",
        className,
      )}
      {...props}
    >
      {children}
    </Select.Item>
  );
}

// ── ItemText ──────────────────────────────────────────────────────────────────

function SelectItemText({ className, ...props }: Select.ItemText.Props) {
  return (
    <Select.ItemText
      className={cn("flex-1 min-w-0 truncate", className)}
      {...props}
    />
  );
}

// ── ItemIndicator ─────────────────────────────────────────────────────────────

function SelectItemIndicator({ className, ...props }: Select.ItemIndicator.Props) {
  return (
    <Select.ItemIndicator
      className={cn("ml-auto shrink-0", className)}
      {...props}
    >
      <Check className="size-3.5 text-gold" aria-hidden="true" />
    </Select.ItemIndicator>
  );
}

export {
  SelectRoot,
  SelectTrigger,
  SelectValue,
  SelectIcon,
  SelectPortal,
  SelectPositioner,
  SelectPopup,
  SelectList,
  SelectItem,
  SelectItemText,
  SelectItemIndicator,
};
