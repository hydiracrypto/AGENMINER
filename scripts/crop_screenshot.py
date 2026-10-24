#!/usr/bin/env python3
"""Crop bagian penting screenshot user untuk inspeksi visual."""
from PIL import Image

im = Image.open("/home/z/my-project/upload/Screenshot_20261024_203704_Chrome.jpg").convert("RGB")

# Crop 1: zona header + kartu pool ( atas )
im.crop((0, 140, 720, 720)).save("/home/z/my-project/scripts/crop_top.png")
# Crop 2: tepi kanan zona pool-stats — perlihatkan batas kartu vs background
im.crop((420, 140, 720, 720)).resize((600, 1160)).save("/home/z/my-project/scripts/crop_right_edge.png")
# Crop 3: bottom nav + prompt
im.crop((0, 1180, 720, 1600)).save("/home/z/my-project/scripts/crop_bottom.png")
print("done")
