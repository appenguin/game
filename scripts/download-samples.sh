#!/bin/bash
# Download TR-909 drum samples from tidal-drum-machines repo (CC0 license)
# Source: https://github.com/geikha/tidal-drum-machines

set -e

BASE="https://raw.githubusercontent.com/geikha/tidal-drum-machines/main/machines/RolandTR909"
DEST="public/samples"

mkdir -p "$DEST/RolandTR909_bd" "$DEST/RolandTR909_hh" "$DEST/RolandTR909_sd"

echo "Downloading TR-909 samples..."

# Kick drums (4 variations)
for i in 01 02 03 04; do
  curl -sL -o "$DEST/RolandTR909_bd/Bassdrum-$i.wav" "$BASE/rolandtr909-bd/Bassdrum-$i.wav"
  echo "  ✓ Bassdrum-$i.wav"
done

# Hi-hats (4 variations)
for i in 01 02 03 04; do
  curl -sL -o "$DEST/RolandTR909_hh/hh$i.wav" "$BASE/rolandtr909-hh/hh$i.wav"
  echo "  ✓ hh$i.wav"
done

# Snare drums (all 15 variations)
for i in 01 02 03 04 05 06 07 08 09 10 11 12 13 14 15; do
  curl -sL -o "$DEST/RolandTR909_sd/sd$i.wav" "$BASE/rolandtr909-sd/sd$i.wav"
  echo "  ✓ sd$i.wav"
done

echo "Done. Samples saved to $DEST/"
echo "Total: 4 kicks, 4 hi-hats, 15 snares"
