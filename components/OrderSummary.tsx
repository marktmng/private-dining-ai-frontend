"use client";

import type { MatchedOrderItem } from "@/lib/orderMatcher";

interface Props {
  items?: MatchedOrderItem[];
  needsConfirmation?: MatchedOrderItem[];
  order?: string;
  spokenTotal?: string;
  total?: number;
}

export default function OrderSummary({
  items = [],
  needsConfirmation = [],
  order,
  spokenTotal = "",
  total = 0,
}: Props) {
  const hasItems = items.length > 0;
  const hasConfirmationItems = needsConfirmation.length > 0;

  return (
    <section className="bg-slate-900 rounded-2xl p-6">
      <h2 className="text-2xl font-bold mb-4">
        Current Order
      </h2>

      <div className="min-h-[80px]">
        {hasItems ? (
          <div className="space-y-3">
            {items.map((item) => (
              <div
                className="flex items-start justify-between gap-4"
                key={item.id}
              >
                <div>
                  <p className="text-lg font-semibold">
                    {item.quantity} x {item.name}
                  </p>
                  <p className="text-sm text-slate-400">
                    Confidence {Math.round(item.confidence * 100)}%
                  </p>
                </div>

                <p className="shrink-0 text-lg font-semibold text-green-400">
                  ${item.lineTotal.toFixed(2)}
                </p>
              </div>
            ))}
          </div>
        ) : order ? (
          <p className="text-slate-400">
            Listening for menu items...
          </p>
        ) : (
          <p className="text-slate-400">
            No items yet.
          </p>
        )}
      </div>

      {hasConfirmationItems ? (
        <div className="mt-5 rounded-lg border border-amber-400/40 bg-amber-400/10 p-4">
          <p className="font-semibold text-amber-200">
            Please confirm
          </p>
          <div className="mt-3 space-y-2">
            {needsConfirmation.map((item) => (
              <p className="text-sm text-amber-100" key={item.id}>
                Did you mean {item.quantity} x {item.name}? Heard "{item.matchedText}"
                with {Math.round(item.confidence * 100)}% confidence.
              </p>
            ))}
          </div>
        </div>
      ) : null}

      {total > 0 ? (
        <div className="mt-5 border-t border-slate-800 pt-4 flex items-center justify-between">
          <span className="text-slate-300">Total</span>
          <span className="text-2xl font-bold text-green-400">
            ${total.toFixed(2)}
          </span>
        </div>
      ) : null}

      {spokenTotal ? (
        <p className="mt-3 text-sm text-green-300">
          {spokenTotal}
        </p>
      ) : null}
    </section>
  );
}
