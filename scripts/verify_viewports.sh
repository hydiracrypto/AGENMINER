#!/bin/bash
# Verifikasi alignment di banyak viewport — Task 6
# Output: vw, scrollWidth (overflow?), delta posisi kiri header vs main vs pool vs nav
for vw in 360 390 480 616 705 768 800 900 1023 1024 1280 1440 1920; do
  agent-browser set viewport $vw 900 >/dev/null 2>&1
  R=$(agent-browser eval "
(() => {
  const q = (s) => document.querySelector(s);
  const L = (s) => { const el = q(s); return el ? +el.getBoundingClientRect().left.toFixed(1) : -1; };
  const W = (s) => { const el = q(s); return el ? +el.getBoundingClientRect().width.toFixed(1) : -1; };
  const hdr = 'header > div', mn = 'main', pl = '[data-testid=pool-stats-card]', nv = 'nav.fixed';
  return JSON.stringify({
    vw: innerWidth, sw: document.documentElement.scrollWidth,
    hdrL: L(hdr), mainL: L(mn),
    hdrW: W(hdr), mainW: W(mn), poolW: W(pl), navW: W(nv),
    navL: L(nv),
  });
})()" 2>/dev/null | tail -1)
  echo "$vw -> $R"
done
