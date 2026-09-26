#!/bin/bash
# Tile PNGs in a directory into one contact sheet. Usage: sheet.sh <dir> <out.png> [cols]
dir=$1; out=$2; cols=${3:-3}
n=$(ls $dir/*.png | wc -l | tr -d ' ')
rows=$(( (n + cols - 1) / cols ))
ffmpeg -loglevel error -y -pattern_type glob -i "$dir/*.png" -vf "scale=640:-1,tile=${cols}x${rows}:padding=6:color=0x444444" -frames:v 1 $out
