# Remotion Video Template — OnlyCrypto Project
# How to get the absolute most out of this repo

Everything you need to build, customize, and render professional videos
using this Remotion + edge-tts setup.

---

## ⚠️ CRITICAL — Audio Sample Rate (Read Before Generating VO)

**`edge-tts` outputs MP3s at 24,000 Hz. Remotion silently drops any audio
below 44,100 Hz, producing renders with no sound.**

Always resample immediately after generating with edge-tts:

```bash
ffmpeg -y -i raw.mp3 -ar 44100 -ab 128k output.mp3
```

Verify before rendering:
```bash
ffprobe -v error -show_entries stream=sample_rate -of csv=p=0 public/vo/file.mp3
# Must return 44100 or 48000 — if it says 24000, resample it
```

The `generate-kb-voiceover.sh` script handles this automatically.
If you write a new generator script, include the ffmpeg resample step.

---

## Quick Start

```bash
cd /home/lpch/doc-ai/ONLYCRYPTO/video

# 1. Preview in browser (live scrubbing, no render needed)
npm run dev

# 2. Render final MP4
npm run render        # → out/onlycrypto.mp4

# 3. Regenerate voice (if you change scripts)
bash generate-voiceover.sh --force
```

---

## Voice Options (Microsoft Azure Neural — Free, No API Key)

All voices are broadcast quality. Change `VOICE=` in `generate-voiceover.sh` then run `--force`.

### Best for Promos / Finance / Crypto

| Voice                     | Gender | Style                           | Best for              |
|---------------------------|--------|---------------------------------|-----------------------|
| `en-US-BrianNeural` ✅   | Male   | Approachable, Casual, Sincere   | Current voice         |
| `en-US-ChristopherNeural` | Male   | Reliable, Authority             | Corporate / Trust     |
| `en-US-GuyNeural`         | Male   | Passionate newsreader           | Hype / Announcement   |
| `en-US-RogerNeural`       | Male   | Lively, Energetic               | Upbeat promo          |
| `en-US-EricNeural`        | Male   | Rational, Calm                  | Explainer / Tutorial  |
| `en-US-AndrewNeural`      | Male   | Warm, Confident, Authentic      | Storytelling          |
| `en-US-AriaNeural`        | Female | Positive, Confident             | News-style            |
| `en-US-AvaNeural`         | Female | Expressive, Caring, Friendly    | Conversational        |
| `en-US-JennyNeural`       | Female | Friendly, Considerate           | General purpose       |

### List All 400+ Voices (any language)
```bash
edge-tts --list-voices
edge-tts --list-voices | grep en-US     # English US only
edge-tts --list-voices | grep es-       # Spanish
edge-tts --list-voices | grep fr-       # French
```

### Preview a Voice Before Committing
```bash
edge-tts --voice en-US-ChristopherNeural \
  --text "OnlyCrypto — build your future in crypto." \
  --write-media /tmp/preview.mp3 && mpg123 /tmp/preview.mp3
# or open /tmp/preview.mp3 in any audio player
```

### Change the Voice
```bash
# In generate-voiceover.sh, line 1:
VOICE="en-US-ChristopherNeural"

# Regenerate all
bash generate-voiceover.sh --force
```

---

## What the Skills Repo Unlocks (Remotion Capability Map)

The cloned repo at `../remotion-skills/skills/remotion/rules/` contains
pattern guides for every major Remotion feature. Reference them when building.

### Animation & Timing
| File               | What it gives you                                              |
|--------------------|----------------------------------------------------------------|
| `animations.md`    | Core hook usage — `useCurrentFrame`, `interpolate`            |
| `timing.md`        | Spring, easing, bezier curves — natural motion recipes         |
| `sequencing.md`    | `<Sequence>`, `<Series>` — stagger, delay, trim               |
| `transitions.md`   | `TransitionSeries` — fade, slide, wipe, flip, clock-wipe      |
| `trimming.md`      | Cut start/end of any animation cleanly                         |

### Media
| File                    | What it gives you                                         |
|-------------------------|-----------------------------------------------------------|
| `audio.md`              | `<Audio>` — volume ramps, loops, trimming, pitch shift    |
| `audio-visualization.md`| Spectrum bars, waveforms, bass-reactive effects           |
| `videos.md`             | `<Video>` — embed, trim, loop, speed, mute                |
| `images.md`             | `<Img>` — safe image loading                              |
| `gifs.md`               | Animated GIFs synced to timeline                          |
| `lottie.md`             | JSON Lottie animations embedded in video                  |
| `assets.md`             | `staticFile()` — the right way to reference public/       |

### Text & Typography
| File                 | What it gives you                                            |
|----------------------|--------------------------------------------------------------|
| `text-animations.md` | Typewriter, word reveal, character stagger, highlight        |
| `fonts.md`           | Google Fonts + local fonts loaded at render time             |
| `measuring-text.md`  | Auto-fit text to container, detect overflow                  |
| `subtitles.md`       | Captions with word-level timing from JSON                    |
| `display-captions.md`| TikTok-style animated captions                               |
| `import-srt-captions.md` | Import .srt files and display them                       |
| `transcribe-captions.md` | Whisper-based transcription → captions                   |

