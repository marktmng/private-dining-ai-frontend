"use client";

import { useState } from "react";
import type { MatchedOrderItem } from "@/lib/orderMatcher";
import type { PersistedOrder, MenuItem } from "@/types/order";
import {
  Sparkles,
  Send,
  CheckCircle2,
  Clock,
  Utensils,
  Wine,
  Flame,
  AlertTriangle,
  RotateCcw,
  MessageSquare,
  Volume2,
  Plus,
  Minus,
  Trash2,
  Receipt,
  Radio,
} from "lucide-react";
import TacticalOrderTracker from "./TacticalOrderTracker";

interface Props {
  items?: MatchedOrderItem[];
  needsConfirmation?: MatchedOrderItem[];
  unmatchedPhrase?: string | null;
  orderTranscript?: string;
  conversationText?: string;
  total?: number;
  isAuthenticated?: boolean;
  isSubmitting?: boolean;
  submitError?: string | null;
  onSubmitOrder?: () => void;
  persistedOrder?: PersistedOrder | null;
  onResetOrder?: () => void;
  specialInstructions?: string;
  onSpecialInstructionsChange?: (val: string) => void;
  onQuickPrompt?: (promptText: string) => void;
  onIncrementItem?: (id: string) => void;
  onDecrementItem?: (id: string) => void;
  onRemoveItem?: (id: string) => void;
  onClearOrder?: () => void;
}

