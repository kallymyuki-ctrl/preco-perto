#!/usr/bin/env python3
"""Gera os ícones PNG do Preço Perto a partir de desenho vetorial próprio.

Uso:  python3 tools/generate-icons.py
Saída: icons/icon-192.png, icons/icon-512.png, icons/icon-maskable-512.png,
       icons/apple-touch-icon.png, icons/favicon-32.png, icons/favicon.ico

Dependência: Pillow (pip install Pillow)
"""
from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageDraw

GREEN = (15, 139, 100, 255)
GREEN_DARK = (8, 112, 81, 255)
WHITE = (255, 255, 255, 255)
MINT = (145, 236, 198, 255)
SS = 4  # fator de superamostragem (antialiasing)

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "icons"


def draw_icon(size: int, maskable: bool = False) -> Image.Image:
    s = size * SS
    img = Image.new("RGBA", (s, s), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)

    if maskable:
        # safe zone: ícone ocupa 80% centrais, fundo cheio nas bordas
        d.rectangle([0, 0, s, s], fill=GREEN)
        pad = int(s * 0.14)
        inner = s - pad * 2
        radius = int(inner * 0.22)
        d.rounded_rectangle(
            [pad, pad, pad + inner, pad + inner], radius=radius, fill=GREEN
        )
        box = (pad, pad, pad + inner, pad + inner)
        scale = inner / s
    else:
        radius = int(s * 0.25)
        d.rounded_rectangle([0, 0, s, s], radius=radius, fill=GREEN)
        box = (0, 0, s, s)
        scale = 1.0

    x0, y0, x1, y1 = box
    w = h = (x1 - x0)
    unit = w / 256.0  # desenha no mesmo grid do icon.svg

    def px(vx: float, vy: float) -> tuple[float, float]:
        return (x0 + vx * unit, y0 + vy * unit)

    # gradiente sutil de fundo
    grad = Image.new("RGBA", (s, s), (0, 0, 0, 0))
    gd = ImageDraw.Draw(grad)
    steps = 48
    for i in range(steps):
        t = i / (steps - 1)
        r = int(GREEN[0] + (GREEN_DARK[0] - GREEN[0]) * t)
        g = int(GREEN[1] + (GREEN_DARK[1] - GREEN[1]) * t)
        b = int(GREEN[2] + (GREEN_DARK[2] - GREEN[2]) * t)
        gd.rectangle([0, int(s * i / steps), s, int(s * (i + 1) / steps)], fill=(r, g, b, 255))
    mask = Image.new("L", (s, s), 0)
    ImageDraw.Draw(mask).rounded_rectangle([0, 0, s, s], radius=radius if not maskable else int(s * 0.6), fill=255)
    if maskable:
        mask = Image.new("L", (s, s), 255)
    img = Image.composite(grad, img, mask)
    d = ImageDraw.Draw(img)

    # sacola
    bag_left, bag_top, bag_right, bag_bottom = 61, 105, 195, 197
    d.rounded_rectangle(
        [px(bag_left, bag_top), px(bag_right, bag_bottom)],
        radius=int(10 * unit * scale * SS / SS),
        fill=WHITE,
    )
    # alça da sacola
    d.arc(
        [px(99, 57), px(157, 115)],
        start=180,
        end=360,
        fill=WHITE,
        width=int(17 * unit),
    )
    # visto de confirmação
    d.line(
        [px(105, 151), px(121, 167), px(154, 131)],
        fill=MINT,
        width=int(16 * unit),
        joint="curve",
    )
    d.ellipse([px(113, 159), px(129, 175)], fill=MINT)
    d.ellipse([px(146, 123), px(162, 139)], fill=MINT)

    return img.resize((size, size), Image.LANCZOS)


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    targets = {
        "icon-192.png": (192, False),
        "icon-512.png": (512, False),
        "icon-maskable-512.png": (512, True),
        "apple-touch-icon.png": (180, False),
        "favicon-32.png": (32, False),
    }
    for name, (size, maskable) in targets.items():
        draw_icon(size, maskable).save(OUT / name, "PNG", optimize=True)
        print("gerado", name)

    ico = draw_icon(64)
    ico.save(OUT / "favicon.ico", "ICO", sizes=[(16, 16), (32, 32), (48, 48), (64, 64)])
    print("gerado favicon.ico")


if __name__ == "__main__":
    main()
