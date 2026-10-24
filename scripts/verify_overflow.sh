#!/bin/bash
# Verifikasi MENYELURUH: overflow elemen nyata di setiap viewport
# Elemen dianggap overflow HANYA jika tidak di-clip oleh ancestor (overflow hidden/clip/scroll)
PROBE='
(() => {
  const vw = innerWidth;
  const bad = [];
  const clips = (el) => {
    let p = el.parentElement;
    while (p && p !== document.body) {
      const s = getComputedStyle(p);
      if (/(hidden|clip|auto|scroll)/.test(s.overflowX)) return true;
      p = p.parentElement;
    }
    return false;
  };
  document.querySelectorAll("body *").forEach((el) => {
    const r = el.getBoundingClientRect();
    if (r.width === 0 && r.height === 0) return;
    const st = getComputedStyle(el);
    if (st.display === "none" || st.visibility === "hidden") return;
    if ((r.right > vw + 1 || r.left < -1) && !clips(el) && st.position !== "fixed") {
      bad.push(el.tagName + "." + (el.className||"").toString().slice(0,40) + " L" + r.left.toFixed(0) + " R" + r.right.toFixed(0));
    }
  });
  return JSON.stringify({ vw, overflowCount: bad.length, samples: bad.slice(0, 6) });
})()'

for vw in 320 360 390 480 616 705 768 800 1023 1024 1280 1440 1920; do
  agent-browser set viewport $vw 900 >/dev/null 2>&1
  R=$(agent-browser eval "$PROBE" 2>/dev/null | tail -1)
  echo "vw=$vw -> $R"
done
