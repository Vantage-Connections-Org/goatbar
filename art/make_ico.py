# Builds src/GoatBar.ico from the two source artworks (generated with GPT Image 2
# on Higgsfield): icon-small.png (head only) for 16-24px, icon-large.png above that.
#   cd art; py make_ico.py      (needs Pillow)
from PIL import Image
import io, struct

large = Image.open("icon-large.png").convert("RGBA")
small = Image.open("icon-small.png").convert("RGBA")
entries = []
for s in (16, 20, 24, 32, 40, 48, 64, 128, 256):
    img = (small if s <= 24 else large).resize((s, s), Image.LANCZOS)
    buf = io.BytesIO()
    img.save(buf, "PNG")
    entries.append((s, buf.getvalue()))

# ICO container with PNG-compressed entries, one per size
out = struct.pack("<HHH", 0, 1, len(entries))
offset = 6 + 16 * len(entries)
body = b""
for s, png in entries:
    out += struct.pack("<BBBBHHII", s % 256, s % 256, 0, 0, 1, 32, len(png), offset)
    offset += len(png)
    body += png
open("../src/GoatBar.ico", "wb").write(out + body)
large.resize((256, 256), Image.LANCZOS).save("../docs/icon.png")
