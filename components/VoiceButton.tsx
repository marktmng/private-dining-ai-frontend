"use client";

interface Props {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
}

export default function VoiceButton({
  value,
  onChange,
  onSubmit,
}: Props) {
  return (
    <div className="space-y-4">
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Example: I'd like two Wagyu Ribeyes and one cheesecake."
        className="
          w-full
          rounded-xl
          p-4
          min-h-[120px]
          text-black
          focus:outline-none
          focus:ring-2
          focus:ring-blue-500
        "
      />

      <button
        onClick={onSubmit}
        className="
          w-full
          bg-blue-600
          hover:bg-blue-500
          transition
          rounded-xl
          py-4
          text-xl
          font-bold
        "
      >
        Send Order
      </button>
    </div>
  );
}