#!/bin/bash
# Uji semua 5 tab di viewport kunci + screenshot bukti
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
      bad.push(el.tagName + " L" + r.left.toFixed(0) + " R" + r.right.toFixed(0));
    }
  });
  return bad.length;
})()'

declare -A TABIDX=( [boost]=1 [friends]=2 [rank]=3 [wallet]=4 )

for vw in 360 800 1440; do
  agent-browser set viewport $vw 900 >/dev/null 2>&1
  for tab in boost friends rank wallet; do
    if [ $vw -lt 1024 ]; then
      agent-browser click "nav.fixed ul li:nth-child(${TABIDX[$tab]}) button" >/dev/null 2>&1
    else
      agent-browser click "aside nav ul li:nth-child(${TABIDX[$tab]}) button" >/dev/null 2>&1
    fi
    sleep 0.8
    N=$(agent-browser eval "$PROBE" 2>/dev/null | tail -1)
    echo "vw=$vw tab=$tab overflow=$N"
  done
  agent-browser eval 'useGameStore ? 1 : 1' >/dev/null 2>&1
  # kembali ke tab mine
  if [ $vw -lt 1024 ]; then
    agent-browser click "nav.fixed ul li:nth-child(1) button" >/dev/null 2>&1
  else
    agent-browser click "aside nav ul li:nth-child(1) button" >/dev/null 2>&1
  fi
done
echo "DONE"
