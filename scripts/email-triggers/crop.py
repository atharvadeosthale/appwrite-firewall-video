"""crop.py in.png out.png x y w h [zoom] — crop a region (in 1920x1080 coords) and upscale for inspection."""
import sys
from PIL import Image
src, out, x, y, w, h = sys.argv[1], sys.argv[2], *map(int, sys.argv[3:7])
zoom = float(sys.argv[7]) if len(sys.argv) > 7 else 1
im = Image.open(src)
sx = im.width / 1920
c = im.crop((int(x * sx), int(y * sx), int((x + w) * sx), int((y + h) * sx)))
if zoom != 1:
    c = c.resize((int(c.width * zoom), int(c.height * zoom)), Image.LANCZOS)
c.save(out)
