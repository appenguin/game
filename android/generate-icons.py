#!/usr/bin/env python3
"""
Generate Android launcher icons from a source image.

Usage:
    python generate-icons.py <source-image> [--foreground-only]

Requires: pip install Pillow

Android icon sizes (dp to px at each density):
    mdpi:    48px (1x)
    hdpi:    72px (1.5x)
    xhdpi:   96px (2x)
    xxhdpi:  144px (3x)
    xxxhdpi: 192px (4x)

For adaptive icons (Android 8+), foreground needs extra padding:
    The visible area is 66% of 108dp, so we generate at 1.5x launcher size
"""

import sys
from pathlib import Path

try:
    from PIL import Image, ImageDraw
except ImportError:
    print("Error: Pillow not installed. Install with:")
    print("  pip install Pillow")
    sys.exit(1)

# Icon sizes for each density
LAUNCHER_SIZES = {
    "mdpi": 48,
    "hdpi": 72,
    "xhdpi": 96,
    "xxhdpi": 144,
    "xxxhdpi": 192,
}

# Foreground sizes (1.5x for adaptive icon safe zone)
FOREGROUND_SIZES = {
    "mdpi": 72,
    "hdpi": 108,
    "xhdpi": 144,
    "xxhdpi": 216,
    "xxxhdpi": 288,
}


def resize_centered(img: Image.Image, size: int) -> Image.Image:
    """Resize image to fit within size, centered on transparent background."""
    # Calculate scale to fit
    scale = min(size / img.width, size / img.height)
    new_width = int(img.width * scale)
    new_height = int(img.height * scale)

    # Resize with high quality
    resized = img.resize((new_width, new_height), Image.Resampling.LANCZOS)

    # Create transparent canvas and paste centered
    canvas = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    x = (size - new_width) // 2
    y = (size - new_height) // 2
    canvas.paste(resized, (x, y), resized if resized.mode == "RGBA" else None)

    return canvas


def make_round(img: Image.Image) -> Image.Image:
    """Apply circular mask to image."""
    size = img.width
    mask = Image.new("L", (size, size), 0)
    draw = ImageDraw.Draw(mask)
    draw.ellipse((0, 0, size - 1, size - 1), fill=255)

    result = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    result.paste(img, (0, 0), mask)
    return result


def generate_foreground(img: Image.Image, size: int) -> Image.Image:
    """Generate adaptive icon foreground with proper safe zone padding."""
    # Icon should be 66% of total size to stay in safe zone
    icon_size = int(size * 0.66)

    # First resize icon to safe zone size
    scale = min(icon_size / img.width, icon_size / img.height)
    new_width = int(img.width * scale)
    new_height = int(img.height * scale)
    resized = img.resize((new_width, new_height), Image.Resampling.LANCZOS)

    # Center on full-size transparent canvas
    canvas = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    x = (size - new_width) // 2
    y = (size - new_height) // 2
    canvas.paste(resized, (x, y), resized if resized.mode == "RGBA" else None)

    return canvas


def main():
    if len(sys.argv) < 2:
        print("Usage: python generate-icons.py <source-image> [--foreground-only]")
        print()
        print("Generates Android launcher icons in all required sizes.")
        print("Source should be at least 512x512 PNG with transparency.")
        print()
        print("Options:")
        print("  --foreground-only  Only generate foreground icons (for adaptive icons)")
        sys.exit(1)

    source_path = Path(sys.argv[1])
    foreground_only = "--foreground-only" in sys.argv

    if not source_path.exists():
        print(f"Error: Source file not found: {source_path}")
        sys.exit(1)

    # Load source image
    try:
        img = Image.open(source_path).convert("RGBA")
    except Exception as e:
        print(f"Error loading image: {e}")
        sys.exit(1)

    print(f"Source image: {source_path} ({img.width}x{img.height})")

    # Find res directory
    res_dir = Path("android/app/src/main/res")
    if not res_dir.exists():
        print(f"Error: Resource directory not found: {res_dir}")
        print("Run this script from the project root (where capacitor.config.json is)")
        sys.exit(1)

    print()
    print("Generating icons...")

    for density in ["mdpi", "hdpi", "xhdpi", "xxhdpi", "xxxhdpi"]:
        mipmap_dir = res_dir / f"mipmap-{density}"
        mipmap_dir.mkdir(parents=True, exist_ok=True)

        if not foreground_only:
            # Standard launcher icon
            size = LAUNCHER_SIZES[density]
            launcher = resize_centered(img, size)
            launcher_path = mipmap_dir / "ic_launcher.png"
            launcher.save(launcher_path, "PNG")
            print(f"  {launcher_path} ({size}x{size})")

            # Round launcher icon
            round_icon = make_round(launcher)
            round_path = mipmap_dir / "ic_launcher_round.png"
            round_icon.save(round_path, "PNG")
            print(f"  {round_path} ({size}x{size} round)")

        # Foreground for adaptive icons
        fg_size = FOREGROUND_SIZES[density]
        foreground = generate_foreground(img, fg_size)
        fg_path = mipmap_dir / "ic_launcher_foreground.png"
        foreground.save(fg_path, "PNG")
        icon_size = int(fg_size * 0.66)
        print(f"  {fg_path} ({fg_size}x{fg_size}, icon {icon_size}x{icon_size})")

    print()
    print(f"Done! Icons generated in {res_dir}/mipmap-*/")
    print()
    print("Note: For adaptive icons, you may also want to update:")
    print(f"  {res_dir}/mipmap-anydpi-v26/ic_launcher.xml")
    print(f"  {res_dir}/mipmap-anydpi-v26/ic_launcher_round.xml")
    print()
    print("To set a solid background color, edit ic_launcher_background in values/")


if __name__ == "__main__":
    main()
