"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import { isSectionGroup, sectionItems, type SectionGroup } from "@/lib/talep/sections-meta";
import type { TapuSectionKey } from "@/lib/talep/types";

const tabClass = (isActive: boolean) =>
  `inline-flex shrink-0 snap-start items-center gap-2.5 whitespace-nowrap rounded-xl px-3 py-2.5 text-left text-sm font-medium transition-colors ${
    isActive ? "bg-lime-300 text-slate-900" : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
  }`;

interface MenuPosition {
  left: number;
  minWidth: number;
  top?: number;
  bottom?: number;
}

function GroupTab({
  group,
  active,
  onSelect,
}: {
  group: SectionGroup;
  active: TapuSectionKey;
  onSelect: (key: TapuSectionKey) => void;
}) {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<MenuPosition | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const Icon = group.icon;
  const activeChild = group.children.find((c) => c.key === active);

  const computePosition = useCallback((): MenuPosition | null => {
    const rect = triggerRef.current?.getBoundingClientRect();
    if (!rect) return null;
    const margin = 6;
    const menuHeight = group.children.length * 40 + 8;
    const spaceBelow = window.innerHeight - rect.bottom - margin;
    const openUpward = spaceBelow < menuHeight && rect.top > spaceBelow;
    return {
      left: rect.left,
      minWidth: rect.width,
      top: openUpward ? undefined : rect.bottom + margin,
      bottom: openUpward ? window.innerHeight - rect.top + margin : undefined,
    };
  }, [group.children.length]);

  function toggle() {
    if (open) {
      setOpen(false);
      return;
    }
    setPosition(computePosition());
    setOpen(true);
  }

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e: MouseEvent) {
      const target = e.target as Node;
      if (triggerRef.current?.contains(target)) return;
      if (menuRef.current?.contains(target)) return;
      setOpen(false);
    }
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

  return (
    <>
      <button
        ref={triggerRef}
        data-key={activeChild?.key}
        type="button"
        onClick={toggle}
        className={tabClass(Boolean(activeChild))}
      >
        <Icon className="h-4 w-4 shrink-0" />
        {activeChild ? activeChild.label : group.label}
        <ChevronDown className={`h-3.5 w-3.5 shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open &&
        position &&
        createPortal(
          <div
            ref={menuRef}
            style={{ position: "fixed", left: position.left, top: position.top, bottom: position.bottom, minWidth: position.minWidth }}
            className="z-[100] overflow-hidden rounded-lg border border-slate-200 bg-white py-1 shadow-lg"
          >
            {group.children.map((child) => {
              const ChildIcon = child.icon;
              const isChildActive = child.key === active;
              return (
                <button
                  key={child.key}
                  type="button"
                  onClick={() => {
                    onSelect(child.key);
                    setOpen(false);
                  }}
                  className={`flex w-full items-center gap-2.5 whitespace-nowrap px-3 py-2 text-left text-sm ${
                    isChildActive ? "bg-lime-50 font-medium text-slate-900" : "text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  <ChildIcon className="h-4 w-4 shrink-0" />
                  {child.label}
                </button>
              );
            })}
          </div>,
          document.body,
        )}
    </>
  );
}

export default function SectionNav({
  active,
  onSelect,
  excludeKeys = [],
  className = "",
}: {
  active: TapuSectionKey;
  onSelect: (key: TapuSectionKey) => void;
  excludeKeys?: TapuSectionKey[];
  className?: string;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const items = sectionItems
    .map((item) =>
      isSectionGroup(item) ? { ...item, children: item.children.filter((c) => !excludeKeys.includes(c.key)) } : item,
    )
    .filter((item) => (isSectionGroup(item) ? item.children.length > 0 : !excludeKeys.includes(item.key)));

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    function updateScrollState() {
      if (!el) return;
      setCanScrollLeft(el.scrollLeft > 4);
      setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
    }
    updateScrollState();
    el.addEventListener("scroll", updateScrollState, { passive: true });
    window.addEventListener("resize", updateScrollState);
    return () => {
      el.removeEventListener("scroll", updateScrollState);
      window.removeEventListener("resize", updateScrollState);
    };
  }, []);

  useEffect(() => {
    const activeBtn = scrollRef.current?.querySelector<HTMLButtonElement>(`[data-key="${active}"]`);
    activeBtn?.scrollIntoView({ block: "nearest", inline: "nearest", behavior: "smooth" });
  }, [active]);

  function scrollByAmount(amount: number) {
    scrollRef.current?.scrollBy({ left: amount, behavior: "smooth" });
  }

  return (
    <nav
      className={`relative rounded-2xl border border-slate-100 bg-white/90 p-2 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_-12px_rgba(15,23,42,0.08)] ${className}`}
    >
      {canScrollLeft && (
        <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-12 rounded-l-2xl bg-gradient-to-r from-white via-white/80 to-transparent" />
      )}

      <div
        ref={scrollRef}
        className="scrollbar-none flex snap-x snap-proximity gap-1.5 overflow-x-auto scroll-smooth"
      >
        {items.map((item) =>
          isSectionGroup(item) ? (
            <GroupTab key={item.label} group={item} active={active} onSelect={onSelect} />
          ) : (
            <button
              key={item.key}
              data-key={item.key}
              type="button"
              onClick={() => onSelect(item.key)}
              className={tabClass(item.key === active)}
            >
              <item.icon className="h-4 w-4 shrink-0" />
              {item.label}
            </button>
          ),
        )}
      </div>

      {canScrollRight && (
        <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-12 rounded-r-2xl bg-gradient-to-l from-white via-white/80 to-transparent" />
      )}

      {canScrollLeft && (
        <button
          type="button"
          onClick={() => scrollByAmount(-200)}
          aria-label="Sola kaydır"
          className="absolute left-1 top-1/2 z-20 hidden h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 shadow-sm transition-colors hover:text-slate-900 sm:flex"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
      )}

      {canScrollRight && (
        <button
          type="button"
          onClick={() => scrollByAmount(200)}
          aria-label="Sağa kaydır"
          className="absolute right-1 top-1/2 z-20 hidden h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 shadow-sm transition-colors hover:text-slate-900 sm:flex"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      )}
    </nav>
  );
}