### Data & Charts
| File         | What it gives you                                                |
|--------------|------------------------------------------------------------------|
| `charts.md`  | Bar, pie, line, stock charts — all SVG, all frame-animated       |

### Advanced
| File                    | What it gives you                                         |
|-------------------------|-----------------------------------------------------------|
| `3d.md`                 | Three.js + React Three Fiber inside video frames          |
| `maps.md`               | Mapbox animated map flyovers                              |
| `light-leaks.md`        | Cinematic light leak overlays between scenes              |
| `parameters.md`         | Zod schema — make videos data-driven / parametrizable     |
| `calculate-metadata.md` | Set duration dynamically (match audio length, data, etc.) |
| `transparent-videos.md` | Export with alpha channel (WebM/ProRes)                   |
| `voiceover.md`          | ElevenLabs TTS integration pattern                        |

---

## Adding a New Scene — Checklist

```tsx
// 1. Create your scene component
export const SceneMyNew: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();

  return (
    <AbsoluteFill>
      <AnimatedBg />
      {/* your content */}
      <Audio src={staticFile('vo/scene-XX-myname.mp3')} volume={1} />
    </AbsoluteFill>
  );
};

// 2. Add to OnlyCryptoVideo in OnlyCrypto.tsx
<TransitionSeries.Sequence durationInFrames={360}>
  <SceneMyNew />
</TransitionSeries.Sequence>
<TransitionSeries.Transition
  presentation={fade()}
  timing={linearTiming({durationInFrames: 20})}
/>

// 3. Update ONLYCRYPTO_DURATION in Root.tsx
//    Add new scene frames, subtract transition frames

// 4. Add VO script to generate-voiceover.sh
generate "scene-XX-myname" \
  "Your voiceover script here."

// 5. Regenerate VO and check duration
bash generate-voiceover.sh
ffprobe -v quiet -show_entries format=duration -of csv=p=0 public/vo/scene-XX-myname.mp3
```

---

## Transition Types (from transitions.md)

```tsx
import {fade}      from '@remotion/transitions/fade';
import {slide}     from '@remotion/transitions/slide';
import {wipe}      from '@remotion/transitions/wipe';
import {flip}      from '@remotion/transitions/flip';
import {clockWipe} from '@remotion/transitions/clock-wipe';

// Timing options
linearTiming({durationInFrames: 20})          // constant speed
springTiming({config: {damping: 200}})         // organic, settles smoothly
springTiming({config: {damping: 8}})           // bouncy

// Slide directions
slide({direction: 'from-right'})
slide({direction: 'from-left'})
slide({direction: 'from-top'})
slide({direction: 'from-bottom'})
```

---

## Animation Recipes (from timing.md)

```tsx
const frame = useCurrentFrame();
const {fps} = useVideoConfig();

// ── Fade in ──
const opacity = interpolate(frame, [0, fps * 0.5], [0, 1], {
  extrapolateLeft: 'clamp', extrapolateRight: 'clamp'
});

// ── Slide up ──
const y = interpolate(frame, [fps * 0.3, fps * 0.8], [40, 0], {
  extrapolateLeft: 'clamp', extrapolateRight: 'clamp'
});

// ── Spring pop-in (snappy, no bounce) ──
const scale = spring({frame, fps, config: {damping: 200}});

// ── Spring pop-in (bouncy) ──
const scale = spring({frame, fps, config: {damping: 8}});

// ── Delayed spring ──
const scale = spring({frame: frame - fps * 0.5, fps, config: {damping: 14}});

// ── Looping pulse ──
const pulse = interpolate(
  frame % (fps * 1.5),
  [0, fps * 0.75, fps * 1.5],
  [0.8, 1, 0.8],
  {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'}
);

// ── Counter / number roll-up ──
const value = Math.round(
  interpolate(frame, [fps * 1, fps * 4], [0, 10000], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp'
  })
);
```

---

## Audio Recipes (from audio.md)

```tsx
// Basic voiceover
<Audio src={staticFile('vo/scene-01.mp3')} volume={1} />

// Fade in over 1 second
<Audio
  src={staticFile('music/bg.mp3')}
  volume={(f) => interpolate(f, [0, fps], [0, 0.3], {extrapolateRight: 'clamp'})}
  loop
/>

// Fade out at end of scene
<Audio
  src={staticFile('music/bg.mp3')}
  volume={(f) =>
    interpolate(f, [durationInFrames - fps * 2, durationInFrames], [0.3, 0], {
      extrapolateLeft: 'clamp', extrapolateRight: 'clamp'
    })
  }
  loop
/>

// Background music under voiceover (ducked to 20%)
<Audio src={staticFile('music/bg.mp3')} volume={0.2} loop />
<Audio src={staticFile('vo/scene-01.mp3')} volume={1} />
```

---

## Render Commands

