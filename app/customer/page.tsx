"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import Conversation from "@/components/Conversation";
import Header from "@/components/Header";
import MenuItem from "@/components/MenuItem";
import OrderSummary from "@/components/OrderSummary";
import StatusCard from "@/components/StatusCard";
import VoiceButton from "@/components/VoiceButton";

import { getMenu } from "@/lib/api";
import { matchOrderFromTranscript } from "@/lib/orderMatcher";
import {
  startRealtimeVoiceSession,
  type RealtimeVoiceSession,
  type TranscriptUpdate,
} from "@/lib/realtime";
import type { MenuItem as MenuItemType } from "@/types/order";

interface TranscriptEntry {
  id: string;
  isFinal: boolean;
  role: TranscriptUpdate["role"];
  text: string;
}

export default function CustomerPage() {
  const [conversation, setConversation] = useState<TranscriptEntry[]>([]);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [menu, setMenu] = useState<MenuItemType[]>([]);
  const [menuError, setMenuError] = useState("");
  const [status, setStatus] = useState("Waiting for customer...");
  const sessionRef = useRef<RealtimeVoiceSession | null>(null);

  const groupedMenu = useMemo(() => {
    return menu.reduce<Record<string, MenuItemType[]>>((groups, item) => {
      const category = item.category ?? "Menu";
      groups[category] = [...(groups[category] ?? []), item];
      return groups;
    }, {});
  }, [menu]);

  const currentOrder = useMemo(() => {
    return conversation
      .filter((entry) => entry.role === "user" && entry.isFinal)
      .map((entry) => entry.text.trim())
      .filter(Boolean)
      .join("\n");
  }, [conversation]);

  const orderMatch = useMemo(() => {
    return matchOrderFromTranscript(currentOrder, menu);
  }, [currentOrder, menu]);

  const displayStatus =
    orderMatch.needsConfirmation.length > 0
      ? "Please confirm the highlighted menu item."
      : orderMatch.spokenTotal || status;

  const conversationText = useMemo(() => {
    return conversation
      .map((entry) => {
        const label = entry.role === "user" ? "You" : "AI";
        const text =
          entry.role === "assistant"
            ? normalizeAssistantText(entry.text)
            : entry.text.trim();
        if (!text) return "";

        return `${label}: ${text}`;
      })
      .filter(Boolean)
      .join("\n\n");
  }, [conversation]);

  const upsertTranscript = useCallback((update: TranscriptUpdate) => {
    setConversation((current) => {
      const index = current.findIndex(
        (entry) => entry.id === update.id && entry.role === update.role
      );

      if (index === -1) {
        return [...current, update];
      }

      return current.map((entry, currentIndex) =>
        currentIndex === index ? { ...entry, ...update } : entry
      );
    });
  }, []);

  const stopListening = useCallback(() => {
    sessionRef.current?.stop();
    sessionRef.current = null;
    setIsConnecting(false);
    setIsListening(false);
    setIsSpeaking(false);
    setStatus("Voice session ended.");
  }, []);

  const startListening = useCallback(async () => {
    setConversation([]);
    setIsConnecting(true);
    setStatus("Requesting microphone...");

    try {
      const session = await startRealtimeVoiceSession({
        onAssistantSpeakingChange: setIsSpeaking,
        onDisconnected: () => {
          sessionRef.current = null;
          setIsConnecting(false);
          setIsListening(false);
          setIsSpeaking(false);
          setStatus("Voice session ended.");
        },
        onError: (message) => {
          setStatus(message);
        },
        onReady: () => {
          setIsListening(true);
          setIsConnecting(false);
        },
        onStatusChange: setStatus,
        onTranscript: upsertTranscript,
      });

      sessionRef.current = session;
      setIsConnecting(false);
      setIsListening(true);
    } catch (error) {
      console.error(error);
      sessionRef.current = null;
      setIsConnecting(false);
      setIsListening(false);
      setIsSpeaking(false);
      setStatus(
        error instanceof Error
          ? error.message
          : "Unable to start voice session."
      );
    }
  }, [upsertTranscript]);

  const toggleListening = useCallback(() => {
    if (sessionRef.current) {
      stopListening();
      return;
    }

    void startListening();
  }, [startListening, stopListening]);

  useEffect(() => {
    let isCancelled = false;

    async function loadMenu() {
      try {
        const items = await getMenu();
        if (!isCancelled) {
          setMenu(items);
          setMenuError("");
        }
      } catch (error) {
        console.error(error);
        if (!isCancelled) {
          setMenuError("Menu is unavailable right now.");
        }
      }
    }

    void loadMenu();

    return () => {
      isCancelled = true;
    };
  }, []);

  useEffect(() => {
    return () => {
      sessionRef.current?.stop();
    };
  }, []);

  return (
    <main className="min-h-screen bg-slate-950 text-white flex justify-center">
      <div className="w-full max-w-6xl p-8 space-y-8">
        <Header />

        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start">
          <div className="space-y-8">
            <VoiceButton
              disabled={isConnecting}
              isConnecting={isConnecting}
              isListening={isListening}
              isSpeaking={isSpeaking}
              onToggleListening={toggleListening}
            />

            <OrderSummary
              items={orderMatch.items}
              needsConfirmation={orderMatch.needsConfirmation}
              order={currentOrder}
              spokenTotal={orderMatch.spokenTotal}
              total={orderMatch.total}
            />

            <Conversation response={conversationText} />

            <StatusCard status={displayStatus} />
          </div>

          <aside className="bg-slate-900 rounded-2xl p-6 lg:sticky lg:top-8 lg:max-h-[calc(100vh-4rem)] lg:overflow-y-auto">
            <h2 className="text-2xl font-bold mb-4">Menu</h2>

            {menuError ? (
              <p className="text-slate-400">{menuError}</p>
            ) : menu.length === 0 ? (
              <p className="text-slate-400">Loading menu...</p>
            ) : (
              <div className="space-y-6">
                {Object.entries(groupedMenu).map(([category, items]) => (
                  <section key={category}>
                    <h3 className="text-sm font-bold uppercase tracking-wide text-blue-300">
                      {category}
                    </h3>

                    <div className="mt-1">
                      {items.map((item) => (
                        <MenuItem key={item.id ?? item.name} item={item} />
                      ))}
                    </div>
                  </section>
                ))}
              </div>
            )}
          </aside>
        </div>
      </div>
    </main>
  );
}

function normalizeAssistantText(text: string): string {
  const trimmed = text.trim();
  if (!trimmed) return "";

  if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
    return "I've updated the order list.";
  }

  return trimmed;
}
