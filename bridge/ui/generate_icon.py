"""
Run this script once to generate ui/icon.ico
Requires: pip install Pillow
Usage: python ui/generate_icon.py
"""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont


def make_icon():
    sizes = [16, 24, 32, 48, 64, 128, 256]
    frames = []

    for size in sizes:
        img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
        draw = ImageDraw.Draw(img)

        # Dark blue rounded background
        margin = size // 8
        draw.rounded_rectangle(
            [margin, margin, size - margin, size - margin],
            radius=size // 5,
            fill='#0F2557',
        )

        # White cross / plus symbol (medical)
        cx, cy = size // 2, size // 2
        bar_w = max(2, size // 6)
        bar_h = max(4, size // 2 - size // 6)
        draw.rectangle([cx - bar_w, cy - bar_h, cx + bar_w, cy + bar_h], fill='white')
        draw.rectangle([cx - bar_h, cy - bar_w, cx + bar_h, cy + bar_w], fill='white')

        # Small orange dot — connectivity indicator
        dot = max(2, size // 10)
        draw.ellipse([size - margin - dot * 2, margin, size - margin, margin + dot * 2],
                     fill='#f97316')

        frames.append(img)

    out = Path(__file__).parent / 'icon.ico'
    frames[0].save(
        str(out),
        format='ICO',
        sizes=[(s, s) for s in sizes],
        append_images=frames[1:],
    )
    print(f'Icon saved to {out}')


if __name__ == '__main__':
    make_icon()
