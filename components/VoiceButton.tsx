"use client";

interface Props {
  disabled?: boolean;
  isConnecting?: boolean;
  isListening?: boolean;
  isSpeaking?: boolean;
  onToggleListening: () => void;
}

export default function VoiceButton({
  disabled = false,
  isConnecting = false,
  isListening = false,
  isSpeaking = false,
  onToggleListening,
}: Props) {
  const isActive = isConnecting || isListening;

  return (
    <div className="flex flex-col items-center justify-center py-12">
      <button
        aria-pressed={isActive}
        disabled={disabled || isConnecting}
        onClick={onToggleListening}
        type="button"
        className={`
          w-36
          h-36
          rounded-full
          flex
          items-center
          justify-center
          text-5xl
          transition-all
          duration-300
          shadow-2xl
          ${
            isActive
              ? "bg-red-600 animate-pulse scale-110"
              : "bg-blue-600 hover:bg-blue-500 hover:scale-105"
          }
          ${disabled || isConnecting ? "cursor-not-allowed opacity-70" : ""}
        `}
      >
        <span aria-hidden="true">{"\uD83C\uDFA4"}</span>
      </button>

      <p className="mt-6 text-xl font-semibold">
        {isConnecting
          ? "Connecting..."
          : isSpeaking
            ? "AI speaking..."
            : isListening
              ? "Listening..."
              : "Tap to Speak"}
      </p>

      <p className="text-slate-400 mt-2">
        Speak naturally to the AI waiter.
      </p>
    </div>
  );
}
