from pathlib import Path
import sys
from PIL import Image, ImageOps, ImageDraw

root = Path(sys.argv[1]).resolve() if len(sys.argv) > 1 else Path(__file__).resolve().parent / "qa_render"
pages = sorted(root.glob("page-*.png"), key=lambda p: int(p.stem.split("-")[-1]))
for group_index in range(0, len(pages), 8):
    group = pages[group_index:group_index + 8]
    thumb_w = 340
    thumb_h = 440
    canvas = Image.new("RGB", (thumb_w * 4 + 50, thumb_h * 2 + 50), "#d9dde3")
    draw = ImageDraw.Draw(canvas)
    for idx, path in enumerate(group):
        image = Image.open(path).convert("RGB")
        image.thumbnail((thumb_w - 20, thumb_h - 35))
        x = 10 + (idx % 4) * thumb_w
        y = 25 + (idx // 4) * thumb_h
        canvas.paste(image, (x, y + 15))
        draw.text((x, 5 + (idx // 4) * thumb_h), path.stem, fill="#172b4d")
    out = root / f"contact-{group_index // 8 + 1}.png"
    canvas.save(out)
    print(out)
