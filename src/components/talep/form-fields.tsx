"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown, Plus, Search, Trash2, X } from "lucide-react";
import { AlanKaydiSaglayici, useAkiciAlan } from "@/components/akici-metin/baglam";
import { useAkiciMetinKarti } from "@/components/akici-metin/kart";

export const inputClass =
  "min-h-[42px] w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 transition-colors placeholder:text-slate-400 hover:border-slate-300 focus:border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-200";

export const tableInputClass =
  "w-full min-w-0 rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-sm text-slate-800 transition-colors placeholder:text-slate-400 hover:border-slate-300 focus:border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-200";

export const sectionCardClass = "min-w-0 rounded-xl border border-slate-200 bg-white p-4";
export const sectionBodyClass = "min-w-0 rounded-lg border border-slate-100 p-3";
export const modalCardClass = "w-full rounded-2xl border border-slate-200 bg-white p-6 shadow-xl";
export const secondaryButtonClass =
  "rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50";
export const primaryButtonClass =
  "rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50";
export const helperTextClass = "mt-1.5 block text-xs text-slate-400";

// A titled form card. Every field inside registers itself, so the header's
// "Akıcı Metin Şablonları" button can turn the form into prose; the button
// only appears when the card has fields (akiciMetin={false} hides it).
export function SectionCard({
  title,
  children,
  className = "",
  akiciMetin = true,
  akiciAnahtar,
}: {
  title: string;
  children: ReactNode;
  className?: string;
  akiciMetin?: boolean;
  // Where the written text is saved when the same form appears more than
  // once in a tapu (e.g. each emsal slot); templates stay shared by title.
  akiciAnahtar?: string;
}) {
  const { kayit, dugme, pencere } = useAkiciMetinKarti(title, { anahtar: akiciAnahtar, etkin: akiciMetin });
  return (
    <div className={`${sectionCardClass} ${className}`}>
      <div className="mb-3 flex min-h-7 items-center justify-between gap-2 border-b border-slate-100 pb-2">
        <p className="text-xs font-semibold text-slate-500">{title}</p>
        {dugme}
      </div>
      <AlanKaydiSaglayici kayit={kayit}>{children}</AlanKaydiSaglayici>
      {pencere}
    </div>
  );
}

export function Field({
  label,
  children,
  className = "",
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1 block text-[11px] font-medium text-slate-500">{label}</span>
      {children}
    </label>
  );
}

export function TextField({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  className,
  readOnly = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
  className?: string;
  readOnly?: boolean;
}) {
  useAkiciAlan(label, value);
  return (
    <Field label={label} className={className}>
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        readOnly={readOnly}
        className={`${inputClass} ${readOnly ? "cursor-default bg-slate-50 text-slate-500 hover:border-slate-200" : ""}`}
      />
    </Field>
  );
}

export function TextAreaField({
  label,
  value,
  onChange,
  rows = 4,
  className,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  rows?: number;
  className?: string;
}) {
  useAkiciAlan(label, value);
  return (
    <Field label={label} className={className}>
      <textarea
        value={value}
        rows={rows}
        onChange={(e) => onChange(e.target.value)}
        className={`${inputClass} resize-none`}
      />
    </Field>
  );
}

export function SelectField<T extends string>({
  label,
  value,
  options,
  onChange,
  className,
}: {
  label: string;
  value: T | "";
  options: readonly T[];
  onChange: (value: T | "") => void;
  className?: string;
}) {
  useAkiciAlan(label, value);
  return (
    <Field label={label} className={className}>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as T | "")}
        className={`${inputClass} appearance-none`}
      >
        <option value="">Seçiniz</option>
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
    </Field>
  );
}

interface ComboboxGroup {
  label: string;
  options: readonly string[];
}

interface ComboboxPanelPosition {
  left: number;
  width: number;
  maxHeight: number;
  top?: number;
  bottom?: number;
}

