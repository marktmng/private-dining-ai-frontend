"use client";

interface Props {
  order?: string;
  total?: number;
}

export default function OrderSummary({ order, total = 0 }: Props) {
  return (
    <section className="bg-slate-900 rounded-2xl p-6">
      <h2 className="text-2xl font-bold mb-4">
        Current Order
      </h2>

      <div className="min-h-[80px]">
        {order ? (
          <p className="text-lg whitespace-pre-wrap">{order}</p>
        ) : (
          <p className="text-slate-400">
            No items yet.
          </p>
        )}
      </div>

      {total > 0 ? (
        <div className="mt-5 border-t border-slate-800 pt-4 flex items-center justify-between">
          <span className="text-slate-300">Total</span>
          <span className="text-2xl font-bold text-green-400">
            ${total.toFixed(2)}
          </span>
        </div>
      ) : null}
    </section>
  );
}