export default function TacticalAssistantPanel({
  items = [],
  needsConfirmation = [],
  unmatchedPhrase = null,
  orderTranscript,
  conversationText = "",
  total = 0,
  isAuthenticated = false,
  isSubmitting = false,
  submitError = null,
  onSubmitOrder,
  persistedOrder = null,
  onResetOrder,
  specialInstructions = "",
  onSpecialInstructionsChange,
  onQuickPrompt,
  onIncrementItem,
  onDecrementItem,
  onRemoveItem,
  onClearOrder,
}: Props) {
  const [activeTab, setActiveTab] = useState<"order" | "assist" | "transcript">("order");
  const [showTrackerModal, setShowTrackerModal] = useState(false);
  const hasItems = items.length > 0;
  const hasConfirmation = needsConfirmation.length > 0;

  const quickPrompts = [
    {
      title: "Order 2 Wagyu Ribeyes",
      subtitle: '"I\'d like two Wagyu Ribeyes medium rare and fries"',
      icon: Flame,
      prompt: "I'd like two Wagyu Ribeyes medium rare and French Fries",
    },
    {
      title: "Pair wine with steak",
      subtitle: '"What wine pairs best with the Wagyu Ribeye?"',
      icon: Wine,
      prompt: "What wine pairs best with the Wagyu Ribeye?",
    },
    {
      title: "Add Truffle Risotto",
      subtitle: '"Add one Truffle Mushroom Risotto for the table"',
      icon: Utensils,
      prompt: "Add one Truffle Mushroom Risotto",
    },
    {
      title: "Dietary & Allergen Check",
      subtitle: '"Are there any gluten-free main dishes?"',
      icon: AlertTriangle,
      prompt: "Are there any gluten free main dishes on the menu?",
    },
  ];

  return (
    <div className="corner-bracket-container w-full bg-[#1C1A15]/95 backdrop-blur-xl border border-[#B68A2D]/35 rounded-2xl shadow-2xl overflow-hidden flex flex-col h-full select-none">
      {/* Corner Brackets */}
      <div className="corner-bracket-tl !w-3.5 !h-3.5" />
      <div className="corner-bracket-tr !w-3.5 !h-3.5" />
      <div className="corner-bracket-bl !w-3.5 !h-3.5" />
      <div className="corner-bracket-br !w-3.5 !h-3.5" />

      {/* Top Header of Assistant Panel (OI Header from Image 2) */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#B68A2D]/25 bg-[#201E19]">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded-full border border-[#B68A2D] flex items-center justify-center bg-[#28251E]">
            <span className="w-2 h-2 rounded-full bg-[#22D3EE] animate-pulse" />
          </div>
          <span className="font-mono text-xs font-bold tracking-widest text-[#F3EFE6]">
            DISPATCH // ORDER HUB
          </span>
        </div>

        {/* Segmented Mode Tabs */}
        <div className="flex items-center bg-[#191814] border border-[#B68A2D]/30 rounded-lg p-0.5 font-mono text-[11px]">
          <button
            type="button"
            onClick={() => setActiveTab("order")}
            className={`px-3 py-1 rounded transition-colors cursor-pointer ${
              activeTab === "order"
                ? "bg-[#B68A2D] text-[#191814] font-bold shadow"
                : "text-[#F3EFE6]/70 hover:text-white"
            }`}
          >
            ORDER {items.length > 0 && `(${items.length})`}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("assist")}
            className={`px-3 py-1 rounded transition-colors cursor-pointer ${
              activeTab === "assist"
                ? "bg-[#B68A2D] text-[#191814] font-bold shadow"
                : "text-[#F3EFE6]/70 hover:text-white"
            }`}
          >
            ASSIST
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("transcript")}
            className={`px-3 py-1 rounded transition-colors cursor-pointer ${
              activeTab === "transcript"
                ? "bg-[#B68A2D] text-[#191814] font-bold shadow"
                : "text-[#F3EFE6]/70 hover:text-white"
            }`}
          >
            LOGS
          </button>
        </div>
      </div>

      {/* Content Area */}
      <div className="p-4 sm:p-5 flex-1 overflow-y-auto space-y-4">
        {/* ASSIST TAB: Greeting + Quick Cards (Matching Image 2) */}
        {activeTab === "assist" && (
          <div className="space-y-4">
            {/* Assistant Greeting Card */}
            <div className="p-3.5 rounded-xl bg-[#232019] border border-[#B68A2D]/30 flex items-start gap-3">
              <div className="w-9 h-9 rounded-full bg-[#191814] border border-[#B68A2D] flex items-center justify-center shrink-0 shadow-[0_0_10px_rgba(182,138,45,0.3)]">
                <Sparkles className="w-4 h-4 text-[#B68A2D]" />
              </div>
              <div>
                <h4 className="font-mono text-xs font-bold text-[#E5C378] tracking-wider uppercase">
                  Welcome, VIP Guest
                </h4>
                <p className="text-xs text-[#F3EFE6]/80 mt-1 leading-relaxed">
                  I&apos;m your private dining AI. You can tap any dish from the menu to add it, or speak naturally into the microphone to build your table order.
                </p>
              </div>
            </div>

            {/* Quick Prompts ("Try asking") */}
            <div>
              <p className="font-mono text-[11px] text-[#B68A2D] uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                <span>TRY ASKING</span>
                <span className="w-8 h-[1px] bg-[#B68A2D]/40" />
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {quickPrompts.map((item, idx) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => onQuickPrompt?.(item.prompt)}
                      className="text-left p-3 rounded-xl bg-[#232019] hover:bg-[#2A261E] border border-[#B68A2D]/20 hover:border-[#B68A2D] transition-all group shadow-sm cursor-pointer"
                    >
                      <div className="flex items-center gap-2 text-[#E5C378] group-hover:text-[#F5C869]">
                        <Icon className="w-3.5 h-3.5 text-[#B68A2D]" />
                        <span className="font-mono text-xs font-bold">
                          {item.title}
                        </span>
                      </div>
                      <p className="text-[11px] text-[#F3EFE6]/60 mt-1 line-clamp-2">
                        {item.subtitle}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Tactical Action Pills */}
            <div className="flex flex-wrap gap-2 pt-2 border-t border-[#B68A2D]/20">
              <span className="font-mono text-[10px] text-[#B68A2D]/80 self-center">
                MODES:
              </span>
              {["AUTO", "SOMMELIER", "DEGUSTATION", "ALLERGENS"].map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => onQuickPrompt?.(`Tell me about ${m.toLowerCase()} mode`)}
                  className="font-mono text-[10px] bg-[#191814] border border-[#B68A2D]/40 text-[#E5C378] hover:bg-[#B68A2D] hover:text-[#191814] px-2.5 py-0.5 rounded transition-colors cursor-pointer"
                >
                  {m}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ORDER TAB: Live matched items with +/- steppers, exact price math, special instructions */}
        {activeTab === "order" && (
          <div className="space-y-4">
            {/* If there is a Persisted Order from backend */}
            {persistedOrder ? (
              <div className="rounded-xl border border-[#10B981]/50 bg-[#12241A]/70 p-4 space-y-3 shadow-lg">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-1.5 text-[#10B981] font-mono text-xs font-bold tracking-wider">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>ORDER TRANSMITTED TO KITCHEN</span>
                    </div>
                    <p className="font-mono text-[10px] text-[#F3EFE6]/60 mt-0.5">
                      REF ID: #{persistedOrder.id.slice(0, 8)}
                    </p>
                  </div>
                  <span className="font-mono text-xs px-2 py-0.5 rounded-full bg-[#10B981]/20 text-[#10B981] border border-[#10B981]/40 font-bold">
                    {persistedOrder.status}
                  </span>
                </div>

                {/* Items in database order */}
                <div className="space-y-2 pt-2 border-t border-[#10B981]/20">
                  {persistedOrder.items.map((pi) => (
                    <div
                      key={pi.id}
                      className="flex items-center justify-between text-xs font-mono"
                    >
                      <span className="text-[#F3EFE6]">
                        {pi.quantity}x {pi.menuItem?.name || "Dish"}
                      </span>
                      <span className="text-[#10B981] font-bold">
                        ${Number(pi.subtotal).toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-[#10B981]/20 font-mono text-sm font-bold">
                  <span className="text-[#F3EFE6]/80">Authoritative Total</span>
                  <span className="text-[#10B981] text-base">
                    ${Number(persistedOrder.total).toFixed(2)}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => setShowTrackerModal(true)}
                  className="w-full mt-2 py-2.5 rounded-xl bg-gradient-to-r from-[#B68A2D] to-[#E5C378] text-[#11100D] font-mono text-xs font-bold tracking-wider flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(182,138,45,0.4)] transition-all hover:scale-[1.01] active:scale-[0.99] cursor-pointer"
                >
                  <Radio className="w-3.5 h-3.5 animate-pulse text-[#11100D]" />
                  <span>LAUNCH ORDER TELEMETRY HUD</span>
                </button>

                {onResetOrder && (
                  <button
                    type="button"
                    onClick={onResetOrder}
                    className="w-full mt-2 py-2 rounded-lg bg-[#211F1A] hover:bg-[#28251E] border border-[#B68A2D]/40 text-[#E5C378] font-mono text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Start New Table Order</span>
                  </button>
                )}

                {/* HUD Order Tracker Modal */}
                {showTrackerModal && (
                  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-3 sm:p-6 overflow-y-auto">
                    <div className="w-full max-w-4xl max-h-[92vh] overflow-y-auto">
                      <TacticalOrderTracker
                        initialOrder={persistedOrder}
                        onClose={() => setShowTrackerModal(false)}
                      />
                    </div>
                  </div>
                )}
              </div>
            ) : (
              /* Active Draft Order Stream with 100% Accuracy Steppers */
              <>
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between pb-1 border-b border-[#B68A2D]/20">
                    <span className="font-mono text-[10px] text-[#B68A2D] font-bold uppercase tracking-wider">
                      ACTIVE TICKET ITEMS ({items.length})
                    </span>
                    {hasItems && onClearOrder && (
                      <button
                        type="button"
                        onClick={onClearOrder}
                        className="font-mono text-[10px] text-red-400 hover:text-red-300 underline cursor-pointer"
                      >
                        Clear All
                      </button>
                    )}
                  </div>

                  {/* Alert banner if an unrecognized phrase was spoken while items are already in order */}
                  {hasItems && unmatchedPhrase && (
                    <div className="p-2.5 rounded-lg bg-[#211F1A] border border-[#B68A2D]/40 flex items-center gap-2 text-xs font-mono text-[#E5C378]">
                      <AlertTriangle className="w-3.5 h-3.5 text-[#B68A2D] shrink-0" />
                      <span>Heard &ldquo;{unmatchedPhrase}&rdquo; (not on menu). Existing order preserved below.</span>
                    </div>
                  )}

                  {hasItems ? (
                    items.map((item) => (
                      <div
                        key={item.id}
                        className="p-3 rounded-xl bg-[#232019] border border-[#B68A2D]/30 flex items-center justify-between gap-3 shadow-sm"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h4 className="font-semibold text-xs text-[#F3EFE6]">
                              {item.name}
                            </h4>
                          </div>
                          {item.notes && (
                            <p className="font-mono text-[10px] text-[#B68A2D] mt-0.5">
                              NOTE: {item.notes}
                            </p>
                          )}
                          <p className="font-mono text-[10px] text-[#B68A2D]/70 mt-0.5">
                            ${item.price.toFixed(2)} each
                          </p>
                        </div>

                        {/* Quantity Stepper & Price */}
                        <div className="flex items-center gap-3">
                          {/* Quantity Controls */}
                          <div className="flex items-center bg-[#191814] border border-[#B68A2D]/40 rounded-lg p-0.5">
                            <button
                              type="button"
                              onClick={() => onDecrementItem?.(item.id)}
                              className="w-5 h-5 rounded hover:bg-[#B68A2D] hover:text-[#191814] text-[#E5C378] flex items-center justify-center transition-colors cursor-pointer"
                              title="Decrease quantity"
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <span className="w-6 text-center font-mono text-xs font-bold text-[#F3EFE6]">
                              {item.quantity}
                            </span>
                            <button
                              type="button"
                              onClick={() => onIncrementItem?.(item.id)}
                              className="w-5 h-5 rounded hover:bg-[#B68A2D] hover:text-[#191814] text-[#E5C378] flex items-center justify-center transition-colors cursor-pointer"
                              title="Increase quantity"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>

                          {/* Line Total */}
                          <div className="text-right w-16">
                            <span className="font-mono text-xs font-bold text-[#E5C378]">
                              ${item.lineTotal.toFixed(2)}
                            </span>
                          </div>

                          {/* Delete Item */}
                          {onRemoveItem && (
                            <button
                              type="button"
                              onClick={() => onRemoveItem(item.id)}
                              className="p-1 rounded text-red-400 hover:text-red-300 hover:bg-red-950/40 transition-colors cursor-pointer"
                              title="Remove item"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))
                  ) : unmatchedPhrase ? (
                    <div className="p-5 rounded-xl bg-[#211F1A] border border-[#B68A2D]/40 space-y-2 text-center">
                      <div className="w-8 h-8 rounded-full bg-[#191814] border border-[#B68A2D]/60 flex items-center justify-center mx-auto text-[#E5C378]">
                        <AlertTriangle className="w-4 h-4 text-[#B68A2D]" />
                      </div>
                      <h4 className="font-mono text-xs font-bold text-[#E5C378] uppercase tracking-wider">
                        Item Not Found on Dining Menu
                      </h4>
                      <p className="font-mono text-xs text-[#F3EFE6]/90">
                        Heard &ldquo;<span className="text-[#E5C378] font-bold">{unmatchedPhrase}</span>&rdquo;, but this item is not on the restaurant menu.
                      </p>
                      <p className="text-[11px] text-[#B68A2D]/80">
                        Please tap any dish from the Menu Codex on the right, or speak a dish like &ldquo;Wagyu Ribeye&rdquo; or &ldquo;Beef Carpaccio&rdquo;.
                      </p>
                    </div>
                  ) : orderTranscript ? (
                    <div className="p-6 text-center rounded-xl bg-[#211F1A] border border-[#B68A2D]/20 space-y-2">
                      <Clock className="w-6 h-6 text-[#B68A2D] mx-auto animate-spin-slow" />
                      <p className="font-mono text-xs text-[#E5C378]">
                        Parsing voice utterance...
                      </p>
                      <p className="text-[11px] text-[#F3EFE6]/50">
                        &ldquo;{orderTranscript}&rdquo;
                      </p>
                    </div>
                  ) : (
                    <div className="p-6 text-center rounded-xl bg-[#211F1A]/60 border border-[#B68A2D]/15 space-y-2">
                      <Utensils className="w-6 h-6 text-[#B68A2D]/40 mx-auto" />
                      <p className="font-mono text-xs text-[#F3EFE6]/60">
                        No dishes ordered yet.
                      </p>
                      <p className="text-[11px] text-[#B68A2D]/70">
                        Tap dishes in the Menu on the right or speak to the Voice Core.
                      </p>
                    </div>
                  )}
                </div>

                {/* Ambiguity confirmation warning */}
                {hasConfirmation && (
                  <div className="p-3 rounded-xl bg-[#F59E0B]/10 border border-[#F59E0B]/40 space-y-1.5">
                    <div className="flex items-center gap-1.5 font-mono text-xs font-bold text-[#F59E0B]">
                      <AlertTriangle className="w-4 h-4" />
                      <span>CLARIFICATION NEEDED</span>
                    </div>
                    {needsConfirmation.map((item) => (
                      <p key={item.id} className="text-xs text-[#F3EFE6]/90">
                        Did you mean {item.name}? Heard &ldquo;{item.matchedText}&rdquo;.
                      </p>
                    ))}
                  </div>
                )}

                {/* Subtotal & Special Instructions */}
                {total > 0 && (
                  <div className="pt-3 border-t border-[#B68A2D]/25 space-y-3">
                    <div className="flex items-center justify-between font-mono bg-[#191814] p-3 rounded-xl border border-[#B68A2D]/30">
                      <div>
                        <span className="text-[10px] text-[#B68A2D] uppercase tracking-wider block">
                          100% Calculated Subtotal
                        </span>
                        <span className="text-xs text-[#F3EFE6]/60">
                          {items.reduce((acc, it) => acc + it.quantity, 0)} total items
                        </span>
                      </div>
                      <span className="text-xl font-bold text-[#E5C378] drop-shadow-[0_0_8px_rgba(182,138,45,0.4)]">
                        ${total.toFixed(2)}
                      </span>
                    </div>

                    {/* Special Instructions Input */}
                    <div>
                      <label className="block font-mono text-[10px] text-[#B68A2D] uppercase tracking-wider mb-1">
                        Chef Instructions (optional)
                      </label>
                      <input
                        type="text"
                        value={specialInstructions}
                        onChange={(e) => onSpecialInstructionsChange?.(e.target.value)}
                        placeholder="e.g. Steak medium-rare, sauce on side"
                        className="w-full text-xs font-mono rounded-lg bg-[#191814] border border-[#B68A2D]/30 focus:border-[#B68A2D] px-3 py-2 text-[#F3EFE6] placeholder-[#F3EFE6]/30 focus:outline-none"
                      />
                    </div>

                    {/* Submit Error */}
                    {submitError && (
                      <p className="font-mono text-xs text-red-400 bg-red-950/60 p-2 rounded border border-red-500/40">
                        {submitError}
                      </p>
                    )}

                    {/* Confirmation Prompt Box */}
                    <div className="p-3 rounded-xl bg-[#B68A2D]/10 border border-[#B68A2D]/40 text-center space-y-1">
                      <p className="font-mono text-xs font-bold text-[#E5C378]">
                        Shall I notify the chef to prepare your order?
                      </p>
                      <p className="font-mono text-[11px] text-[#F3EFE6]/80">
                        Total Amount: <span className="text-[#E5C378] font-bold">${total.toFixed(2)}</span>
                      </p>
                      <p className="font-mono text-[10px] text-[#B68A2D]">
                        Take your time and explore the menu if you&apos;d like to add anything else. Say <span className="text-[#E5C378] font-bold">&ldquo;Yes&rdquo;</span>, <span className="text-[#E5C378] font-bold">&ldquo;Confirm&rdquo;</span>, or tap below whenever you are ready.
                      </p>
                    </div>

                    {/* Action Button */}
                    <div className="space-y-2">
                      <button
                        type="button"
                        onClick={onSubmitOrder}
                        disabled={isSubmitting}
                        className="w-full py-3 rounded-xl font-mono text-xs font-bold tracking-wider text-[#191814] bg-gradient-to-r from-[#B68A2D] via-[#E5C378] to-[#B68A2D] hover:opacity-95 transition-all shadow-[0_0_20px_rgba(182,138,45,0.4)] flex items-center justify-center gap-2 cursor-pointer uppercase"
                      >
                        {isSubmitting ? (
                          <>
                            <span className="w-3.5 h-3.5 border-2 border-[#191814]/30 border-t-[#191814] rounded-full animate-spin" />
                            <span>NOTIFYING EXECUTIVE CHEF...</span>
                          </>
                        ) : (
                          <>
                            <Send className="w-4 h-4" />
                            <span>CONFIRM ORDER FOR THE CHEF ({items.length} {items.length === 1 ? "ITEM" : "ITEMS"})</span>
                          </>
                        )}
                      </button>
                      <div className="p-2 rounded-lg bg-[#211F1A] border border-[#B68A2D]/30 text-center font-mono text-[10px] text-[#E5C378]">
                        🎙️ Voice Command: Say &ldquo;Yes&rdquo;, &ldquo;Confirm&rdquo;, or &ldquo;Go ahead&rdquo; whenever you are ready for the chef to prepare your order.
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* TRANSCRIPT TAB: Intelligence Terminal Audio Logs */}
        {activeTab === "transcript" && (
          <div className="space-y-3 font-mono">
            <div className="flex items-center justify-between text-[10px] text-[#B68A2D] border-b border-[#B68A2D]/20 pb-1">
              <span>AUDIO CONVERSATION LOG</span>
              <span className="flex items-center gap-1 text-[#22D3EE]">
                <Volume2 className="w-3 h-3" />
                <span>DECRYPTED</span>
              </span>
            </div>

            {conversationText ? (
              <div className="space-y-2.5 text-xs text-[#F3EFE6]/90 max-h-96 overflow-y-auto pr-1">
                {conversationText.split("\n\n").map((chunk, idx) => {
                  const isUser = chunk.startsWith("You:");
                  const text = chunk.replace(/^(You|AI):\s*/, "");

                  return (
                    <div
                      key={idx}
                      className={`p-2.5 rounded-lg border text-xs ${
                        isUser
                          ? "bg-[#211F1A] border-[#22D3EE]/30 ml-4"
                          : "bg-[#25221B] border-[#B68A2D]/30 mr-4"
                      }`}
                    >
                      <div className="flex items-center justify-between text-[10px] mb-1 font-bold">
                        <span className={isUser ? "text-[#22D3EE]" : "text-[#E5C378]"}>
                          {isUser ? "GUEST // TABLE 01" : "AIVORA // WAITER"}
                        </span>
                        <span className="text-[#F3EFE6]/40">LIVE</span>
                      </div>
                      <p className="leading-relaxed whitespace-pre-wrap">{text}</p>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="py-8 text-center text-xs text-[#F3EFE6]/40 space-y-1">
                <MessageSquare className="w-5 h-5 mx-auto text-[#B68A2D]/40" />
                <p>No audio log recorded yet.</p>
                <p className="text-[10px]">Start speaking to see the transcript stream.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
