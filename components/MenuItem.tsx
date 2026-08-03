"use client";

import type { MenuItem as MenuItemType } from "@/types/order";

interface Props {
  item: MenuItemType;
}

export default function MenuItem({ item }: Props) {
  return (
    <article className="border-b border-slate-800 py-4 last:border-b-0">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h4 className="font-semibold text-white">{item.name}</h4>
          {item.description ? (
            <p className="mt-1 text-sm leading-5 text-slate-400">
              {item.description}
            </p>
          ) : null}
        </div>

        <p className="shrink-0 font-semibold text-green-400">
          ${item.price}
        </p>
      </div>
    </article>
  );
}
