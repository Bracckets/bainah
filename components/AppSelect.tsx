"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import SystemIcon from "@/components/SystemIcon";

type AppSelectOption = {
  value: string;
  label: string;
};

type AppSelectProps = {
  value: string;
  options: AppSelectOption[];
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
};

export default function AppSelect({
  value,
  options,
  onChange,
  placeholder = "Select an option",
  className = "",
  disabled = false,
}: AppSelectProps) {
  const [open, setOpen] = useState(false);
  const [openUpward, setOpenUpward] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const listboxId = useId();

  const selectedOption = useMemo(
    () => options.find((option) => option.value === value) ?? null,
    [options, value]
  );

  useEffect(() => {
    if (!open) return;

    const updatePlacement = () => {
      const triggerRect = buttonRef.current?.getBoundingClientRect();
      const menuRect = menuRef.current?.getBoundingClientRect();

      if (!triggerRect || !menuRect) return;

      const viewportHeight = window.innerHeight;
      const spaceBelow = viewportHeight - triggerRect.bottom;
      const spaceAbove = triggerRect.top;
      const needsUpward = spaceBelow < menuRect.height + 16 && spaceAbove > spaceBelow;

      setOpenUpward(needsUpward);
    };

    updatePlacement();

    const handlePointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
      }
    };

    const handleResize = () => updatePlacement();

    document.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("resize", handleResize);
    window.addEventListener("scroll", handleResize, true);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("scroll", handleResize, true);
    };
  }, [open]);

  return (
    <div className="app-select-shell" ref={rootRef}>
      <button
        ref={buttonRef}
        type="button"
        className={`app-select-trigger ${className} ${open ? "app-select-trigger--open" : ""}`.trim()}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listboxId}
        disabled={disabled}
        onClick={() => setOpen((current) => !current)}
      >
        <span className={`app-select-value ${selectedOption ? "" : "app-select-value--placeholder"}`}>
          {selectedOption?.label ?? placeholder}
        </span>
        <span className="app-select-icon" aria-hidden="true">
          <SystemIcon name="chevronDown" size={16} strokeWidth={2} />
        </span>
      </button>

      {open && !disabled && (
        <div
          className={`app-select-popover ${
            openUpward ? "app-select-popover--up" : "app-select-popover--down"
          }`}
          role="presentation"
        >
          <div id={listboxId} ref={menuRef} className="app-select-menu" role="listbox">
            {options.map((option) => {
              const selected = option.value === value;
              return (
                <button
                  key={option.value}
                  type="button"
                  role="option"
                  aria-selected={selected}
                  className={`app-select-option ${
                    selected ? "app-select-option--selected" : ""
                  }`}
                  onClick={() => {
                    onChange(option.value);
                    setOpen(false);
                    buttonRef.current?.focus();
                  }}
                >
                  <span className="app-select-option-label">{option.label}</span>
                  {selected && (
                    <span className="app-select-option-check" aria-hidden="true">
                      <SystemIcon name="spark" size={14} strokeWidth={2} />
                    </span>
                  )}
                </button>
              );
            })}
            <div className="app-select-footer" aria-hidden="true" />
          </div>
        </div>
      )}
    </div>
  );
}
