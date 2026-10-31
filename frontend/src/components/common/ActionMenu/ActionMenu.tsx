import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { LoaderCircle, MoreHorizontal } from "lucide-react";

import styles from "./ActionMenu.module.css";

export interface ActionMenuItem {
  id: string;
  label: string;
  icon?: ReactNode;
  danger?: boolean;
  disabled?: boolean;
  onSelect: () => void;
}

interface ActionMenuProps {
  items: ActionMenuItem[];
  ariaLabel: string;
  disabled?: boolean;
  loading?: boolean;
}

export default function ActionMenu({
  items,
  ariaLabel,
  disabled = false,
  loading = false,
}: ActionMenuProps) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: MouseEvent) => {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  if (items.length === 0) return null;

  return (
    <div className={styles.wrapper} ref={wrapperRef}>
      <button
        type="button"
        className={styles.trigger}
        aria-label={ariaLabel}
        aria-haspopup="menu"
        aria-expanded={open}
        disabled={disabled || loading}
        onClick={() => setOpen((value) => !value)}
      >
        {loading ? (
          <LoaderCircle size={16} className={styles.spinner} />
        ) : (
          <MoreHorizontal size={16} />
        )}
      </button>

      {open && (
        <div className={styles.dropdown} role="menu">
          {items.map((item) => (
            <button
              key={item.id}
              type="button"
              role="menuitem"
              className={`${styles.item} ${
                item.danger ? styles.itemDanger : ""
              }`}
              disabled={item.disabled}
              onClick={() => {
                setOpen(false);
                item.onSelect();
              }}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
