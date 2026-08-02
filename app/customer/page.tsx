import Header from "@/components/Header";
import OrderSummary from "@/components/OrderSummary";
import StatusCard from "@/components/StatusCard";
import VoiceButton from "@/components/VoiceButton";

export default function CustomerPage() {
  return (
    <main className="min-h-screen bg-slate-950 text-white flex justify-center">
      <div className="w-full max-w-3xl p-8 space-y-8">

        <Header />

        <VoiceButton />

        <OrderSummary />

        <StatusCard />

      </div>
    </main>
  );
}