```bash
# Render full video (MP4, H.264)
npx remotion render OnlyCrypto out/onlycrypto.mp4

# Render specific frame range (for testing a scene)
npx remotion render OnlyCrypto out/test.mp4 --frames=0-90

# Render at lower quality for fast preview
npx remotion render OnlyCrypto out/preview.mp4 --scale=0.5

# Render transparent video (WebM, for overlays)
npx remotion render OnlyCrypto out/onlycrypto.webm --codec=vp8

# Render a single still image (frame 0)
npx remotion still OnlyCrypto out/thumbnail.png --frame=0

# Render with parallelism (faster on multi-core)
npx remotion render OnlyCrypto out/onlycrypto.mp4 --concurrency=4
```

---

## File Structure

```
video/
├── src/
│   ├── index.ts          # Remotion entry — registerRoot()
│   ├── Root.tsx          # Composition registry + frame count
│   └── OnlyCrypto.tsx    # All scenes + master composition
│
├── public/
│   ├── vo/               # Voiceover MP3s (generated by script)
│   │   ├── scene-01-hero.mp3
│   │   └── ...
│   ├── music/            # Background music (add your own MP3s here)
│   └── images/           # Static images → use staticFile('images/x.png')
│
├── generate-voiceover.sh # edge-tts VO generator (change VOICE= here)
├── out/                  # Rendered output (created on first render)
├── package.json
└── TEMPLATE.md           # This file
```

---

## Adding Background Music

1. Drop an MP3 into `public/music/`
2. Add to the master `OnlyCryptoVideo` component (outside `TransitionSeries`):

```tsx
export const OnlyCryptoVideo: React.FC = () => {
  const {durationInFrames, fps} = useVideoConfig();
  return (
    <>
      {/* Background music — looped, ducked to 20%, fades out last 2s */}
      <Audio
        src={staticFile('music/bg.mp3')}
        loop
        volume={(f) =>
          interpolate(
            f,
            [0, fps, durationInFrames - fps * 2, durationInFrames],
            [0, 0.2, 0.2, 0],
            {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'}
          )
        }
      />
      <TransitionSeries>
        {/* scenes */}
      </TransitionSeries>
    </>
  );
};
```

Free royalty-free music sources:
- pixabay.com/music (search: "corporate", "upbeat", "technology")
- freemusicarchive.org
- incompetech.com (Kevin MacLeod)

---

## Adding Captions / Subtitles Under the Voice

Generate a word-timed caption file, then display it on every scene.

```bash
# 1. Concatenate all VO files
cat public/vo/*.mp3 > /tmp/full_vo.mp3

# 2. Transcribe with OpenAI Whisper (free, local)
pip3 install openai-whisper --break-system-packages
whisper /tmp/full_vo.mp3 --output_format srt --output_dir public/captions/
```

Then in Remotion, import the SRT and display word-highlighted captions
(see `../remotion-skills/skills/remotion/rules/display-captions.md`).

---

## Making Videos Data-Driven (Parametrizable)

Use a Zod schema so the same template renders different content:

```tsx
import {z} from 'zod';

export const schema = z.object({
  companyName: z.string().default('OnlyCrypto'),
  primaryColor: z.string().default('#F5B800'),
  tier1Price: z.number().default(99),
  tier2Price: z.number().default(249),
  voiceScript: z.string().optional(),
});

// In Root.tsx:
<Composition
  id="OnlyCrypto"
  component={OnlyCryptoVideo}
  schema={schema}
  defaultProps={{companyName: 'OnlyCrypto', primaryColor: '#F5B800', tier1Price: 99, tier2Price: 249}}
  durationInFrames={ONLYCRYPTO_DURATION}
  fps={30}
  width={1920}
  height={1080}
/>
```

See `../remotion-skills/skills/remotion/rules/parameters.md` for full pattern.

---

## Tips for Getting the Most Out of This Setup

1. **Always match scene `durationInFrames` to VO length**
   Run `ffprobe -v quiet -show_entries format=duration -of csv=p=0 public/vo/scene-XX.mp3`
   then set frames = `Math.ceil(duration * 30) + 45` (1.5s buffer)

2. **Use `npm run dev` for fast iteration** — Remotion Studio lets you scrub
   frame-by-frame in the browser without re-rendering

3. **Stagger animations at 0.15–0.3s intervals** — tighter feels cheap,
   wider feels sluggish

4. **Spring `damping: 200` for UI elements, `damping: 12–14` for hero elements**
   that need that satisfying bounce

5. **Layer two `<Audio>` tags** — one for VO at `volume={1}`, one for music
   at `volume={0.15-0.25}`. They mix automatically.

6. **Use `<Sequence layout="none">` when you don't want AbsoluteFill wrapping**
   — e.g. for overlay elements that need to stay in document flow

7. **Test renders with `--frames=0-90`** to check just the first 3 seconds
   before committing to a full render

8. **The SVG viewBox trick** — set `viewBox="0 0 1920 1080"` on your SVG
   and use pixel coordinates freely. Remotion handles the scaling.

9. **`extrapolateLeft: 'clamp', extrapolateRight: 'clamp'`** — always add
   these to `interpolate()` unless you explicitly want values outside the range

10. **To add a new voice language**, just change the `--voice` flag:
    `edge-tts --list-voices | grep es-` for Spanish, etc.
