"use client";

import { Globe } from "lucide-react";
import { useLangStore, type Lang } from "@/lib/i18n";

const OPTIONS: { id: Lang; label: string; flag: string }[] = [
  { id: "zh", label: "中文", flag: "🇨🇳" },
  { id: "en", label: "EN", flag: "🇬🇧" },
];

/** Toggle bahasa 中文/EN — varian "pill" untuk login, varian "compact" untuk header */
export default function LanguageToggle({ variant = "pill" }: { variant?: "pill" | "compact" }) {
  const lang = useLangStore((s) => s.lang);
  const setLang = useLangStore((s) => s.setLang);

  if (variant === "compact") {
    return (
      <button
        onClick={() => setLang(lang === "zh" ? "en" : "zh")}
        className="flex items-center gap-1 rounded-full bg-[#1E2329] px-2.5 py-1.5 text-xs font-bold text-[#EAECEF] hover:bg-[#2B3139] transition-colors"
        aria-label="切换语言 / Switch language"
        title="中文 ⇄ EN"
      >
        <Globe className="h-3.5 w-3.5 text-[#F0B90B]" />
        {lang === "zh" ? "中文" : "EN"}
      </button>
    );
  }

  return (
    <div
      className="flex items-center gap-1 rounded-full border border-[#2B3139] bg-[#181A20] p-1"
      role="group"
      aria-label="选择语言 / Select language"
    >
      <Globe className="ml-1.5 h-3.5 w-3.5 text-[#848E9C]" />
      {OPTIONS.map((o) => {
        const active = lang === o.id;
        return (
          <button
            key={o.id}
            onClick={() => setLang(o.id)}
            className={`flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-bold transition-colors ${
              active ? "bg-[#F0B90B] text-[#0B0E11]" : "text-[#848E9C] hover:text-[#EAECEF]"
            }`}
            aria-pressed={active}
          >
            <span>{o.flag}</span>
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
