"use client";

interface Props {
  response: string;
}

export default function Conversation({ response }: Props) {
  return (
    <section className="bg-slate-900 rounded-2xl p-6">
      <h2 className="text-2xl font-bold mb-4">
        AI Conversation
      </h2>

      <p className="text-slate-200 whitespace-pre-wrap">
        {response || "AI response will appear here."}
      </p>
    </section>
  );
}