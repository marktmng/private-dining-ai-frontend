"use client";

import { useMemo, useState } from "react";
import type { MenuItem } from "@/types/order";
import { Search, Sparkles, Plus, Check } from "lucide-react";

interface Props {
  menu: MenuItem[];
  onSelectItem?: (item: MenuItem) => void;
  isLoading?: boolean;
  error?: string;
  isDbMenu?: boolean;
  orderQuantities?: Record<string, number>;
  compact?: boolean;
}

export default function TacticalMenuCodex({
  menu,
  onSelectItem,
  isLoading = false,
  error = "",
  isDbMenu = false,
  orderQuantities = {},
  compact = false,
}: Props) {
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");

  const categories = useMemo(() => {
    const set = new Set<string>();
    menu.forEach((item) => {
      if (item.category) set.add(item.category);
    });
    return ["ALL", ...Array.from(set)];
  }, [menu]);

  const filteredItems = useMemo(() => {
    return menu.filter((item) => {
      const matchCat =
        selectedCategory === "ALL" ||
        item.category?.toLowerCase() === selectedCategory.toLowerCase();
      const matchSearch =
        !searchQuery ||
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.description?.toLowerCase().includes(searchQuery.toLowerCase());
      return matchCat && matchSearch;
    });
  }, [menu, selectedCategory, searchQuery]);

  return (
    <div className="corner-bracket-container w-full bg-[#1C1A15]/95 backdrop-blur-xl border border-[#B68A2D]/30 rounded-2xl p-4 sm:p-5 shadow-2xl space-y-4 select-none">
      {/* Corner Brackets */}
      <div className="corner-bracket-tl !w-3 !h-3" />
      <div className="corner-bracket-tr !w-3 !h-3" />
      <div className="corner-bracket-bl !w-3 !h-3" />
      <div className="corner-bracket-br !w-3 !h-3" />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#B68A2D]/25">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-mono text-sm sm:text-base font-bold tracking-widest text-[#F3EFE6] uppercase">
              Menu Codex // Selections
            </h3>
            <span className="font-mono text-[9px] bg-[#B68A2D]/20 text-[#E5C378] border border-[#B68A2D]/40 px-2 py-0.5 rounded">
              {isDbMenu ? "LIVE DB" : "PROTOTYPE"}
            </span>
          </div>
          <p className="font-mono text-[10px] text-[#B68A2D]/80 mt-0.5">
            Tap &ldquo;+ ADD&rdquo; or speak item name to order
          </p>
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-52">
          <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-[#B68A2D]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filter dishes..."
            className="w-full pl-8 pr-3 py-1.5 font-mono text-xs rounded-lg bg-[#191814] border border-[#B68A2D]/30 focus:border-[#B68A2D] text-[#F3EFE6] placeholder-[#F3EFE6]/30 focus:outline-none"
          />
        </div>
      </div>

      {/* Category Filter Pills */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 font-mono text-xs scrollbar-none">
        {categories.map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => setSelectedCategory(cat)}
            className={`px-2.5 py-1 rounded-lg uppercase tracking-wider text-[10px] font-bold whitespace-nowrap transition-colors cursor-pointer ${
              selectedCategory === cat
                ? "bg-[#B68A2D] text-[#191814] shadow-[0_0_10px_rgba(182,138,45,0.4)]"
                : "bg-[#211F1A] text-[#F3EFE6]/70 hover:text-white border border-[#B68A2D]/20 hover:border-[#B68A2D]/50"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Items List / Grid */}
      {isLoading ? (
        <div className="py-12 text-center font-mono text-xs text-[#B68A2D] animate-pulse">
          FETCHING RESTAURANT MENU ITEMS...
        </div>
      ) : error ? (
        <div className="p-3.5 rounded-xl bg-red-950/40 border border-red-500/40 font-mono text-xs text-red-300">
          {error}
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="py-8 text-center font-mono text-xs text-[#F3EFE6]/40">
          No menu items found.
        </div>
      ) : (
        <div
          className={`grid gap-2.5 overflow-y-auto pr-1 ${
            compact ? "grid-cols-1 max-h-[380px]" : "grid-cols-1 sm:grid-cols-2 max-h-[460px]"
          }`}
        >
          {filteredItems.map((item) => {
            const key = item.id || item.name;
            const inOrderCount = orderQuantities[key] || orderQuantities[item.name] || 0;

            return (
              <div
                key={key}
                className="p-3 rounded-xl bg-[#211F1A]/90 hover:bg-[#28251E] border border-[#B68A2D]/20 hover:border-[#B68A2D]/60 transition-all flex flex-col justify-between gap-2 shadow-sm group"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-semibold text-xs text-[#F3EFE6] group-hover:text-[#E5C378] transition-colors">
                        {item.name}
                      </h4>
                      {inOrderCount > 0 && (
                        <span className="font-mono text-[9px] px-1.5 py-0.2 rounded bg-[#10B981]/20 text-[#10B981] border border-[#10B981]/40 font-bold flex items-center gap-0.5">
                          <Check className="w-2.5 h-2.5" />
                          <span>{inOrderCount}x</span>
                        </span>
                      )}
                    </div>
                    {item.category && (
                      <span className="font-mono text-[9px] uppercase tracking-wider text-[#B68A2D]/80 block mt-0.5">
                        {item.category}
                      </span>
                    )}
                    {item.description && (
                      <p className="mt-1 text-[11px] text-[#F3EFE6]/65 leading-snug line-clamp-2">
                        {item.description}
                      </p>
                    )}
                  </div>

                  <div className="text-right shrink-0">
                    <span className="font-mono text-sm font-bold text-[#E5C378]">
                      ${Number(item.price).toFixed(2)}
                    </span>
                  </div>
                </div>

                {/* Bottom Quick Add Bar */}
                <div className="flex items-center justify-between pt-1.5 border-t border-[#B68A2D]/15">
                  <span className="font-mono text-[9px] text-[#B68A2D]/60">
                    100% FIXED DB PRICE
                  </span>

                  <button
                    type="button"
                    onClick={() => onSelectItem?.(item)}
                    className="font-mono text-[10px] px-2.5 py-1 rounded-lg bg-[#2A261E] hover:bg-[#B68A2D] text-[#E5C378] hover:text-[#191814] border border-[#B68A2D]/40 transition-colors flex items-center gap-1 cursor-pointer font-bold shadow-sm"
                  >
                    <Plus className="w-3 h-3" />
                    <span>ADD TO ORDER</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
