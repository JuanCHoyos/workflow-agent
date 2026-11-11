"use client";

import type { LucideIcon } from "lucide-react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import styles from "./editor.module.css";

export type MenuItem =
  | {
      kind?: "item";
      label: string;
      hint?: string;
      shortcut?: string;
      icon?: LucideIcon;
      iconColor?: string;
      danger?: boolean;
      disabled?: boolean;
      onSelect: () => void;
    }
  | { kind: "separator" }
  | { kind: "heading"; label: string };

type Props = {
  /** Screen position the menu opens at (pointer or anchor). */
  at: { x: number; y: number };
  label: string;
  items: MenuItem[];
  onClose: () => void;
};

/**
 * A floating menu (context menu, "add step here", "connect to a new step").
 * Arrow keys move between items, Escape or a click outside closes it, and it
 * stays inside the viewport.
 */
export function CanvasMenu({ at, label, items, onClose }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState(at);

  useLayoutEffect(() => {
    const menu = ref.current;
    if (!menu) return;
    const { width, height } = menu.getBoundingClientRect();
    setPosition({
      x: Math.max(8, Math.min(at.x, window.innerWidth - width - 8)),
      y: Math.max(8, Math.min(at.y, window.innerHeight - height - 8)),
    });
    menu.querySelector<HTMLButtonElement>("button:not(:disabled)")?.focus();
  }, [at]);

  useEffect(() => {
    const onPointerDown = (event: PointerEvent) => {
      if (!ref.current?.contains(event.target as Node)) onClose();
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        onClose();
      }
    };
    window.addEventListener("pointerdown", onPointerDown, true);
    window.addEventListener("keydown", onKey, true);
    return () => {
      window.removeEventListener("pointerdown", onPointerDown, true);
      window.removeEventListener("keydown", onKey, true);
    };
  }, [onClose]);

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
    event.preventDefault();
    const buttons = [...(ref.current?.querySelectorAll<HTMLButtonElement>("button:not(:disabled)") ?? [])];
    const index = buttons.indexOf(document.activeElement as HTMLButtonElement);
    const next = event.key === "ArrowDown" ? index + 1 : index - 1;
    buttons[(next + buttons.length) % buttons.length]?.focus();
  };

  return (
    <div
      ref={ref}
      className={styles.canvasMenu}
      role="menu"
      aria-label={label}
      style={{ left: position.x, top: position.y }}
      onKeyDown={onKeyDown}
      onContextMenu={(event) => event.preventDefault()}
    >
      {items.map((item, index) => {
        if (item.kind === "separator") return <div key={index} className={styles.menuSeparator} role="separator" />;
        if (item.kind === "heading") {
          return (
            <div key={index} className={styles.menuHeading} role="presentation">
              {item.label}
            </div>
          );
        }
        const Icon = item.icon;
        return (
          <button
            key={index}
            type="button"
            role="menuitem"
            className={styles.menuItem}
            data-danger={item.danger || undefined}
            disabled={item.disabled}
            onClick={() => {
              onClose();
              item.onSelect();
            }}
          >
            {Icon && <Icon aria-hidden="true" style={item.iconColor ? { color: item.iconColor } : undefined} />}
            <span className={styles.menuText}>
              <span>{item.label}</span>
              {item.hint && <span className={styles.menuHint}>{item.hint}</span>}
            </span>
            {item.shortcut && <kbd className={styles.kbd}>{item.shortcut}</kbd>}
          </button>
        );
      })}
    </div>
  );
}
