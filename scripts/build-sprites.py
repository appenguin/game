#!/usr/bin/env python3
"""
Build penguin sprite sheet from source images in penguin_images/.

Outputs public/penguin-sheet.png — a horizontal strip of equally-sized frames.

Frame order:
  0 = wings tucked  (sliding default, in-flight tuck)
  1 = wings open    (airborne default)
  (future: 2 = right wing open, 3 = left wing open)

All source images are assumed to be the same canvas size (e.g. 1536x1024).
They're scaled at the same ratio so the penguin body stays consistent across
frames, then cropped and centered in uniform frame cells.

Usage:
  python3 scripts/build-sprites.py
"""

import sys
from pathlib import Path
from PIL import Image

SRC_DIR = Path(__file__).resolve().parent.parent / "penguin_images"
OUT_PATH = Path(__file__).resolve().parent.parent / "public" / "penguin-sheet.png"

# Ordered list of (filename, needs_bg_removal)
# Set needs_bg_removal=True for images with a light grey background instead of alpha
FRAMES = [
    ("sliding_tucked.png", True),
    ("open.png", False),
]

# Target: scale full canvas height (1024) to this many pixels
TARGET_CANVAS_HEIGHT = 60


def remove_light_bg(img: Image.Image) -> Image.Image:
    """Remove light grey background (~240,240,240) from an RGB/RGBA image."""
    img = img.convert("RGBA")
    pixels = img.load()
    w, h = img.size
    for py in range(h):
        for px in range(w):
            r, g, b, a = pixels[px, py]
            if r > 220 and g > 220 and b > 220:
                pixels[px, py] = (r, g, b, 0)
            elif r > 200 and g > 200 and b > 200:
                darkness = min(255 - r, 255 - g, 255 - b)
                fade = min(255, darkness * 5)
                pixels[px, py] = (r, g, b, min(a, fade))
    return img


def build_sheet():
    images = []
    canvas_size = None

    for filename, needs_bg in FRAMES:
        path = SRC_DIR / filename
        if not path.exists():
            print(f"ERROR: {path} not found", file=sys.stderr)
            sys.exit(1)

        img = Image.open(path).convert("RGBA")

        if canvas_size is None:
            canvas_size = img.size
        elif img.size != canvas_size:
            print(f"WARNING: {filename} is {img.size}, expected {canvas_size}. "
                  f"Resizing to match.", file=sys.stderr)
            img = img.resize(canvas_size, Image.LANCZOS)

        if needs_bg:
            img = remove_light_bg(img)

        images.append(img)

    # Scale all from full canvas at same ratio
    scale = TARGET_CANVAS_HEIGHT / canvas_size[1]
    scaled = []
    for img in images:
        sw = int(canvas_size[0] * scale)
        sh = int(canvas_size[1] * scale)
        small = img.resize((sw, sh), Image.LANCZOS)
        bbox = small.getbbox()
        if bbox:
            scaled.append(small.crop(bbox))
        else:
            scaled.append(small)

    # Frame size: fit the largest cropped result + padding
    fw = max(s.size[0] for s in scaled) + 2
    fh = max(s.size[1] for s in scaled) + 2
    fw = (fw + 1) // 2 * 2  # round to even
    fh = (fh + 1) // 2 * 2

    strip = Image.new("RGBA", (fw * len(scaled), fh), (0, 0, 0, 0))
    for i, frame in enumerate(scaled):
        ox = (fw - frame.size[0]) // 2
        oy = (fh - frame.size[1]) // 2
        strip.paste(frame, (i * fw + ox, oy), frame)

    OUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    strip.save(OUT_PATH)
    print(f"Saved {OUT_PATH} ({strip.size[0]}x{strip.size[1]}, "
          f"{len(scaled)} frames @ {fw}x{fh})")


TREE_SRC = SRC_DIR / "trees.png"
TREE_OUT = Path(__file__).resolve().parent.parent / "public" / "tree-sheet.png"
TREE_TARGET_HEIGHT = 48


def build_tree_sheet():
    """Build tree sprite sheet from a 2x2 grid image → horizontal 4-frame strip."""
    if not TREE_SRC.exists():
        print(f"Skipping tree sheet: {TREE_SRC} not found")
        return

    img = Image.open(TREE_SRC).convert("RGBA")
    w, h = img.size
    half_w, half_h = w // 2, h // 2

    quadrants = [
        img.crop((0, 0, half_w, half_h)),
        img.crop((half_w, 0, w, half_h)),
        img.crop((0, half_h, half_w, h)),
        img.crop((half_w, half_h, w, h)),
    ]

    scale = TREE_TARGET_HEIGHT / half_h
    scaled = []
    for quad in quadrants:
        quad = remove_light_bg(quad)
        sw = int(half_w * scale)
        sh = int(half_h * scale)
        small = quad.resize((sw, sh), Image.LANCZOS)
        bbox = small.getbbox()
        if bbox:
            scaled.append(small.crop(bbox))
        else:
            scaled.append(small)

    fw = max(s.size[0] for s in scaled) + 2
    fh = max(s.size[1] for s in scaled) + 2
    fw = (fw + 1) // 2 * 2
    fh = (fh + 1) // 2 * 2

    strip = Image.new("RGBA", (fw * len(scaled), fh), (0, 0, 0, 0))
    for i, frame in enumerate(scaled):
        ox = (fw - frame.size[0]) // 2
        oy = (fh - frame.size[1]) // 2
        strip.paste(frame, (i * fw + ox, oy), frame)

    TREE_OUT.parent.mkdir(parents=True, exist_ok=True)
    strip.save(TREE_OUT)
    print(f"Saved {TREE_OUT} ({strip.size[0]}x{strip.size[1]}, "
          f"{len(scaled)} frames @ {fw}x{fh})")


if __name__ == "__main__":
    build_sheet()
    build_tree_sheet()
