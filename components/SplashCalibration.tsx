"use client";

import { useEffect, useRef, useState } from "react";
import { animate } from "animejs";

interface Props {
  onComplete?: () => void;
  showInitially?: boolean;
}

export default function SplashCalibration({ onComplete, showInitially = true }: Props) {
  const [visible, setVisible] = useState(showInitially);
  const [progress, setProgress] = useState(12);
  const [statusText, setStatusText] = useState("CALIBRATING SENSORS...");
  const containerRef = useRef<HTMLDivElement>(null);
  const ring1Ref = useRef<SVGCircleElement>(null);
  const ring2Ref = useRef<SVGCircleElement>(null);
  const dot1Ref = useRef<SVGCircleElement>(null);
  const dot2Ref = useRef<SVGCircleElement>(null);

  useEffect(() => {
    if (!visible) return;

    // Progress bar and status animation
    const progressTimer = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(progressTimer);
          return 100;
        }
        const next = prev + Math.floor(Math.random() * 14) + 6;
        if (next > 40 && next < 75) {
          setStatusText("SYNCHRONIZING ACOUSTIC MATRICES...");
        } else if (next >= 75) {
          setStatusText("INTELLIGENCE PLATFORM READY");
        }
        return next > 100 ? 100 : next;
      });
    }, 140);

    // Anime.js animations for orbital rings and nodes
    if (ring1Ref.current && ring2Ref.current) {
      animate(ring1Ref.current, {
        rotate: 360,
        duration: 8000,
        loop: true,
        ease: "linear",
      });
    }

    if (dot1Ref.current) {
      animate(dot1Ref.current, {
        opacity: [0.3, 1, 0.3],
        scale: [0.8, 1.2, 0.8],
        duration: 1800,
        loop: true,
        ease: "easeInOutSine",
      });
    }

    if (dot2Ref.current) {
      animate(dot2Ref.current, {
        opacity: [0.4, 1, 0.4],
        scale: [1, 1.3, 1],
        duration: 2200,
        loop: true,
        ease: "easeInOutSine",
      });
    }

    const autoCloseTimer = setTimeout(() => {
      handleDismiss();
    }, 2800);

    return () => {
      clearInterval(progressTimer);
      clearTimeout(autoCloseTimer);
    };
  }, [visible]);

  function handleDismiss() {
    if (containerRef.current) {
      animate(containerRef.current, {
        opacity: [1, 0],
        duration: 600,
        ease: "easeOutQuad",
      }).then(() => {
        setVisible(false);
        onComplete?.();
      });
    } else {
      setVisible(false);
      onComplete?.();
    }
  }

  if (!visible) return null;

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#191814] tactical-grid select-none"
    >
      {/* Corner Brackets */}
      <div className="corner-bracket-tl m-4 !w-6 !h-6 !border-t-2 !border-l-2" />
      <div className="corner-bracket-tr m-4 !w-6 !h-6 !border-t-2 !border-r-2" />
      <div className="corner-bracket-bl m-4 !w-6 !h-6 !border-b-2 !border-l-2" />
      <div className="corner-bracket-br m-4 !w-6 !h-6 !border-b-2 !border-r-2" />

      {/* Version Tag */}
      <div className="absolute top-6 left-8 font-mono text-xs tracking-widest text-[#B68A2D]/80">
        V5.0 // SYS.ACTIVE
      </div>

      {/* Skip Button */}
      <button
        onClick={handleDismiss}
        type="button"
        className="absolute top-6 right-8 font-mono text-xs tracking-wider text-[#B68A2D]/70 hover:text-[#B68A2D] border border-[#B68A2D]/30 hover:border-[#B68A2D] px-3 py-1 rounded transition-colors"
      >
        SKIP [ESC]
      </button>

      {/* Central Visual Cluster */}
      <div className="relative flex flex-col items-center">
        {/* Orbital Radar System */}
        <div className="relative w-48 h-48 sm:w-56 sm:h-56 flex items-center justify-center">
          <svg
            className="w-full h-full animate-spin-slow"
            viewBox="0 0 200 200"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            {/* Outer dotted ring */}
            <circle
              cx="100"
              cy="100"
              r="88"
              stroke="#B68A2D"
              strokeWidth="1"
              strokeDasharray="4 6"
              strokeOpacity="0.4"
            />
            {/* Mid ring */}
            <circle
              ref={ring1Ref}
              cx="100"
              cy="100"
              r="68"
              stroke="#B68A2D"
              strokeWidth="1.2"
              strokeDasharray="40 10 20 10"
              strokeOpacity="0.75"
            />
            {/* Inner ring */}
            <circle
              ref={ring2Ref}
              cx="100"
              cy="100"
              r="44"
              stroke="#B68A2D"
              strokeWidth="1"
              strokeOpacity="0.5"
            />
            {/* Orbital node 1 (Cyan) */}
            <circle
              ref={dot1Ref}
              cx="160"
              cy="65"
              r="3.5"
              fill="#22D3EE"
              className="drop-shadow-[0_0_8px_#22D3EE]"
            />
            {/* Orbital node 2 (Gold) */}
            <circle
              ref={dot2Ref}
              cx="38"
              cy="115"
              r="3"
              fill="#B68A2D"
              className="drop-shadow-[0_0_8px_#B68A2D]"
            />
            {/* Orbital node 3 (Amber) */}
            <circle
              cx="100"
              cy="32"
              r="2.5"
              fill="#F59E0B"
              className="drop-shadow-[0_0_6px_#F59E0B]"
            />
          </svg>

          {/* Center Target Reticle */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-12 h-12 rounded-full border border-[#B68A2D] flex items-center justify-center shadow-[0_0_15px_rgba(182,138,45,0.4)]">
              <div className="w-2.5 h-2.5 rounded-full bg-[#B68A2D] animate-ping" />
              <div className="absolute w-2 h-2 rounded-full bg-[#E5C378]" />
              {/* Crosshair marks */}
              <div className="absolute w-16 h-[1px] bg-[#B68A2D]/40" />
              <div className="absolute h-16 w-[1px] bg-[#B68A2D]/40" />
            </div>
          </div>
        </div>

        {/* Title */}
        <div className="mt-8 text-center space-y-2">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-[0.35em] text-[#F3EFE6] drop-shadow-[0_2px_12px_rgba(182,138,45,0.3)]">
            A I V O R A
          </h1>
          <p className="font-mono text-xs sm:text-sm tracking-[0.25em] text-[#B68A2D] uppercase">
            Autonomous Private Dining Platform
          </p>
        </div>

        {/* Progress Bar (Dual Gold & Cyan as in Image 1) */}
        <div className="mt-10 w-72 sm:w-80 space-y-2.5">
          <div className="w-full h-1.5 bg-[#211F1A] rounded-full overflow-hidden border border-[#B68A2D]/30 p-[1px]">
            <div
              className="h-full rounded-full transition-all duration-200"
              style={{
                width: `${progress}%`,
                background: "linear-gradient(90deg, #B68A2D 0%, #22D3EE 100%)",
                boxShadow: "0 0 10px rgba(34, 211, 238, 0.6)",
              }}
            />
          </div>
          <div className="flex justify-between items-center font-mono text-[11px] tracking-widest text-[#B68A2D]/90">
            <span>{statusText}</span>
            <span>{progress}%</span>
          </div>
        </div>
      </div>

      {/* Footer coordinates */}
      <div className="absolute bottom-6 font-mono text-[10px] tracking-widest text-[#B68A2D]/50 text-center">
        SECURE PROTOCOL // 256-BIT REALTIME AUDIO STREAM // LATENCY 32MS
      </div>
    </div>
  );
}