export function ComboboxField({
  label,
  value,
  onChange,
  options,
  groups,
  placeholder = "Ara veya seçin...",
  className,
  onAddNew,
  onRemoveOption,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options?: readonly string[];
  groups?: readonly ComboboxGroup[];
  placeholder?: string;
  className?: string;
  onAddNew?: (value: string) => void;
  onRemoveOption?: (value: string) => void;
}) {
  useAkiciAlan(label, value);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [position, setPosition] = useState<ComboboxPanelPosition | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const sourceGroups: ComboboxGroup[] = useMemo(
    () => (groups ? [...groups] : [{ label: "", options: options ?? [] }]),
    [groups, options],
  );

  const filteredGroups = useMemo(() => {
    const q = query.trim().toLocaleLowerCase("tr-TR");
    return sourceGroups
      .map((g) => ({
        label: g.label,
        options: q ? g.options.filter((opt) => opt.toLocaleLowerCase("tr-TR").includes(q)) : g.options,
      }))
      .filter((g) => g.options.length > 0);
  }, [query, sourceGroups]);

  const trimmedQuery = query.trim();
  const hasExactMatch = sourceGroups.some((g) =>
    g.options.some((opt) => opt.localeCompare(trimmedQuery, "tr", { sensitivity: "base" }) === 0),
  );
  const canAddNew = Boolean(onAddNew) && trimmedQuery.length > 0 && !hasExactMatch;

  function close() {
    setOpen(false);
    setQuery("");
    setPosition(null);
  }

  // The panel is rendered in a portal at document.body and positioned with
  // `fixed` coordinates computed from the trigger's own rect. A plain
  // `absolute` panel nested in the form gets clipped by any scrollable
  // ancestor (e.g. a modal body with overflow-y-auto) once the field sits
  // near the bottom of that container — this escapes that ancestor and
  // flips above the trigger when there isn't enough room below.
  const computePosition = useCallback((): ComboboxPanelPosition | null => {
    const rect = triggerRef.current?.getBoundingClientRect();
    if (!rect) return null;
    const margin = 8;
    const minHeight = 160;
    const preferredHeight = 288;
    const spaceBelow = window.innerHeight - rect.bottom - margin;
    const spaceAbove = rect.top - margin;
    const openUpward = spaceBelow < minHeight && spaceAbove > spaceBelow;
    const available = openUpward ? spaceAbove : spaceBelow;
    const maxHeight = Math.max(minHeight, Math.min(preferredHeight, available));

    return {
      left: rect.left,
      width: rect.width,
      maxHeight,
      top: openUpward ? undefined : rect.bottom + margin,
      bottom: openUpward ? window.innerHeight - rect.top + margin : undefined,
    };
  }, []);

  function openDropdown() {
    const next = computePosition();
    if (!next) return;
    setPosition(next);
    setOpen(true);
    setTimeout(() => searchRef.current?.focus(), 0);
  }

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e: MouseEvent) {
      const target = e.target as Node;
      if (containerRef.current?.contains(target)) return;
      if (panelRef.current?.contains(target)) return;
      close();
    }
    // Reposition (rather than close) on scroll/resize — e.g. the on-screen
    // keyboard opening on mobile fires a resize right after the search
    // input auto-focuses, which would otherwise close the panel instantly.
    function handleReposition() {
      setPosition(computePosition());
    }
    document.addEventListener("mousedown", handleClickOutside);
    window.addEventListener("scroll", handleReposition, true);
    window.addEventListener("resize", handleReposition);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("scroll", handleReposition, true);
      window.removeEventListener("resize", handleReposition);
    };
  }, [open, computePosition]);

  function select(opt: string) {
    onChange(opt);
    close();
  }

  function addNew() {
    if (!onAddNew || !trimmedQuery) return;
    onAddNew(trimmedQuery);
    onChange(trimmedQuery);
    close();
  }

  return (
    <Field label={label} className={className}>
      <div ref={containerRef} className="relative">
        <button
          ref={triggerRef}
          type="button"
          onClick={() => (open ? close() : openDropdown())}
          className={`${inputClass} flex items-center justify-between gap-2 text-left`}
        >
          <span className={`truncate ${value ? "text-slate-800" : "text-slate-400"}`}>
            {value || placeholder}
          </span>
          <ChevronDown className={`h-4 w-4 shrink-0 text-slate-400 transition-transform ${open ? "rotate-180" : ""}`} />
        </button>

        {open &&
          position &&
          createPortal(
            <div
              ref={panelRef}
              style={{
                position: "fixed",
                left: position.left,
                width: position.width,
                top: position.top,
                bottom: position.bottom,
                maxHeight: position.maxHeight,
              }}
              className="z-[100] flex flex-col overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg"
            >
              <div className="flex shrink-0 items-center gap-2 border-b border-slate-100 px-3 py-2">
                <Search className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                <input
                  ref={searchRef}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Escape") {
                      close();
                    }
                    if (e.key === "Enter") {
                      const first = filteredGroups[0]?.options[0];
                      if (first) select(first);
                      else if (canAddNew) addNew();
                    }
                  }}
                  placeholder="Yazarak ara..."
                  className="w-full text-sm text-slate-800 outline-none placeholder:text-slate-400"
                />
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto py-1">
                {canAddNew && (
                  <button
                    type="button"
                    onClick={addNew}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm font-medium text-lime-700 hover:bg-lime-50"
                  >
                    <Plus className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">&quot;{trimmedQuery}&quot; listeye ekle</span>
                  </button>
                )}
                {filteredGroups.length === 0 && !canAddNew && (
                  <p className="px-3 py-4 text-center text-sm text-slate-400">Sonuç bulunamadı</p>
                )}
                {filteredGroups.map((g) => (
                  <div key={g.label || "__flat"}>
                    {g.label && (
                      <p className="px-3 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                        {g.label}
                      </p>
                    )}
                    {g.options.map((opt) => (
                      <div key={opt} className="group flex items-center hover:bg-slate-50">
                        <button
                          type="button"
                          onClick={() => select(opt)}
                          className={`flex flex-1 min-w-0 items-center justify-between gap-2 px-3 py-2 text-left text-sm ${
                            opt === value ? "font-medium text-slate-900" : "text-slate-600"
                          }`}
                        >
                          <span className="truncate">{opt}</span>
                          {opt === value && <Check className="h-3.5 w-3.5 shrink-0 text-lime-600" />}
                        </button>
                        {onRemoveOption && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onRemoveOption(opt);
                            }}
                            className="mr-2 shrink-0 rounded-md p-1 text-slate-300 opacity-0 hover:bg-rose-50 hover:text-rose-600 group-hover:opacity-100"
                            aria-label={`"${opt}" listeden sil`}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>,
            document.body,
          )}
      </div>
    </Field>
  );
}

export function ToggleField({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  useAkiciAlan(label, checked);
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 px-3 py-2">
      <span className="text-sm text-slate-700">{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${checked ? "bg-lime-300" : "bg-slate-200"}`}
      >
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${checked ? "translate-x-5" : "translate-x-0.5"}`}
        />
      </button>
    </div>
  );
}

export function SectionGrid({ children }: { children: ReactNode }) {
  return <div className="grid grid-cols-1 gap-x-4 gap-y-3 sm:grid-cols-2 lg:grid-cols-3">{children}</div>;
}

export function RepeatableList<T extends { id: string }>({
  items,
  onAdd,
  onRemove,
  renderItem,
  addLabel,
  emptyLabel,
}: {
  items: T[];
  onAdd: () => void;
  onRemove: (id: string) => void;
  renderItem: (item: T, index: number) => ReactNode;
  addLabel: string;
  emptyLabel: string;
}) {
  return (
    <div className="space-y-2">
      {items.length === 0 && (
        <p className="rounded-lg border border-dashed border-slate-200 px-4 py-5 text-center text-sm text-slate-400">
          {emptyLabel}
        </p>
      )}
      {items.map((item, i) => (
        <div key={item.id} className="relative rounded-lg border border-slate-200 p-3">
          <button
            type="button"
            onClick={() => onRemove(item.id)}
            className="absolute right-2.5 top-2.5 rounded-full p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
            aria-label="Satırı sil"
          >
            <X className="h-3.5 w-3.5" />
          </button>
          {renderItem(item, i)}
        </div>
      ))}
      <button
        type="button"
        onClick={onAdd}
        className="inline-flex items-center gap-1.5 rounded-full border border-dashed border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:border-lime-300 hover:text-slate-900"
      >
        <Plus className="h-3.5 w-3.5" />
        {addLabel}
      </button>
    </div>
  );
}

export interface RepeatableTableColumn<T> {
  key: string;
  label: string;
  render: (item: T) => ReactNode;
  width?: string;
}

// A record list rendered as an actual single-line-per-record table (rather
// than RepeatableList's stacked card layout) — used where each record's
// fields must read as one row, e.g. tapu mülkiyet/şerh/rehin listeleri.
export function RepeatableTable<T extends { id: string }>({
  items,
  columns,
  onAdd,
  onRemove,
  addLabel,
  emptyLabel,
}: {
  items: T[];
  columns: RepeatableTableColumn<T>[];
  onAdd: () => void;
  onRemove: (id: string) => void;
  addLabel: string;
  emptyLabel: string;
}) {
  return (
    <div className="space-y-2">
      {items.length === 0 ? (
        <p className="rounded-lg border border-dashed border-slate-200 px-4 py-5 text-center text-sm text-slate-400">
          {emptyLabel}
        </p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-slate-200">
          <table className="w-full min-w-max border-collapse text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                {columns.map((col) => (
                  <th
                    key={col.key}
                    className={`px-2.5 py-2 text-left text-xs font-medium text-slate-600 ${col.width ?? ""}`}
                  >
                    {col.label}
                  </th>
                ))}
                <th className="w-9 px-2 py-2" />
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} className="border-b border-slate-100 last:border-0">
                  {columns.map((col) => (
                    <td key={col.key} className="px-2.5 py-1.5">
                      {col.render(item)}
                    </td>
                  ))}
                  <td className="px-2 py-1.5 text-right">
                    <button
                      type="button"
                      onClick={() => onRemove(item.id)}
                      className="rounded-full p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                      aria-label="Satırı sil"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <button
        type="button"
        onClick={onAdd}
        className="inline-flex items-center gap-1.5 rounded-full border border-dashed border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:border-lime-300 hover:text-slate-900"
      >
        <Plus className="h-3.5 w-3.5" />
        {addLabel}
      </button>
    </div>
  );
}
