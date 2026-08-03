"use client";

interface Props {
  order?: string;
}

export default function OrderSummary({ order }: Props) {
  return (
    <section className="bg-slate-900 rounded-2xl p-6">
      <h2 className="text-2xl font-bold mb-4">
        Current Order
      </h2>

      <div className="min-h-[80px]">
        {order ? (
          <p className="text-lg">{order}</p>
        ) : (
          <p className="text-slate-400">
            No items yet.
          </p>
        )}
      </div>
    </section>
  );
}