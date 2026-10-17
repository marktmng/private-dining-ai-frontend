"use client";

import type { MatchedOrderItem } from "@/lib/orderMatcher";
import type { PersistedOrder } from "@/types/order";

interface Props {
  items?: MatchedOrderItem[];
  needsConfirmation?: MatchedOrderItem[];
  order?: string;
  spokenTotal?: string;
  total?: number;
  isAuthenticated?: boolean;
  isSubmitting?: boolean;
  submitError?: string | null;
  onSubmitOrder?: () => void;
  persistedOrder?: PersistedOrder | null;
  onResetOrder?: () => void;
  specialInstructions?: string;
  onSpecialInstructionsChange?: (val: string) => void;
}

export default function OrderSummary({
  items = [],
  needsConfirmation = [],
  order,
  spokenTotal = "",
  total = 0,
  isAuthenticated = false,
  isSubmitting = false,
  submitError = null,
  onSubmitOrder,
  persistedOrder = null,
  onResetOrder,
  specialInstructions = "",
  onSpecialInstructionsChange,
}: Props) {
  const hasItems = items.length > 0;
  const hasConfirmationItems = needsConfirmation.length > 0;

  return (
    <section className="bg-slate-900 rounded-2xl p-6 border border-slate-800 shadow-xl space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white flex items-center gap-2">
          <span>Current Order</span>
          {persistedOrder ? (
            <span className="text-xs bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 rounded-full px-2.5 py-0.5 font-normal">
              Persisted in Database
            </span>
          ) : null}
        </h2>

        {persistedOrder && onResetOrder ? (
          <button
            type="button"
            onClick={onResetOrder}
            className="text-xs text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg px-3 py-1.5 transition-colors"
          >
            + Start New Order
          </button>
        ) : null}
      </div>

      {/* Persisted Order Success Banner */}
      {persistedOrder ? (
        <div className="rounded-xl border border-emerald-500/40 bg-emerald-950/40 p-5 space-y-4">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-emerald-400 uppercase tracking-wider">
                ✓ Order Confirmed & Sent to Kitchen
              </p>
              <p className="text-xs text-slate-400 mt-0.5">
                Order ID: <code className="text-slate-200">{persistedOrder.id}</code>
              </p>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              {persistedOrder.status}
            </span>
          </div>

          <div className="border-t border-emerald-800/40 pt-3 space-y-2">
            <p className="text-xs font-semibold text-slate-300 uppercase tracking-wide">
              Authoritative Persisted Items:
            </p>
            {persistedOrder.items.map((pi) => (
              <div key={pi.id} className="flex justify-between items-center text-sm">
                <div>
                  <span className="font-medium text-white">
                    {pi.quantity} x {pi.menuItem?.name || "Menu Item"}
                  </span>
                  {pi.notes ? (
                    <span className="text-xs text-slate-400 block ml-2">Note: {pi.notes}</span>
                  ) : null}
                </div>
                <div className="text-right">
                  <span className="text-slate-400 text-xs">
                    (${Number(pi.unitPrice).toFixed(2)} ea)
                  </span>{" "}
                  <span className="font-semibold text-emerald-300 ml-2">
                    ${Number(pi.subtotal).toFixed(2)}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {persistedOrder.specialInstructions ? (
            <p className="text-xs text-slate-300 bg-slate-900/60 p-2 rounded border border-emerald-900/60">
              <span className="font-semibold text-slate-200">Special Instructions:</span>{" "}
              {persistedOrder.specialInstructions}
            </p>
          ) : null}

          <div className="border-t border-emerald-800/40 pt-2 flex items-center justify-between text-base font-bold">
            <span className="text-slate-200">Authoritative Total</span>
            <span className="text-emerald-400 text-xl">
              ${Number(persistedOrder.total).toFixed(2)}
            </span>
          </div>
        </div>
      ) : (
        /* Active Draft Order View */
        <>
          <div className="min-h-[80px]">
            {hasItems ? (
              <div className="space-y-3">
                {items.map((item) => (
                  <div
                    className="flex items-start justify-between gap-4 p-2.5 rounded-lg bg-slate-800/40 border border-slate-800"
                    key={item.id}
                  >
                    <div>
                      <p className="text-lg font-semibold text-white">
                        {item.quantity} x {item.name}
                      </p>
                      <p className="text-xs text-slate-400">
                        Confidence {Math.round(item.confidence * 100)}%
                        {item.matchedText ? ` • Heard "${item.matchedText}"` : ""}
                      </p>
                    </div>

                    <div className="text-right shrink-0">
                      <p className="text-lg font-semibold text-green-400">
                        ${item.lineTotal.toFixed(2)}
                      </p>
                      <p className="text-xs text-slate-400">
                        ${item.price.toFixed(2)} each
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : order ? (
              <p className="text-slate-400">Listening for menu items...</p>
            ) : (
              <p className="text-slate-400">No items yet. Speak to begin your order.</p>
            )}
          </div>

          {hasConfirmationItems ? (
            <div className="rounded-lg border border-amber-400/40 bg-amber-400/10 p-4">
              <p className="font-semibold text-amber-200">Please confirm</p>
              <div className="mt-3 space-y-2">
                {needsConfirmation.map((item) => (
                  <p className="text-sm text-amber-100" key={item.id}>
                    Did you mean {item.quantity} x {item.name}? Heard &ldquo;{item.matchedText}&rdquo; with{" "}
                    {Math.round(item.confidence * 100)}% confidence.
                  </p>
                ))}
              </div>
            </div>
          ) : null}

          {total > 0 ? (
            <div className="border-t border-slate-800 pt-4 flex items-center justify-between">
              <span className="text-slate-300 font-medium">Estimated Total</span>
              <span className="text-2xl font-bold text-green-400">
                ${total.toFixed(2)}
              </span>
            </div>
          ) : null}

          {spokenTotal ? (
            <p className="text-sm text-green-300">{spokenTotal}</p>
          ) : null}

          {submitError ? (
            <div className="p-3 rounded-lg bg-red-950/60 border border-red-500/50 text-red-200 text-sm">
              {submitError}
            </div>
          ) : null}

          {/* SaaS Order Confirmation & Submission Flow */}
          {hasItems && isAuthenticated ? (
            <div className="pt-2 border-t border-slate-800 space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">
                  Special Instructions (optional)
                </label>
                <input
                  type="text"
                  value={specialInstructions}
                  onChange={(e) => onSpecialInstructionsChange?.(e.target.value)}
                  placeholder="e.g. Steak medium rare, dressing on side"
                  className="w-full text-sm rounded-lg bg-slate-800 border border-slate-700 px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <button
                type="button"
                onClick={onSubmitOrder}
                disabled={isSubmitting}
                className="w-full py-3 px-4 rounded-xl font-bold text-white bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 transition-all shadow-lg flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Sending to Kitchen...</span>
                  </>
                ) : (
                  <>
                    <span>✓</span>
                    <span>Confirm & Place Order ({items.length} items)</span>
                  </>
                )}
              </button>
            </div>
          ) : hasItems && !isAuthenticated ? (
            <div className="p-3 rounded-lg bg-blue-950/40 border border-blue-500/30 text-blue-200 text-xs">
              💡 <span className="font-semibold">Prototype Mode:</span> Orders are calculated locally. Sign in to Restaurant A above to persist live orders to the backend and kitchen.
            </div>
          ) : null}
        </>
      )}
    </section>
  );
}
