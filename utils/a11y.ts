import type { KeyboardEvent, MouseEvent } from "react";

/**
 * Props that make a non-button element (a clickable card) operable by keyboard:
 * focusable, announced as a button, and activated with Enter or Space.
 */
export function buttonProps(onActivate: (event: MouseEvent | KeyboardEvent) => void) {
  return {
    role: "button" as const,
    tabIndex: 0,
    onClick: onActivate,
    onKeyDown: (event: KeyboardEvent) => {
      if (event.target !== event.currentTarget) return;
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        onActivate(event);
      }
    },
  };
}
