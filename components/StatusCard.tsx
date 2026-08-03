"use client";

interface Props {
  status: string;
}

export default function StatusCard({ status }: Props) {
  return (
    <section className="bg-slate-900 rounded-2xl p-6">
      <h2 className="text-2xl font-bold mb-4">
        AI Status
      </h2>

      <p className="text-green-400 text-lg">
        {status}
      </p>
    </section>
  );
}