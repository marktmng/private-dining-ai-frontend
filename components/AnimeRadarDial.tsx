"use client";

import { useEffect, useRef } from "react";
import { animate } from "animejs";

interface Props {
  disabled?: boolean;
  isConnecting?: boolean;
  isListening?: boolean;
  isSpeaking?: boolean;
  onToggleListening: () => void;
  statusText?: string;
}

export default function AnimeRadarDial({
  disabled = false,
  isConnecting = false,
  isListening = false,
  isSpeaking = false,
  onToggleListening,
  statusText,
}: Props) {
  const outerArcRef = useRef<SVGCircleElement>(null);
  const midRingRef = useRef<SVGCircleElement>(null);
  const satellite1Ref = useRef<SVGCircleElement>(null);
  const satellite2Ref = useRef<SVGCircleElement>(null);
  const waveDotsRef = useRef<HTMLDivElement>(null);

  const isActive = isConnecting || isListening || isSpeaking;

  // Anime.js animations
  useEffect(() => {
    // Rotating outer ticks and segments
    if (outerArcRef.current) {
      animate(outerArcRef.current, {
        rotate: isListening ? 360 : isSpeaking ? -360 : 360,
        duration: isListening ? 12000 : 28000,
        loop: true,
        ease: "linear",
      });
    }

    if (midRingRef.current) {
      animate(midRingRef.current, {
        rotate: -360,
        duration: 20000,
        loop: true,
        ease: "linear",
      });
    }

    // Satellite nodes revolving
    if (satellite1Ref.current) {
      animate(satellite1Ref.current, {
        opacity: [0.3, 1, 0.3],
        scale: [0.9, 1.3, 0.9],
        duration: 2000,
        loop: true,
        ease: "easeInOutSine",
      });
    }

    if (satellite2Ref.current) {
      animate(satellite2Ref.current, {
        opacity: [0.4, 1, 0.4],
        scale: [1, 1.4, 1],
        duration: 2400,
        loop: true,
        ease: "easeInOutSine",
      });
    }

    // Audio frequency bars / dots in center
    if (waveDotsRef.current && (isListening || isSpeaking)) {
      const dots = waveDotsRef.current.children;
      Array.from(dots).forEach((dot, i) => {
        animate(dot, {
          scaleY: [0.3, Math.random() * 1.5 + 0.8, 0.3],
          opacity: [0.5, 1, 0.5],
          duration: 400 + (i % 5) * 120,
          loop: true,
          ease: "easeInOutQuad",
          delay: (i * 60) % 300,
        });
      });
    }
  }, [isListening, isSpeaking, isActive]);

  // Generate radial ticks for the dial
  const ticks = Array.from({ length: 48 }).map((_, i) => {
    const angle = (i * 360) / 48;
    const isMajor = i % 4 === 0;
    return { angle, isMajor };
  });

  return (
    <div className="relative flex flex-col items-center justify-center p-4 sm:p-6 w-full max-w-xl mx-auto select-none">
      {/* Background Ambience Glow */}
      <div
        className={`absolute w-72 h-72 sm:w-88 sm:h-88 rounded-full transition-all duration-700 pointer-events-none blur-3xl ${
          isListening
            ? "bg-[#22D3EE]/15 scale-110"
            : isSpeaking
            ? "bg-[#B68A2D]/20 scale-110"
            : isConnecting
            ? "bg-[#F59E0B]/15 scale-100"
            : "bg-[#B68A2D]/8 scale-90"
        }`}
      />

      {/* Main Circular Dial Container (Anime.js inspiration) */}
      <div className="relative w-72 h-72 sm:w-84 sm:h-84 md:w-96 md:h-96 flex items-center justify-center">
        {/* SVG Dial System */}
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none"
          viewBox="0 0 400 400"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Radial Ticks */}
          <g transform="translate(200, 200)" opacity="0.45">
            {ticks.map(({ angle, isMajor }, idx) => (
              <line
                key={idx}
                x1="0"
                y1={isMajor ? -184 : -180}
                x2="0"
                y2="-172"
                stroke={isMajor ? "#B68A2D" : "rgba(182, 138, 45, 0.4)"}
                strokeWidth={isMajor ? "1.5" : "1"}
                transform={`rotate(${angle})`}
              />
            ))}
          </g>

          {/* Outer Multi-Segmented Colored Ring (Anime.js Inspired Arcs) */}
          {/* Segment 1: Gold Arc */}
          <path
            d="M 200 24 A 176 176 0 0 1 356 124"
            stroke="#B68A2D"
            strokeWidth="3.5"
            strokeLinecap="round"
            className="drop-shadow-[0_0_8px_rgba(182,138,45,0.6)]"
          />
          {/* Segment 2: Emerald Arc */}
          <path
            d="M 374 180 A 176 176 0 0 1 324 324"
            stroke="#10B981"
            strokeWidth="3"
            strokeLinecap="round"
            className="drop-shadow-[0_0_8px_rgba(16,185,129,0.5)]"
          />
          {/* Segment 3: Cyan Arc */}
          <path
            d="M 280 364 A 176 176 0 0 1 120 364"
            stroke="#22D3EE"
            strokeWidth="3.5"
            strokeLinecap="round"
            className="drop-shadow-[0_0_8px_rgba(34,211,238,0.6)]"
          />
          {/* Segment 4: Coral / Amber Arc */}
          <path
            d="M 76 324 A 176 176 0 0 1 26 180"
            stroke="#F59E0B"
            strokeWidth="3"
            strokeLinecap="round"
            className="drop-shadow-[0_0_8px_rgba(245,158,11,0.5)]"
          />
          {/* Segment 5: Top Left Gold Arc */}
          <path
            d="M 44 124 A 176 176 0 0 1 180 24"
            stroke="#B68A2D"
            strokeWidth="2.5"
            strokeDasharray="4 4"
            strokeLinecap="round"
          />

          {/* Concentric Rotating Dash Track 1 */}
          <circle
            ref={outerArcRef}
            cx="200"
            cy="200"
            r="154"
            stroke="#B68A2D"
            strokeWidth="1.2"
            strokeDasharray="20 12 60 12"
            strokeOpacity="0.6"
          />

          {/* Concentric Track 2 */}
          <circle
            ref={midRingRef}
            cx="200"
            cy="200"
            r="128"
            stroke="#B68A2D"
            strokeWidth="1"
            strokeDasharray="6 8"
            strokeOpacity="0.4"
          />

          {/* Rotating Orbital Satellites */}
          <g transform="translate(200, 200)" className="animate-spin-slow">
            {/* Cyan Node */}
            <circle
              ref={satellite1Ref}
              cx="154"
              cy="0"
              r="4"
              fill="#22D3EE"
              className="drop-shadow-[0_0_8px_#22D3EE]"
            />
            {/* Gold Node */}
            <circle
              ref={satellite2Ref}
              cx="-128"
              cy="0"
              r="3.5"
              fill="#B68A2D"
              className="drop-shadow-[0_0_8px_#B68A2D]"
            />
          </g>

          {/* Inner Reticle Rings */}
          <circle
            cx="200"
            cy="200"
            r="94"
            stroke="#B68A2D"
            strokeWidth="1"
            strokeOpacity="0.3"
          />
        </svg>

        {/* Central Core Voice Trigger (Interactive) */}
        <button
          type="button"
          disabled={disabled || isConnecting}
          onClick={onToggleListening}
          aria-label={isListening ? "End voice session" : "Start voice ordering session"}
          className={`
            relative z-10
            w-36 h-36 sm:w-44 sm:h-44 md:w-48 md:h-48
            rounded-full
            flex flex-col items-center justify-center
            transition-all duration-300
            cursor-pointer
            focus:outline-none
            ${
              isListening
                ? "bg-gradient-to-b from-[#22D3EE]/20 to-[#191814] border-2 border-[#22D3EE] shadow-[0_0_30px_rgba(34,211,238,0.45)] scale-105"
                : isSpeaking
                ? "bg-gradient-to-b from-[#B68A2D]/25 to-[#191814] border-2 border-[#E5C378] shadow-[0_0_30px_rgba(182,138,45,0.5)] scale-105"
                : isConnecting
                ? "bg-gradient-to-b from-[#F59E0B]/20 to-[#191814] border-2 border-[#F59E0B] shadow-[0_0_20px_rgba(245,158,11,0.3)] animate-pulse"
                : "bg-gradient-to-b from-[#25221B] to-[#191814] border-2 border-[#B68A2D]/60 hover:border-[#B68A2D] shadow-[0_0_20px_rgba(182,138,45,0.2)] hover:shadow-[0_0_35px_rgba(182,138,45,0.45)] hover:scale-102"
            }
            ${disabled || isConnecting ? "opacity-75 cursor-not-allowed" : ""}
          `}
        >
          {/* Reticle Crosshairs */}
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
            <div className="w-full h-[1px] bg-[#B68A2D]/20" />
            <div className="absolute h-full w-[1px] bg-[#B68A2D]/20" />
          </div>

          {/* Audio Visualizer Wave Bars (Center) */}
          <div
            ref={waveDotsRef}
            className="flex items-center justify-center gap-1.5 h-12 w-24 mb-1 z-10"
          >
            {Array.from({ length: 7 }).map((_, idx) => (
              <span
                key={idx}
                className={`w-1.5 rounded-full transition-all duration-150 ${
                  isListening
                    ? "bg-[#22D3EE] h-8 shadow-[0_0_8px_#22D3EE]"
                    : isSpeaking
                    ? "bg-[#E5C378] h-9 shadow-[0_0_8px_#B68A2D]"
                    : isConnecting
                    ? "bg-[#F59E0B] h-4 animate-bounce"
                    : "bg-[#B68A2D]/40 h-2"
                }`}
              />
            ))}
          </div>

          {/* Voice Core Label */}
          <div className="z-10 text-center px-2">
            <span
              className={`font-mono text-[11px] sm:text-xs font-bold tracking-widest uppercase block ${
                isListening
                  ? "text-[#22D3EE]"
                  : isSpeaking
                  ? "text-[#E5C378]"
                  : isConnecting
                  ? "text-[#F59E0B]"
                  : "text-[#B68A2D]"
              }`}
            >
              {isConnecting
                ? "CONNECTING"
                : isSpeaking
                ? "AI SPEAKING"
                : isListening
                ? "LISTENING"
                : "ENGAGE VOICE"}
            </span>
            <span className="text-[10px] text-[#F3EFE6]/60 font-mono tracking-tight mt-0.5 block">
              {isListening ? "TAP TO FINISH" : "TAP TO ORDER"}
            </span>
          </div>

          {/* Center Pulsing Ring */}
          {isActive && (
            <div
              className={`absolute inset-0 rounded-full border pointer-events-none animate-ping ${
                isListening
                  ? "border-[#22D3EE]/40"
                  : isSpeaking
                  ? "border-[#B68A2D]/40"
                  : "border-[#F59E0B]/30"
              }`}
            />
          )}
        </button>

        {/* Orbit Degree Labels (Tactical HUD) */}
        <div className="absolute top-2 font-mono text-[9px] tracking-widest text-[#B68A2D]/60">
          000° // NOR
        </div>
        <div className="absolute right-2 font-mono text-[9px] tracking-widest text-[#B68A2D]/60">
          090° // EST
        </div>
        <div className="absolute bottom-2 font-mono text-[9px] tracking-widest text-[#B68A2D]/60">
          180° // SUD
        </div>
        <div className="absolute left-2 font-mono text-[9px] tracking-widest text-[#B68A2D]/60">
          270° // OUE
        </div>
      </div>

      {/* Dial Footer Status Capsule */}
      <div className="mt-5 text-center space-y-2">
        <p className="font-mono text-sm tracking-wider text-[#F3EFE6] font-medium">
          {statusText ||
            (isConnecting
              ? "Synchronizing OpenAI Realtime Voice Pipeline..."
              : isSpeaking
              ? "AIVORA synthesized dining recommendation."
              : isListening
              ? "Acoustic stream active • Speak your order naturally"
              : "System idle • Tap center core to begin private dining conversation")}
        </p>

        {/* Telemetry Chips */}
        <div className="flex flex-wrap items-center justify-center gap-2 pt-1 font-mono text-[10px] text-[#B68A2D]">
          <span className="bg-[#211F1A] border border-[#B68A2D]/30 px-2.5 py-0.5 rounded">
            MIC: {isListening ? "ACTIVE 48kHz" : "STANDBY"}
          </span>
          <span className="bg-[#211F1A] border border-[#B68A2D]/30 px-2.5 py-0.5 rounded">
            NOISE FILTER: -18dB
          </span>
          <span className="bg-[#211F1A] border border-[#B68A2D]/30 px-2.5 py-0.5 rounded">
            LATENCY: 34ms
          </span>
          <span className="bg-[#211F1A] border border-[#22D3EE]/30 text-[#22D3EE] px-2.5 py-0.5 rounded">
            CODEC: OPUS-RAW
          </span>
        </div>
      </div>
    </div>
  );
}
