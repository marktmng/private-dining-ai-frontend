"use client";

import { useState } from "react";

import Conversation from "@/components/Conversation";
import Header from "@/components/Header";
import OrderSummary from "@/components/OrderSummary";
import StatusCard from "@/components/StatusCard";
import VoiceButton from "@/components/VoiceButton";

import { parseOrder } from "@/lib/api";

export default function CustomerPage() {
  const [order, setOrder] = useState("");
  const [response, setResponse] = useState("");
  const [status, setStatus] = useState("Waiting for customer...");

  async function submitOrder() {
    if (!order.trim()) return;

    try {
      setStatus("Talking to AI...");

      const result = await parseOrder(order);

      setResponse(result.result);
      setStatus("Order processed");
    } catch (error) {
      console.error(error);
      setStatus("Unable to contact backend.");
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white flex justify-center">
      <div className="w-full max-w-3xl p-8 space-y-8">
        <Header />

        <VoiceButton
          value={order}
          onChange={setOrder}
          onSubmit={submitOrder}
        />

        <OrderSummary order={order} />

        <Conversation response={response} />

        <StatusCard status={status} />
      </div>
    </main>
  );
}