"use client";

// ── Tooltip (Base UI) — war-table themed ─────────────────────────────────────
// Wraps @base-ui/react/tooltip following the same pattern as button.tsx.
// Mount <TooltipProvider> once in layout.tsx for shared group delay.
//
// Usage:
//   <TooltipRoot>
//     <TooltipTrigger>hover me</TooltipTrigger>
//     <TooltipPortal>
//       <TooltipPositioner side="top">
//         <TooltipPopup>tooltip text</TooltipPopup>
//       </TooltipPositioner>
//     </TooltipPortal>
//   </TooltipRoot>
//
// For wrapping a disabled button (no focus events), render the trigger as a
// span by passing render={<span className="inline-flex shrink-0" />}:
//   <TooltipTrigger render={<span className="inline-flex shrink-0" />}>
//     <button disabled>...</button>
//   </TooltipTrigger>

import { Tooltip } from "@base-ui/react/tooltip";
import { cn } from "@/lib/utils";

// ── Provider ──────────────────────────────────────────────────────────────────
// Wrap once in layout to share hover delay across tooltips.

function TooltipProvider(props: Tooltip.Provider.Props) {
  return <Tooltip.Provider delay={600} closeDelay={100} {...props} />;
}

// ── Root ──────────────────────────────────────────────────────────────────────

function TooltipRoot(props: Tooltip.Root.Props) {
  return <Tooltip.Root {...props} />;
}

// ── Trigger ───────────────────────────────────────────────────────────────────
// By default renders a <button>. Pass render={<span />} to wrap a disabled
// button (which can't receive focus events) with a hoverable span.

function TooltipTrigger({ className, ...props }: Tooltip.Trigger.Props) {
  return (
    <Tooltip.Trigger
      className={cn("cursor-default", className)}
      {...props}
    />
  );
}

// ── Portal ────────────────────────────────────────────────────────────────────

function TooltipPortal(props: Tooltip.Portal.Props) {
  return <Tooltip.Portal {...props} />;
}

// ── Positioner ────────────────────────────────────────────────────────────────

function TooltipPositioner({ className, side = "top", ...props }: Tooltip.Positioner.Props) {
  return (
    <Tooltip.Positioner
      side={side}
      className={cn("z-50 outline-none", className)}
      {...props}
    />
  );
}

// ── Popup ─────────────────────────────────────────────────────────────────────
// Dark war-table tooltip bubble.

function TooltipPopup({ className, ...props }: Tooltip.Popup.Props) {
  return (
    <Tooltip.Popup
      className={cn(
        "rounded-md border border-line bg-surface-2 px-2.5 py-1.5",
        "text-[11px] font-body text-text shadow-lg",
        "outline-none",
        className,
      )}
      {...props}
    />
  );
}

export {
  TooltipProvider,
  TooltipRoot,
  TooltipTrigger,
  TooltipPortal,
  TooltipPositioner,
  TooltipPopup,
};
