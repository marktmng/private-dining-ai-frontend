"use client";

import { Wine, Sparkles, Check, ArrowRight } from "lucide-react";

interface Props {
  onAddPairing?: (pairingText: string) => void;
}

export default function TacticalSommelier({ onAddPairing }: Props) {
  const pairings = [
    {
      course: "Prime Wagyu Ribeye",
      recommendedWine: "2018 Stag's Leap Artemis Cabernet Sauvignon",
      origin: "Napa Valley, California",
      tastingNotes: "Deep blackberry, cassis, velvet cedar tannins that cut through marble fat.",
      glassPrice: 28,
      bottlePrice: 145,
    },
    {
      course: "Pan-Seared Salmon",
      recommendedWine: "2020 Louis Jadot Domaine des Héritiers Chablis",
      origin: "Burgundy, France",
      tastingNotes: "Crisp green apple, flint minerality, vibrant acidity accentuating oceanic oils.",
      glassPrice: 22,
      bottlePrice: 98,
    },
    {
      course: "Truffle Mushroom Risotto",
      recommendedWine: "2019 Vietti Perbacco Nebbiolo",
      origin: "Piedmont, Italy",
      tastingNotes: "Dried roses, leather, wild forest floor harmonizing earthy black winter truffles.",
      glassPrice: 24,
      bottlePrice: 110,
    },
    {
      course: "Chocolate Fondant / Crème Brûlée",
      recommendedWine: "Taylor Fladgate 20 Year Old Tawny Port",
      origin: "Douro, Portugal",
      tastingNotes: "Toasted walnuts, butterscotch, fig compote with a luscious satin finish.",
      glassPrice: 19,
      bottlePrice: 95,
    },
  ];

  return (
    <div className="corner-bracket-container w-full bg-[#1C1A15]/90 backdrop-blur-xl border border-[#B68A2D]/30 rounded-2xl p-4 sm:p-6 shadow-2xl space-y-5 select-none">
      {/* Corner Brackets */}
      <div className="corner-bracket-tl !w-3.5 !h-3.5" />
      <div className="corner-bracket-tr !w-3.5 !h-3.5" />
      <div className="corner-bracket-bl !w-3.5 !h-3.5" />
      <div className="corner-bracket-br !w-3.5 !h-3.5" />

      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-[#B68A2D]/25">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[#28251E] border border-[#B68A2D] flex items-center justify-center">
            <Wine className="w-4 h-4 text-[#E5C378]" />
          </div>
          <div>
            <h3 className="font-mono text-sm sm:text-base font-bold tracking-widest text-[#F3EFE6] uppercase">
              Sommelier AI // Cellar Intelligence
            </h3>
            <p className="font-mono text-[11px] text-[#B68A2D]/80">
              Vintage harmonizations calibrated for current table selections
            </p>
          </div>
        </div>

        <span className="font-mono text-[10px] bg-[#B68A2D]/20 text-[#E5C378] border border-[#B68A2D]/40 px-2 py-0.5 rounded">
          CELLAR V5.0
        </span>
      </div>

      {/* Wine Pairings List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
        {pairings.map((p, idx) => (
          <div
            key={idx}
            className="p-4 rounded-xl bg-[#211F1A]/90 border border-[#B68A2D]/25 hover:border-[#B68A2D]/70 transition-all space-y-2.5 shadow-sm group"
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <span className="font-mono text-[10px] tracking-widest text-[#B68A2D] uppercase block">
                  PAIRS WITH: {p.course}
                </span>
                <h4 className="font-semibold text-sm text-[#F3EFE6] group-hover:text-[#E5C378] transition-colors mt-0.5">
                  {p.recommendedWine}
                </h4>
                <p className="font-mono text-[10px] text-[#F3EFE6]/50">
                  {p.origin}
                </p>
              </div>

              <div className="text-right shrink-0 font-mono">
                <span className="text-sm font-bold text-[#E5C378] block">
                  ${p.glassPrice}
                  <span className="text-[10px] font-normal text-[#F3EFE6]/60"> / gls</span>
                </span>
                <span className="text-[10px] text-[#B68A2D]">
                  ${p.bottlePrice} btl
                </span>
              </div>
            </div>

            <p className="text-xs text-[#F3EFE6]/70 italic leading-relaxed bg-[#191814]/60 p-2 rounded border border-[#B68A2D]/15">
              &ldquo;{p.tastingNotes}&rdquo;
            </p>

            <div className="pt-1 flex items-center justify-between">
              <span className="font-mono text-[9px] text-[#10B981] flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                <span>CHEF APPROVED</span>
              </span>

              <button
                type="button"
                onClick={() =>
                  onAddPairing?.(
                    `Add one glass of ${p.recommendedWine} to pair with ${p.course}`
                  )
                }
                className="font-mono text-[10px] px-2.5 py-1 rounded bg-[#2A261E] hover:bg-[#B68A2D] text-[#E5C378] hover:text-[#191814] border border-[#B68A2D]/40 transition-colors flex items-center gap-1 cursor-pointer font-bold"
              >
                <span>PAIR GLASS</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
