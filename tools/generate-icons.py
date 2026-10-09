#!/usr/bin/env python3
"""Gera os ícones do Preço Perto com acabamento 3D (luz, brilho e sombra).

Uso:  python3 tools/generate-icons.py
Saída: icons/icon-192.png, icons/icon-512.png, icons/icon-maskable-512.png,
       icons/apple-touch-icon.png, icons/favicon-32.png, icons/favicon.ico

Dependência: Pillow (pip install Pillow)
"""
from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter

TOP = (34, 205, 147)        # verde claro (topo)
BOTTOM = (4, 96, 68)        # verde profundo (base)
BAG_TOP = (255, 255, 255)
BAG_BOTTOM = (198, 218, 211)
MINT = (110, 240, 190)
SS = 4                      # superamostragem (antialiasing)

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "icons"


def vgradient(size, top, bottom):
    """Gradiente vertical linear."""
    img = Image.new("RGBA", size)
    d = ImageDraw.Draw(img)
    w, h = size
    for y in range(h):
        t = y / max(1, h - 1)
        d.line([(0, y), (w, y)],
               fill=(int(top[0] + (bottom[0] - top[0]) * t),
                     int(top[1] + (bottom[1] - top[1]) * t),
                     int(top[2] + (bottom[2] - top[2]) * t),
                     255))
    return img


def rounded_mask(size, radius, box=None):
    mask = Image.new("L", size, 0)
    if box is None:
        box = [0, 0, size[0] - 1, size[1] - 1]
    ImageDraw.Draw(mask).rounded_rectangle(box, radius=radius, fill=255)
    return mask


def draw_icon(size: int, maskable: bool = False) -> Image.Image:
    s = size * SS
    canvas = Image.new("RGBA", (s, s), (0, 0, 0, 0))

    # Máscara da silhueta: tudo o que for desenhado fica preso dentro dela.
    if maskable:
        silhouette = Image.new("L", (s, s), 255)
        inset = int(s * 0.12)
        radius = int(s * 0.22)
    else:
        silhouette = rounded_mask((s, s), int(s * 0.26))
        inset = 0
        radius = int(s * 0.26)

    inner = s - inset * 2
    unit = inner / 256.0

    def px(vx, vy):
        return (inset + vx * unit, inset + vy * unit)

    def overlay(layer):
        """Aplica uma camada RGBA recortada pela silhueta do ícone."""
        nonlocal canvas
        clipped = Image.composite(layer, Image.new("RGBA", (s, s), (0, 0, 0, 0)), silhouette)
        canvas.alpha_composite(clipped)

    # ---------- 1. base com gradiente ----------
    overlay(vgradient((s, s), TOP, BOTTOM))

    # ---------- 2. brilho superior (gloss) ----------
    gloss = Image.new("RGBA", (s, s), (0, 0, 0, 0))
    gd = ImageDraw.Draw(gloss)
    gd.ellipse([-s * 0.28, -s * 0.60, s * 0.92, s * 0.26], fill=(255, 255, 255, 60))
    gd.ellipse([s * 0.22, -s * 0.34, s * 1.02, s * 0.30], fill=(255, 255, 255, 34))
    overlay(gloss.filter(ImageFilter.GaussianBlur(s * 0.04)))

    # ---------- 3. luz de borda (rim light) ----------
    rim = Image.new("RGBA", (s, s), (0, 0, 0, 0))
    ImageDraw.Draw(rim).rounded_rectangle(
        [inset + s * 0.016, inset + s * 0.016, inset + inner - s * 0.016, inset + inner - s * 0.016],
        radius=radius, outline=(255, 255, 255, 52), width=max(2, int(s * 0.012)))
    overlay(rim.filter(ImageFilter.GaussianBlur(s * 0.004)))

    # ---------- 4. sombra projetada da sacola ----------
    shadow = Image.new("RGBA", (s, s), (0, 0, 0, 0))
    ImageDraw.Draw(shadow).rounded_rectangle(
        [px(56, 116), px(200, 208)], radius=int(16 * unit), fill=(2, 34, 25, 96))
    overlay(shadow.filter(ImageFilter.GaussianBlur(s * 0.024)))

    # ---------- 5. sacola com gradiente 3D ----------
    bx0, by0 = px(61, 105)
    bx1, by1 = px(195, 197)
    bag_mask = rounded_mask((s, s), int(12 * unit), box=[bx0, by0, bx1, by1])
    bag = Image.composite(vgradient((s, s), BAG_TOP, BAG_BOTTOM),
                          Image.new("RGBA", (s, s), (0, 0, 0, 0)), bag_mask)

    # brilho interno no topo da sacola
    sheen = Image.new("RGBA", (s, s), (0, 0, 0, 0))
    ImageDraw.Draw(sheen).rounded_rectangle(
        [bx0 + 6 * unit, by0 + 4 * unit, bx1 - 6 * unit, by0 + 30 * unit],
        radius=int(10 * unit), fill=(255, 255, 255, 130))
    sheen = sheen.filter(ImageFilter.GaussianBlur(s * 0.014))
    bag.alpha_composite(Image.composite(sheen, Image.new("RGBA", (s, s), (0, 0, 0, 0)), bag_mask))
    overlay(bag)

    # contorno claro na sacola
    edge = Image.new("RGBA", (s, s), (0, 0, 0, 0))
    ImageDraw.Draw(edge).rounded_rectangle([bx0, by0, bx1, by1], radius=int(12 * unit),
                                           outline=(255, 255, 255, 160), width=max(2, int(2.4 * unit)))
    overlay(edge)

    # ---------- 6. alça com volume ----------
    handle = Image.new("RGBA", (s, s), (0, 0, 0, 0))
    hd = ImageDraw.Draw(handle)
    hd.arc([px(99, 57), px(157, 115)], start=180, end=360, fill=(178, 205, 198, 255), width=int(20 * unit))
    hd.arc([px(99, 57), px(157, 115)], start=180, end=360, fill=(255, 255, 255, 255), width=int(13 * unit))
    overlay(handle)

    # ---------- 7. visto com glow ----------
    glow = Image.new("RGBA", (s, s), (0, 0, 0, 0))
    ImageDraw.Draw(glow).line([px(105, 151), px(121, 167), px(154, 131)],
                              fill=(*MINT, 130), width=int(26 * unit), joint="curve")
    overlay(glow.filter(ImageFilter.GaussianBlur(s * 0.018)))

    check = Image.new("RGBA", (s, s), (0, 0, 0, 0))
    cd = ImageDraw.Draw(check)
    cd.line([px(105, 151), px(121, 167), px(154, 131)], fill=(*MINT, 255), width=int(15 * unit), joint="curve")
    cd.ellipse([px(112, 159), px(130, 177)], fill=(*MINT, 255))
    cd.ellipse([px(146, 123), px(163, 140)], fill=(*MINT, 255))
    overlay(check)

    return canvas.resize((size, size), Image.LANCZOS)


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

    draw_icon(64).save(OUT / "favicon.ico", "ICO", sizes=[(16, 16), (32, 32), (48, 48), (64, 64)])
    print("gerado favicon.ico")


if __name__ == "__main__":
    main()
