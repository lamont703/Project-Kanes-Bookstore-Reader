#!/bin/bash
# generate-kb-voiceover.sh
# Generates voiceover MP3s for Kane's Bookstore Reader promotional video.
# Uses Microsoft Azure Neural TTS via edge-tts (free, no API key needed).
#
# Voice options for a warm storytelling feel:
#   en-US-AndrewNeural  — warm, confident, authentic (current)
#   en-US-AriaNeural    — positive, confident (female)
#   en-US-JennyNeural   — friendly, considerate
#   en-US-EricNeural    — rational, calm (good for tech)
#
# Usage: bash generate-kb-voiceover.sh [--force]

VOICE="en-US-AndrewNeural"
OUT="public/vo"
FORCE=0
[[ "$1" == "--force" ]] && FORCE=1

mkdir -p "$OUT"

generate() {
  local id="$1"
  local text="$2"
  local out="$OUT/${id}.mp3"

  if [[ -f "$out" && "$FORCE" -eq 0 ]]; then
    echo "  [skip] ${id}.mp3 (use --force to regenerate)"
    return
  fi

  printf "  Generating %s.mp3 ... " "$id"
  local tmp="$OUT/${id}.tmp.mp3"
  edge-tts \
    --voice "$VOICE" \
    --text "$text" \
    --write-media "$tmp" \
    2>/dev/null

  if [[ -f "$tmp" ]]; then
    # Resample to 44100 Hz — Remotion requires 44100 or 48000 Hz (edge-tts outputs 24000 Hz)
    ffmpeg -y -i "$tmp" -ar 44100 -ab 128k "$out" 2>/dev/null
    rm -f "$tmp"
    local dur
    dur=$(ffprobe -v quiet -show_entries format=duration -of csv=p=0 "$out" 2>/dev/null || echo "?")
    echo "done (${dur}s @ 44100Hz)"
  else
    echo "FAILED — is edge-tts installed? pip install edge-tts"
  fi
}

echo "Generating 7 scenes for Kane's Bookstore Reader"
echo "Voice: $VOICE"
echo ""

generate "kb-scene-01-hero" \
  "Welcome to Kane's Bookstore Reader. Your cosmic gateway to great literature — where every story is an adventure among the stars."

generate "kb-scene-02-overview" \
  "Kane's Reader is an immersive digital reading platform. Discover thousands of books with smart search, enjoy a distraction-free reading experience, track your progress, and connect with fellow readers through virtual book clubs."

generate "kb-scene-03-reader" \
  "Our custom-built e-reader puts you in the story. Highlight passages in real time, drop bookmarks, leave notes, and track exactly where you left off — all within a beautiful, focused reading interface designed for deep engagement."

generate "kb-scene-04-bookclubs" \
  "Reading is better together. Join one of our virtual book clubs — Sci-Fi Stargazers, Mystery Nebula, or Fantasy Comets — or create your own and invite your community. Discuss chapters, share insights, and discover your next favorite book with readers who share your passion."

generate "kb-scene-05-dashboard" \
  "Your personal reading dashboard keeps you motivated. See how many books you've finished, track your weekly page count, maintain your reading streak, and celebrate every milestone. Your reading life, beautifully visualized."

generate "kb-scene-06-tech" \
  "Built for performance and reliability. Kane's Reader runs on Next.js 15 with React 19, styled with Tailwind CSS, powered by Supabase for authentication and data, and animated with Framer Motion — giving you a fast, accessible, premium experience on any device."

generate "kb-scene-07-cta" \
  "Start your reading adventure today. Join the Kane's Komets community and discover how good reading can feel. Explore Kane's Bookstore Reader now."

echo ""
echo "All done — files saved to $OUT/"
echo ""
echo "Check durations and update KanesBookstore.tsx scene durationInFrames as needed:"
echo "  formula: Math.ceil(duration * 30) + 45  (30fps + ~1.5s buffer)"
echo ""
for f in "$OUT"/kb-scene-*.mp3; do
  dur=$(ffprobe -v quiet -show_entries format=duration -of csv=p=0 "$f" 2>/dev/null)
  frames=$(echo "$dur" | awk '{printf "%d", ($1 * 30) + 45}')
  echo "  $(basename $f .mp3): ${dur}s → ${frames} frames"
done
