"use client";

// ============================================
// AGENTIC MINER — Negara Pengguna Kripto Terbanyak
// Top global crypto communities by user count
// ============================================

import { Globe2 } from "lucide-react";
import { fmtNum } from "@/lib/game-config";
import { useT } from "@/lib/i18n";

export interface CryptoCountry {
  flag: string;
  nameZh: string;
  nameEn: string;
  users: number; // estimasi pengguna kripto
  popPct: number; // % dari populasi
  adoption: number; // Global Adoption Index score
}

export const CRYPTO_COUNTRIES: CryptoCountry[] = [
  { flag: "🇮🇳", nameZh: "印度", nameEn: "India", users: 103_000_000, popPct: 7.2, adoption: 1 },
  { flag: "🇮🇩", nameZh: "印度尼西亚", nameEn: "Indonesia", users: 66_000_000, popPct: 23.8, adoption: 3 },
  { flag: "🇳🇬", nameZh: "尼日利亚", nameEn: "Nigeria", users: 47_000_000, popPct: 21.5, adoption: 2 },
  { flag: "🇺🇸", nameZh: "美国", nameEn: "United States", users: 42_000_000, popPct: 12.4, adoption: 4 },
  { flag: "🇻🇳", nameZh: "越南", nameEn: "Vietnam", users: 21_000_000, popPct: 21.2, adoption: 5 },
  { flag: "🇵🇰", nameZh: "巴基斯坦", nameEn: "Pakistan", users: 20_000_000, popPct: 8.6, adoption: 8 },
  { flag: "🇧🇷", nameZh: "巴西", nameEn: "Brazil", users: 17_500_000, popPct: 8.1, adoption: 10 },
  { flag: "🇵🇭", nameZh: "菲律宾", nameEn: "Philippines", users: 16_000_000, popPct: 14.2, adoption: 6 },
  { flag: "🇹🇭", nameZh: "泰国", nameEn: "Thailand", users: 12_000_000, popPct: 17.2, adoption: 12 },
  { flag: "🇷🇺", nameZh: "俄罗斯", nameEn: "Russia", users: 11_900_000, popPct: 8.2, adoption: 15 },
];

const RANK_MEDAL = ["🥇", "🥈", "🥉"];

/** Kartu "Negara Pengguna Kripto Terbanyak" — dipakai di login (compact, top 5) & tab Rank (top 10) */
export default function CryptoCountries({ limit = 10 }: { limit?: number }) {
  const { t, lang } = useT();
  const rows = CRYPTO_COUNTRIES.slice(0, limit);
  const maxUsers = rows[0]?.users ?? 1;

  return (
    <div className="am-card rounded-2xl border border-[#2B3139] bg-[#181A20]/90 p-5 backdrop-blur">
      <h3 className="flex items-center gap-1.5 text-sm font-bold">
        <Globe2 className="h-4 w-4 text-[#20B26C]" />
        {t("countriesTitle")}
      </h3>
      <p className="mt-0.5 text-xs text-[#848E9C]">{t("countriesSub")}</p>

      <ul className="mt-4 space-y-2">
        {rows.map((c, i) => {
          const name = lang === "en" ? c.nameEn : c.nameZh;
          const barPct = Math.max(6, (c.users / maxUsers) * 100);
          return (
            <li
              key={c.nameEn}
              className={`relative overflow-hidden rounded-xl border px-3.5 py-2.5 ${
                i === 0 ? "border-[#F0B90B]/40 bg-[#F0B90B]/10" : "border-[#2B3139] bg-[#0B0E11]"
              }`}
            >
              {/* bar latar proporsional */}
              <div
                className={`absolute inset-y-0 left-0 ${i === 0 ? "bg-[#F0B90B]/10" : "bg-[#20B26C]/8"}`}
                style={{ width: `${barPct}%` }}
                aria-hidden
              />
              <div className="relative flex items-center gap-3">
                <span className="w-7 shrink-0 text-center text-sm font-extrabold tabular-nums text-[#848E9C]">
                  {i < 3 ? RANK_MEDAL[i] : i + 1}
                </span>
                <span className="text-xl shrink-0">{c.flag}</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold">{name}</p>
                  <p className="text-[10px] text-[#848E9C]">
                    {t("ofPopulation")} {c.popPct}%
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-extrabold tabular-nums text-[#F0B90B]">{fmtNum(c.users, 0, lang)}</p>
                  <p className="text-[10px] text-[#848E9C]">{t("cryptoUsers")}</p>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
