"use client";

import { useEffect, useId, useRef, useState } from "react";

interface FilterOption<T extends string> {
  value: T;
  label: string;
}

interface FilterMultiSelectProps<T extends string> {
  label: string;
  options: FilterOption<T>[];
  selected: Set<T>;
  onChange: (next: Set<T>) => void;
  summary: string;
}

export default function FilterMultiSelect<T extends string>({
  label,
  options,
  selected,
  onChange,
  summary,
}: FilterMultiSelectProps<T>) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  function toggle(value: T) {
    const next = new Set(selected);
    if (next.has(value)) next.delete(value);
    else next.add(value);
    onChange(next);
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen((current) => !current)}
        className="select-field inline-flex items-center gap-2"
      >
        <span className="text-ink-subtle">{label}</span>
        <span className="text-ink">{summary}</span>
      </button>
      {open && (
        <ul
          id={menuId}
          role="listbox"
          aria-multiselectable="true"
          aria-label={label}
          className="absolute left-0 z-30 mt-1 min-w-[14rem] rounded-md border border-hairline bg-surface-2 py-1 shadow-lg"
        >
          {options.map((option) => {
            const checked = selected.has(option.value);
            return (
              <li key={option.value} role="option" aria-selected={checked}>
                <button
                  type="button"
                  onClick={() => toggle(option.value)}
                  className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm text-ink hover:bg-surface-3"
                >
                  <span
                    aria-hidden
                    className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border text-[10px] leading-none ${
                      checked
                        ? "border-primary bg-primary text-on-primary"
                        : "border-hairline-strong"
                    }`}
                  >
                    {checked ? "✓" : ""}
                  </span>
                  {option.label}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
