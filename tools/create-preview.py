"""Regenerate the static social card (development only; requires Pillow).

Run from the repository root with DejaVu Sans installed:
    python3 tools/create-preview.py
The website serves the committed PNG and needs no renderer or dependencies.
"""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent.parent
FONT_DIR = Path("/usr/share/fonts/truetype/dejavu")
image = Image.new("RGB", (1200, 630), "#f8fafc")
draw = ImageDraw.Draw(image)


def text(position, value, size, color="#172554", bold=False):
    font = ImageFont.truetype(str(FONT_DIR / ("DejaVuSans-Bold.ttf" if bold else "DejaVuSans.ttf")), size)
    draw.text(position, value, font=font, fill=color)


# Plain typography and five progress segments, not a logo or a Brainer mark.
draw.rounded_rectangle((32, 32, 1168, 598), radius=24, fill="#ffffff", outline="#93c5fd", width=3)
text((80, 64), "Quiz Quest", 40, "#2563eb", bold=True)
draw.rounded_rectangle((80, 137, 152, 145), radius=4, fill="#f59e0b")
text((80, 176), "How well do you", 68, bold=True)
text((80, 260), "know Brainer?", 68, bold=True)
text((80, 377), "Five multiple-choice questions", 43)
for index in range(5):
    x = 80 + index * 210
    draw.rounded_rectangle((x, 506, x + 194, 530), radius=12, fill="#2563eb")

output = ROOT / "assets" / "quiz-preview.png"
output.parent.mkdir(exist_ok=True)
image.save(output, optimize=True)
print(f"Created {output}: 1200 x 630 PNG")
