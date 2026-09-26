"""Tile stills into a labelled contact sheet: sheet.py out.png cols frame path [frame path ...]"""
import sys

from PIL import Image, ImageDraw

out, cols = sys.argv[1], int(sys.argv[2])
pairs = list(zip(sys.argv[3::2], sys.argv[4::2]))
images = [(int(f), Image.open(p).convert("RGB")) for f, p in pairs]
w, h = images[0][1].size
gap = 6
rows = (len(images) + cols - 1) // cols
sheet = Image.new("RGB", (cols * w + (cols - 1) * gap, rows * h + (rows - 1) * gap), (40, 40, 44))
draw = ImageDraw.Draw(sheet)
for i, (frame, im) in enumerate(images):
    x, y = (i % cols) * (w + gap), (i // cols) * (h + gap)
    sheet.paste(im, (x, y))
    label = f"{frame}  ({frame / 60:.2f}s)"
    draw.rectangle([x, y, x + 8 + 7 * len(label), y + 18], fill=(0, 0, 0))
    draw.text((x + 4, y + 3), label, fill=(255, 255, 0))
sheet.save(out)
