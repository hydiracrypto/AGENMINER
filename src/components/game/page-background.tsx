"use client";

// ============================================
// AGENTIC MINER — Latar dekoratif profesional
// Glow radial emas Binance + pola grid halus (fixed, non-interaktif)
// ============================================

export default function PageBackground() {
  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden" aria-hidden>
      {/* Glow emas kiri-atas */}
      <div className="absolute -top-40 left-1/4 h-[480px] w-[480px] rounded-full bg-[#F0B90B]/10 blur-[120px]" />
      {/* Glow emas lembut kanan-bawah */}
      <div className="absolute -bottom-32 -right-24 h-[420px] w-[420px] rounded-full bg-[#FCD535]/7 blur-[120px]" />
      {/* Glow hijau tipis kiri-bawah */}
      <div className="absolute bottom-1/4 -left-32 h-[360px] w-[360px] rounded-full bg-[#20B26C]/6 blur-[110px]" />
      {/* Pola grid halus */}
      <div className="am-grid-bg absolute inset-0" />
      {/* Vignette bawah agar konten terbaca */}
      <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-[#0B0E11] to-transparent" />
    </div>
  );
}
