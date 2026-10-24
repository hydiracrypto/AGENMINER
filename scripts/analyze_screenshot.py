#!/usr/bin/env python3
"""Analisis presisi screenshot user: temukan tepi kartu & lebar konten."""
from PIL import Image

im = Image.open("/home/z/my-project/upload/Screenshot_20261024_203704_Chrome.jpg").convert("RGB")
W, H = im.size
px = im.load()
print(f"Image: {W}x{H}")

def find_edges(y, thresh=6):
    """Deteksi lomatan kecerahan signifikan di baris y."""
    edges = []
    prev = None
    for x in range(0, W):
        r, g, b = px[x, y]
        v = (r + g + b) // 3
        if prev is not None and abs(v - prev) >= thresh:
            edges.append((x, prev, v))
        prev = v
    return edges

def card_extent(y, bg_thresh=5):
    """Cari rentang x di baris y yang lebih terang dari latar gelap (kartu)."""
    xs = []
    for x in range(W):
        r, g, b = px[x, y]
        v = (r + g + b) // 3
        if v > 16 + bg_thresh:
            xs.append(x)
    if not xs:
        return None
    return xs[0], xs[-1]

for label, y in [
    ("header strip (profil)", 235),
    ("balance card", 330),
    ("pool stats card", 580),
    ("progress bar pool", 690),
    ("info row Power/Streak", 1160),
    ("prompt card", 1240),
    ("textarea", 1300),
]:
    ext = card_extent(y)
    if ext:
        print(f"y={y:4d} {label:24s} -> x {ext[0]}..{ext[1]} (lebar {ext[1]-ext[0]})")
    else:
        print(f"y={y:4d} {label:24s} -> tidak terdeteksi")

for y in [1430, 1450]:
    ext = card_extent(y)
    if ext:
        print(f"y={y:4d} bottom nav              -> x {ext[0]}..{ext[1]} (lebar {ext[1]-ext[0]})")

print("\nTepi keras baris y=230 (zona header):", find_edges(230, 8)[:12])
print("Tepi keras baris y=570 (zona pool):", find_edges(570, 8)[:12])

for x in [10, 200, 400, 480, 500, 520, 560, 600, 660, 700]:
    r, g, b = px[x, 200]
    print(f"  header y=200 x={x:3d}: rgb({r},{g},{b})")
