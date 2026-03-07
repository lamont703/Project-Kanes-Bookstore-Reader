# Kane's Bookstore Reader — Promotional Video

A pair of animated promotional videos built with [Remotion](https://remotion.dev).

---

## Videos

### 1. Kane's Bookstore Reader (primary) ⭐
An ~80-second cinematic promo for the Kane's Komets reading platform.

| # | Scene | Duration | Description |
|---|-------|----------|-------------|
| 1 | **Hero / Logo** | 8s | Cosmic badge reveal with orbit rings and brand tagline |
| 2 | **Platform Overview** | 11s | 4 core feature cards with staggered slide-in animation |
| 3 | **E-Reader Showcase** | 13s | Animated mock reader window + feature callout badges |
| 4 | **Book Clubs** | 14s | Orbiting member avatars + 3 club cards |
| 5 | **Dashboard & Stats** | 13s | Animated stat cards + weekly reading bar chart |
| 6 | **Tech Stack & Admin** | 13s | Tech grid cards + admin suite checklist |
| 7 | **Call To Action** | 12s | Logo reveal + pulsing CTA button + floating book particles |

**Total**: ~80 seconds · 1920×1080 · 30fps

### 2. OnlyCrypto (legacy)
See original README content — 7 scenes, ~92 seconds.

---

## Setup

```bash
cd video
npm install
```

## Preview

```bash
npm run dev
# Opens Remotion Studio at http://localhost:3000
# Select "KanesBookstore" from the composition dropdown
```

## Generate Voiceovers

```bash
# Requires: pip install edge-tts
bash generate-kb-voiceover.sh

# Force-regenerate all (e.g. after script changes)
bash generate-kb-voiceover.sh --force
```

## Render to MP4

```bash
# Kane's Bookstore video
npx remotion render KanesBookstore out/kanes-bookstore.mp4

# Quick test — first 3 seconds only
npx remotion render KanesBookstore out/test.mp4 --frames=0-90

# Lower quality fast preview
npx remotion render KanesBookstore out/preview.mp4 --scale=0.5

# With parallelism (faster on multi-core)
npx remotion render KanesBookstore out/kanes-bookstore.mp4 --concurrency=4
```

## Structure

```
video/
├── src/
│   ├── index.ts               # Remotion entry point — registerRoot()
│   ├── Root.tsx               # Composition registry (both videos)
│   ├── KanesBookstore.tsx     # Kane's Reader — all 7 scenes ⭐
│   └── OnlyCrypto.tsx         # Legacy OnlyCrypto video
│
├── public/
│   └── vo/
│       ├── kb-scene-01-hero.mp3
│       ├── kb-scene-02-overview.mp3
│       ├── kb-scene-03-reader.mp3
│       ├── kb-scene-04-bookclubs.mp3
│       ├── kb-scene-05-dashboard.mp3
│       ├── kb-scene-06-tech.mp3
│       └── kb-scene-07-cta.mp3
│
├── generate-kb-voiceover.sh   # Kane's VO generator
├── generate-voiceover.sh      # OnlyCrypto VO generator
└── out/                       # Rendered output
```

## Brand Colors

| Token | Hex | Usage |
|-------|-----|-------|
| Cosmic Purple | `#6B21A8` | Nebula gradients, orbit rings |
| Nebula Blue | `#1E40AF` | Background accents |
| Star Gold | `#F59E0B` | Primary brand, CTAs, highlights |
| Comet Teal | `#0D9488` | Secondary accent, progress bars |
| Void | `#050508` | Near-black background |
| Glow Pink | `#DB2777` | Tertiary accent |
| Green Check | `#10B981` | Success states, admin checkmarks |

## Voice Options

The Kane's video uses `en-US-AndrewNeural` — warm, confident, authentic storytelling voice.

```bash
# Preview a voice
edge-tts --voice en-US-AndrewNeural \
  --text "Welcome to Kane's Bookstore Reader." \
  --write-media /tmp/preview.mp3 && mpg123 /tmp/preview.mp3

# Try others
# en-US-AriaNeural   — positive, confident (female)
# en-US-EricNeural   — calm, authoritative
# en-US-BrianNeural  — deep, warm, professional
```
