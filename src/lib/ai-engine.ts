// ============================================
// AGENTIC MINER — AI Mining Engine (SERVER-SIDE ONLY)
// Menggunakan z-ai-web-dev-sdk untuk mengevaluasi
// prompt penambangan dan menghasilkan narasi reward.
// ============================================

import ZAI from "z-ai-web-dev-sdk";

export interface MiningVerdict {
  score: number; // 0-100
  summary: string; // narasi apa yang ditambang
  response: string; // respons singkat mining engine
}

const SYSTEM_PROMPT_BASE = `Kamu adalah "AGENTIC MINER AI" — mesin penambangan token AGENMINER di game mining di BNB Smart Chain.
Tugas: evaluasi "prompt penambangan" yang dikirim penambang, lalu hasilkan narasi hasil tambang yang seru.

Kriteria skor (0-100):
- Kreativitas & keunikan imajinasi
- Relevansi ke topik crypto / AI / mining / teknologi / blockchain
- Effort & detail
- Prompt sangat pendek, generik, atau asal ketik → skor rendah (10-40)
- Prompt kreatif, detail, imajinatif → skor tinggi (70-100)

PENTING: Balas HANYA dengan JSON valid, TANPA teks lain, TANPA markdown:
{"score": <integer 0-100>, "summary": "<1 kalimat seru tentang apa yang berhasil ditambang dari prompt user>", "response": "<respons mining engine maksimal 150 karakter, penuh semangat, sebutkan hash/blok/gigahash untuk keseruan>"}`;

const LANG_INSTRUCTION: Record<"id" | "en", string> = {
  id: "Tulis summary dan response dalam BAHASA INDONESIA.",
  en: "Write summary and response in ENGLISH.",
};

function clampScore(n: number): number {
  if (!Number.isFinite(n)) return 50;
  return Math.max(0, Math.min(100, Math.round(n)));
}

function extractJson(raw: string): MiningVerdict | null {
  try {
    // buang code fence kalau ada
    let text = raw.trim();
    text = text.replace(/```json/gi, "").replace(/```/g, "");
    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");
    if (start === -1 || end === -1 || end <= start) return null;
    const obj = JSON.parse(text.slice(start, end + 1));
    if (typeof obj.score !== "number") return null;
    return {
      score: clampScore(obj.score),
      summary: String(obj.summary ?? "").slice(0, 300) || "Kristal AGENMINER berhasil dikristalkan dari prompt Anda!",
      response: String(obj.response ?? "").slice(0, 200) || "⛏️ Gigahash mengalir deras — blok baru terkunci!",
    };
  } catch {
    return null;
  }
}

/** Heuristik cadangan kalau AI gagal dipanggil */
function fallbackVerdict(prompt: string, lang: "id" | "en"): MiningVerdict {
  const len = prompt.trim().length;
  const words = prompt.trim().split(/\s+/).length;
  let score = 30;
  if (len > 40) score += 10;
  if (len > 90) score += 15;
  if (words > 8) score += 10;
  if (words > 14) score += 10;
  const lower = prompt.toLowerCase();
  if (/(ai|crypto|token|blockchain|mining|bnb|chain|neural|quantum)/.test(lower)) score += 10;
  if (lang === "en") {
    return {
      score: clampScore(score),
      summary: "Neural drill broke through the block — AGENMINER crystals are safely stored in your wallet!",
      response: "⛏️ Hashrate stable, block locked. Keep mining, miner!",
    };
  }
  return {
    score: clampScore(score),
    summary: "Drill neural berhasil memecah blok — kristal AGENMINER tersimpan aman di dompet Anda!",
    response: "⛏️ Hashrate stabil, blok terkunci. Lanjutkan penambangan, miner!",
  };
}

/**
 * Evaluasi prompt penambangan via AI.
 * Selalu mengembalikan verdict (fallback heuristik bila AI error).
 * Narasi mengikuti bahasa user: "id" (Indonesia) atau "en" (English).
 */
export async function evaluateMiningPrompt(prompt: string, lang: "id" | "en" = "id"): Promise<MiningVerdict> {
  try {
    const zai = await ZAI.create();
    const completionPromise = zai.chat.completions.create({
      messages: [
        { role: "assistant", content: `${SYSTEM_PROMPT_BASE}\n\n${LANG_INSTRUCTION[lang]}` },
        { role: "user", content: prompt.slice(0, 500) },
      ],
      thinking: { type: "disabled" },
    });

    // timeout 30 detik
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("AI timeout")), 30_000)
    );

    const completion = await Promise.race([completionPromise, timeoutPromise]);
    const raw = completion.choices[0]?.message?.content ?? "";
    const verdict = extractJson(raw);
    return verdict ?? fallbackVerdict(prompt, lang);
  } catch (err) {
    console.error("[ai-engine] evaluateMiningPrompt failed:", err);
    return fallbackVerdict(prompt, lang);
  }
}
