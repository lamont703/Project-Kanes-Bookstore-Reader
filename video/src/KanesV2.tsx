/**
 * Kane's Bookstore Reader — V2 Cinematic Edit
 *
 * Completely original design. No card-slide patterns from OnlyCrypto.
 * Visual language: full-bleed typography, ink-wash reveals, split panels,
 * morphing shapes, typewriter text, social proof wall, and a
 * "page-turn" inspired layout language.
 *
 * 6 scenes + master composition.
 */

import {
  AbsoluteFill,
  Audio,
  interpolate,
  Sequence,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import {TransitionSeries, linearTiming, springTiming} from '@remotion/transitions';
import {fade} from '@remotion/transitions/fade';
import {wipe} from '@remotion/transitions/wipe';
import {slide} from '@remotion/transitions/slide';

// ─── Palette ──────────────────────────────────────────────────────────────────
const INK        = '#0C0A14';   // near-black ink
const PARCHMENT  = '#F5F0E8';   // warm off-white
const AMBER      = '#D97706';   // rich amber
const EMBER      = '#DC2626';   // ember red-orange
const SAGE       = '#16A34A';   // deep sage green
const SKY        = '#0EA5E9';   // sky blue
const CHALK      = '#E2DDD6';   // soft chalk
const DIM        = '#6B7280';   // muted text

// ─── Utility: clamp interpolate ────────────────────────────────────────────
const ci = (
  frame: number,
  [f0, f1]: [number, number],
  [v0, v1]: [number, number],
) =>
  interpolate(frame, [f0, f1], [v0, v1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

// ─── Typewriter hook ──────────────────────────────────────────────────────────
const useTypewriter = (text: string, startFrame: number, fps: number, cps = 28) => {
  const frame = useCurrentFrame();
  const chars = Math.floor(ci(frame, [startFrame, startFrame + (text.length / cps) * fps], [0, text.length]));
  return text.slice(0, chars);
};

// ─── Ink Wash Background ──────────────────────────────────────────────────────
// Dark textured bg with subtle noise via SVG filter
const InkBg: React.FC<{tint?: string}> = ({tint = INK}) => {
  const frame = useCurrentFrame();
  const shift = ci(frame, [0, 300], [0, 8]);
  return (
    <AbsoluteFill style={{background: tint, overflow: 'hidden'}}>
      {/* grain texture via SVG turbulence */}
      <svg width="100%" height="100%" style={{position: 'absolute', opacity: 0.035}}>
        <filter id="grain">
          <feTurbulence type="fractalNoise" baseFrequency="0.72" numOctaves="4" seed="2" />
          <feColorMatrix type="saturate" values="0" />
        </filter>
        <rect width="100%" height="100%" filter="url(#grain)" />
      </svg>
      {/* slow ink bleed radial */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: `radial-gradient(ellipse at ${48 + shift}% ${52 - shift * 0.5}%, ${tint === INK ? '#1C1530' : '#FFF8F0'} 0%, transparent 65%)`,
        }}
      />
    </AbsoluteFill>
  );
};

// ─── Horizontal rule that draws itself ───────────────────────────────────────
const DrawRule: React.FC<{startFrame: number; color?: string; width?: number}> = ({
  startFrame,
  color = AMBER,
  width = 800,
}) => {
  const frame = useCurrentFrame();
  const w = ci(frame, [startFrame, startFrame + 30], [0, width]);
  return (
    <div
      style={{
        width: w,
        height: 2,
        background: color,
        borderRadius: 1,
      }}
    />
  );
};

// ─── Big chapter number (decorative) ─────────────────────────────────────────
const ChapterNum: React.FC<{n: string; delay: number}> = ({n, delay}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const op = ci(frame, [delay, delay + fps * 0.6], [0, 0.08]);
  const y  = ci(frame, [delay, delay + fps * 0.8], [60, 0]);
  return (
    <div
      style={{
        position: 'absolute',
        right: 80,
        top: '50%',
        transform: `translateY(calc(-50% + ${y}px))`,
        fontSize: 480,
        fontWeight: 900,
        fontFamily: 'Georgia, serif',
        color: PARCHMENT,
        opacity: op,
        lineHeight: 1,
        userSelect: 'none',
        pointerEvents: 'none',
      }}
    >
      {n}
    </div>
  );
};

// ══════════════════════════════════════════════════════════════════════════════
// SCENE 1 — COLD OPEN: black screen, single line typewriter, logo stamp
// "A story begins with a single page."
// ══════════════════════════════════════════════════════════════════════════════
export const SceneColdOpen: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();

  const line1 = useTypewriter('A story begins with a single page.', fps * 0.8, fps, 24);
  const line1Op = ci(frame, [fps * 0.6, fps * 0.9], [0, 1]);

  // Logo stamp springs in after typewriter finishes
  const stampDelay = fps * 2.8;
  const stampScale = spring({frame: frame - stampDelay, fps, config: {damping: 8, stiffness: 120}});
  const stampOp = ci(frame, [stampDelay, stampDelay + fps * 0.3], [0, 1]);

  // Subtitle fades under stamp
  const subOp = ci(frame, [stampDelay + fps * 0.6, stampDelay + fps * 1.1], [0, 1]);
  const subY  = ci(frame, [stampDelay + fps * 0.6, stampDelay + fps * 1.1], [20, 0]);

  // Amber underline draws after subtitle
  const ruleStart = stampDelay + fps * 1.2;

  return (
    <AbsoluteFill style={{alignItems: 'center', justifyContent: 'center'}}>
      <InkBg />

      {/* Typewriter quote */}
      <div
        style={{
          position: 'absolute',
          top: '30%',
          left: 0,
          right: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 4,
          opacity: line1Op,
        }}
      >
        <div
          style={{
            fontSize: 28,
            color: DIM,
            fontFamily: 'Georgia, serif',
            fontStyle: 'italic',
            letterSpacing: '1px',
          }}
        >
          {line1}
          {/* blinking cursor */}
          <span
            style={{
              opacity: Math.floor(frame / 12) % 2 === 0 ? 1 : 0,
              color: AMBER,
            }}
          >
            |
          </span>
        </div>
      </div>

      {/* Logo stamp */}
      <div
        style={{
          opacity: stampOp,
          transform: `scale(${stampScale})`,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 16,
          marginTop: 40,
        }}
      >
        {/* Hexagonal stamp shape */}
        <svg width="160" height="160" viewBox="0 0 160 160">
          <polygon
            points="80,8 148,46 148,114 80,152 12,114 12,46"
            fill="none"
            stroke={AMBER}
            strokeWidth="3"
          />
          <polygon
            points="80,22 134,52 134,108 80,138 26,108 26,52"
            fill={`${AMBER}18`}
          />
          {/* Open book icon */}
          <path
            d="M55 68 Q80 58 80 68 L80 98 Q80 88 55 98 Z"
            fill="none"
            stroke={AMBER}
            strokeWidth="2.5"
          />
          <path
            d="M105 68 Q80 58 80 68 L80 98 Q80 88 105 98 Z"
            fill="none"
            stroke={AMBER}
            strokeWidth="2.5"
          />
          {/* spine */}
          <line x1="80" y1="68" x2="80" y2="98" stroke={AMBER} strokeWidth="2" />
          {/* comet above book */}
          <circle cx="80" cy="44" r="5" fill={AMBER} />
          <line x1="80" y1="49" x2="76" y2="57" stroke={AMBER} strokeWidth="1.5" opacity="0.5" />
          <line x1="80" y1="49" x2="84" y2="57" stroke={AMBER} strokeWidth="1.5" opacity="0.3" />
        </svg>

        {/* Brand name */}
        <div
          style={{
            fontFamily: 'Georgia, serif',
            fontSize: 52,
            fontWeight: 700,
            color: PARCHMENT,
            letterSpacing: '-1px',
            lineHeight: 1,
          }}
        >
          Kane's
        </div>

        <div
          style={{
            opacity: subOp,
            transform: `translateY(${subY}px)`,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 12,
          }}
        >
          <div
            style={{
              fontSize: 22,
              fontFamily: 'sans-serif',
              fontWeight: 300,
              color: CHALK,
              letterSpacing: '8px',
              textTransform: 'uppercase' as const,
            }}
          >
            Bookstore Reader
          </div>
          <DrawRule startFrame={ruleStart} color={AMBER} width={320} />
          <div
            style={{
              fontSize: 14,
              fontFamily: 'sans-serif',
              color: DIM,
              letterSpacing: '4px',
              textTransform: 'uppercase' as const,
              marginTop: 4,
            }}
          >
            Read More. Live More.
          </div>
        </div>
      </div>

      <Audio src={staticFile('vo/kb-scene-01-hero.mp3')} volume={1} />
    </AbsoluteFill>
  );
};

// ══════════════════════════════════════════════════════════════════════════════
// SCENE 2 — SPLIT PANEL: left = dark ink, right = parchment
// Left side: feature list builds top-to-bottom
// Right side: animated "open book" illustration
// ══════════════════════════════════════════════════════════════════════════════
export const SceneSplitFeatures: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();

  const features = [
    {num: '01', text: 'Custom-built browser e-reader', sub: 'No app download needed'},
    {num: '02', text: 'Smart discovery engine',        sub: 'Find your next obsession'},
    {num: '03', text: 'Virtual book clubs',            sub: 'Read together, anywhere'},
    {num: '04', text: 'Personal reading dashboard',    sub: 'Track every page'},
  ];

  // Divider line sweeps down
  const dividerH = ci(frame, [0, fps * 0.7], [0, 1080]);

  // Right panel (parchment) reveals via horizontal wipe
  const rightReveal = ci(frame, [fps * 0.3, fps * 0.9], [0, 960]);

  // Page illustration: two "pages" open like a book
  const pageOpen = spring({frame: frame - fps * 0.5, fps, config: {damping: 18}});
  const pageAngle = interpolate(pageOpen, [0, 1], [90, 0]);

  return (
    <AbsoluteFill>
      {/* Left — ink panel */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          width: 960,
          height: 1080,
          background: INK,
          overflow: 'hidden',
        }}
      >
        <InkBg />
        <ChapterNum n="1" delay={fps * 0.2} />

        <div
          style={{
            position: 'absolute',
            left: 80,
            top: 120,
            right: 40,
          }}
        >
          {/* Section label */}
          <div
            style={{
              fontSize: 12,
              letterSpacing: '5px',
              color: AMBER,
              fontFamily: 'sans-serif',
              textTransform: 'uppercase' as const,
              opacity: ci(frame, [0, fps * 0.4], [0, 1]),
              marginBottom: 20,
            }}
          >
            What's Inside
          </div>

          {features.map((f, i) => {
            const delay = fps * (0.4 + i * 0.28);
            const op  = ci(frame, [delay, delay + fps * 0.4], [0, 1]);
            const x   = ci(frame, [delay, delay + fps * 0.5], [-40, 0]);
            return (
              <div
                key={i}
                style={{
                  opacity: op,
                  transform: `translateX(${x}px)`,
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 24,
                  marginBottom: 52,
                  borderBottom: `1px solid rgba(255,255,255,0.06)`,
                  paddingBottom: 40,
                }}
              >
                {/* Number */}
                <div
                  style={{
                    fontSize: 13,
                    fontFamily: 'monospace',
                    color: AMBER,
                    opacity: 0.7,
                    paddingTop: 8,
                    flexShrink: 0,
                  }}
                >
                  {f.num}
                </div>
                <div>
                  <div
                    style={{
                      fontSize: 34,
                      fontWeight: 700,
                      fontFamily: 'Georgia, serif',
                      color: PARCHMENT,
                      lineHeight: 1.2,
                    }}
                  >
                    {f.text}
                  </div>
                  <div
                    style={{
                      fontSize: 16,
                      color: DIM,
                      fontFamily: 'sans-serif',
                      marginTop: 6,
                    }}
                  >
                    {f.sub}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Center divider */}
      <div
        style={{
          position: 'absolute',
          left: 959,
          top: 0,
          width: 2,
          height: dividerH,
          background: AMBER,
        }}
      />

      {/* Right — parchment panel */}
      <div
        style={{
          position: 'absolute',
          left: 960,
          top: 0,
          width: rightReveal,
          height: 1080,
          background: PARCHMENT,
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {/* Decorative open book illustration */}
        <div style={{position: 'relative', width: 520, height: 440}}>
          {/* Book shadow */}
          <div
            style={{
              position: 'absolute',
              bottom: 0,
              left: '50%',
              transform: 'translateX(-50%)',
              width: 420,
              height: 20,
              borderRadius: '50%',
              background: 'rgba(0,0,0,0.12)',
              filter: 'blur(12px)',
            }}
          />

          {/* Left page */}
          <div
            style={{
              position: 'absolute',
              left: 0,
              top: 20,
              width: 240,
              height: 380,
              background: '#FFFDF8',
              borderRadius: '4px 0 0 4px',
              boxShadow: '-4px 4px 20px rgba(0,0,0,0.12)',
              overflow: 'hidden',
              transformOrigin: 'right center',
              transform: `perspective(600px) rotateY(${-pageAngle * 0.3}deg)`,
              display: 'flex',
              flexDirection: 'column',
              padding: '32px 28px',
              gap: 10,
            }}
          >
            {/* Page lines */}
            <div style={{height: 3, background: INK, opacity: 0.7, borderRadius: 1, width: '80%'}} />
            {[1,0.9,1,0.85,0.95,0.9,0.7,0.88,0.95,0.75,0.9,0.85].map((w, i) => (
              <div
                key={i}
                style={{
                  height: 2,
                  background: `rgba(${i === 3 ? '217,119,6' : '12,10,20'},${i === 3 ? 0.6 : 0.15})`,
                  borderRadius: 1,
                  width: `${w * 100}%`,
                  boxShadow: i === 3 ? `0 0 6px ${AMBER}55` : 'none',
                }}
              />
            ))}
            {/* Page number */}
            <div
              style={{
                position: 'absolute',
                bottom: 16,
                left: 0,
                right: 0,
                textAlign: 'center' as const,
                fontSize: 12,
                color: DIM,
                fontFamily: 'Georgia, serif',
              }}
            >
              62
            </div>
          </div>

          {/* Spine */}
          <div
            style={{
              position: 'absolute',
              left: 238,
              top: 20,
              width: 6,
              height: 380,
              background: `linear-gradient(90deg, #C8B89A, #E8D8C0, #C8B89A)`,
              boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
            }}
          />

          {/* Right page */}
          <div
            style={{
              position: 'absolute',
              right: 0,
              top: 20,
              width: 240,
              height: 380,
              background: '#FFFDF8',
              borderRadius: '0 4px 4px 0',
              boxShadow: '4px 4px 20px rgba(0,0,0,0.12)',
              overflow: 'hidden',
              transformOrigin: 'left center',
              transform: `perspective(600px) rotateY(${pageAngle * 0.3}deg)`,
              display: 'flex',
              flexDirection: 'column',
              padding: '32px 28px',
              gap: 10,
            }}
          >
            {[1,0.95,0.88,1,0.92,0.85,0.95,0.78,0.9,0.85,0.95,0.8].map((w, i) => (
              <div
                key={i}
                style={{
                  height: 2,
                  background: 'rgba(12,10,20,0.15)',
                  borderRadius: 1,
                  width: `${w * 100}%`,
                }}
              />
            ))}
            <div
              style={{
                position: 'absolute',
                bottom: 16,
                left: 0,
                right: 0,
                textAlign: 'center' as const,
                fontSize: 12,
                color: DIM,
                fontFamily: 'Georgia, serif',
              }}
            >
              63
            </div>
          </div>

          {/* Reading progress arc */}
          <svg
            width="100"
            height="100"
            viewBox="0 0 100 100"
            style={{position: 'absolute', bottom: 30, right: 30}}
          >
            <circle cx="50" cy="50" r="40" fill="none" stroke={`${AMBER}33`} strokeWidth="6" />
            <circle
              cx="50" cy="50" r="40"
              fill="none"
              stroke={AMBER}
              strokeWidth="6"
              strokeLinecap="round"
              strokeDasharray={`${251.2 * interpolate(pageOpen, [0, 1], [0, 0.62])} 251.2`}
              transform="rotate(-90 50 50)"
            />
            <text x="50" y="54" textAnchor="middle" fontSize="16" fontWeight="700" fontFamily="sans-serif" fill={INK}>
              62%
            </text>
          </svg>

          {/* Bookmark ribbon */}
          <div
            style={{
              position: 'absolute',
              top: 0,
              right: 70,
              width: 24,
              height: 80,
              background: EMBER,
              clipPath: 'polygon(0 0, 100% 0, 100% 85%, 50% 100%, 0 85%)',
              opacity: ci(frame, [fps * 1.2, fps * 1.6], [0, 1]),
            }}
          />
        </div>

        {/* Tagline under illustration */}
        <div
          style={{
            position: 'absolute',
            bottom: 80,
            left: 0,
            right: 0,
            textAlign: 'center' as const,
            opacity: ci(frame, [fps * 1.8, fps * 2.3], [0, 1]),
          }}
        >
          <div style={{fontSize: 20, fontFamily: 'Georgia, serif', color: INK, fontStyle: 'italic'}}>
            "Built for readers who mean it."
          </div>
        </div>
      </div>

      <Audio src={staticFile('vo/kb-scene-02-overview.mp3')} volume={1} />
    </AbsoluteFill>
  );
};

// ══════════════════════════════════════════════════════════════════════════════
// SCENE 3 — READER DEEP DIVE: full-bleed animated reader UI
// Morphing spotlight reveals each feature zone
// ══════════════════════════════════════════════════════════════════════════════
export const SceneReaderDeepDive: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();

  // Spotlight focus phases (each 2.5s)
  // 0: full UI appears  1: toolbar  2: highlight  3: progress  4: settings
  const phase = Math.min(4, Math.floor(frame / (fps * 2.4)));
  const phaseFrame = frame % (fps * 2.4);

  const spotlights: {x: number; y: number; label: string; color: string}[] = [
    {x: 960,  y: 540,  label: '',                       color: AMBER},  // 0 full
    {x: 960,  y: 72,   label: '↑ Toolbar & Controls',   color: SKY},    // 1
    {x: 640,  y: 380,  label: '← Live Highlight',        color: AMBER},  // 2
    {x: 960,  y: 980,  label: '↓ Reading Progress Bar', color: SAGE},   // 3
    {x: 1700, y: 540,  label: '← Quick Settings Panel', color: EMBER},  // 4
  ];

  const spot = spotlights[phase] ?? spotlights[0];
  const spotR = ci(frame, [phase * fps * 2.4, phase * fps * 2.4 + fps * 0.4], [0, phase === 0 ? 2000 : 260]);

  // Label pop-in
  const labelOp = phase > 0 ? ci(frame, [phase * fps * 2.4 + fps * 0.3, phase * fps * 2.4 + fps * 0.7], [0, 1]) : 0;

  // Typewriter for chapter title
  const chTitle = useTypewriter('The Hitchhiker\'s Guide to the Galaxy', fps * 0.3, fps, 30);

  // Progress bar fill animates in
  const progressW = ci(frame, [fps * 0.5, fps * 1.2], [0, 62]);

  // Animated reading cursor line blinks on a text line
  const cursorLine = Math.floor(frame / (fps * 0.8)) % 8;

  return (
    <AbsoluteFill style={{background: '#12101C'}}>
      {/* ── Simulated Reader App Chrome ── */}

      {/* Top toolbar */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: 56,
          background: 'rgba(255,255,255,0.04)',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          display: 'flex',
          alignItems: 'center',
          padding: '0 28px',
          gap: 20,
          opacity: ci(frame, [0, fps * 0.5], [0, 1]),
        }}
      >
        {/* Back arrow */}
        <div style={{color: AMBER, fontFamily: 'sans-serif', fontSize: 20, opacity: 0.8}}>←</div>
        {/* Book title */}
        <div style={{color: CHALK, fontFamily: 'sans-serif', fontSize: 15, fontWeight: 500}}>
          {chTitle}
        </div>
        {/* Right tools */}
        <div style={{marginLeft: 'auto', display: 'flex', gap: 20, opacity: 0.6}}>
          {['🔖', '✏️', '⚙️', '🌙'].map((icon, i) => (
            <div key={i} style={{fontSize: 20}}>{icon}</div>
          ))}
        </div>
      </div>

      {/* Progress bar */}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: 4,
          background: 'rgba(255,255,255,0.06)',
        }}
      >
        <div
          style={{
            height: '100%',
            width: `${progressW}%`,
            background: `linear-gradient(90deg, ${AMBER}, ${SAGE})`,
          }}
        />
      </div>

      {/* Reading text area */}
      <div
        style={{
          position: 'absolute',
          top: 80,
          left: 180,
          right: 260,
          bottom: 60,
          display: 'flex',
          flexDirection: 'column',
          gap: 0,
          opacity: ci(frame, [fps * 0.4, fps * 0.9], [0, 1]),
        }}
      >
        {/* Chapter heading */}
        <div
          style={{
            fontSize: 13,
            letterSpacing: '4px',
            color: AMBER,
            fontFamily: 'sans-serif',
            textTransform: 'uppercase' as const,
            marginBottom: 12,
          }}
        >
          Chapter 4
        </div>
        <div
          style={{
            fontSize: 36,
            fontWeight: 700,
            fontFamily: 'Georgia, serif',
            color: PARCHMENT,
            marginBottom: 32,
            lineHeight: 1.2,
          }}
        >
          The Answer to Life
        </div>

        {/* Simulated paragraphs */}
        {Array.from({length: 10}).map((_, lineIdx) => {
          const widths = [1.0, 0.88, 0.95, 0.82, 1.0, 0.91, 0.77, 0.96, 0.88, 0.65];
          const isHighlighted = lineIdx === 4 || lineIdx === 5;
          const isCursor = lineIdx === cursorLine;
          return (
            <div
              key={lineIdx}
              style={{
                height: 22,
                marginBottom: 14,
                width: `${widths[lineIdx] * 100}%`,
                background: isHighlighted
                  ? `linear-gradient(90deg, ${AMBER}55, ${AMBER}22)`
                  : `rgba(255,255,255,${isCursor ? 0.14 : 0.07})`,
                borderRadius: 3,
                boxShadow: isHighlighted ? `0 0 10px ${AMBER}33` : 'none',
                borderLeft: isHighlighted ? `3px solid ${AMBER}` : 'none',
              }}
            />
          );
        })}

        {/* Floating annotation */}
        <div
          style={{
            position: 'absolute',
            top: 240,
            right: -100,
            width: 200,
            background: `${AMBER}18`,
            border: `1px solid ${AMBER}66`,
            borderRadius: 10,
            padding: '10px 14px',
            opacity: ci(frame, [fps * 1.4, fps * 1.8], [0, 1]),
          }}
        >
          <div style={{fontSize: 12, color: AMBER, fontFamily: 'sans-serif', fontWeight: 700, marginBottom: 4}}>Note</div>
          <div style={{fontSize: 12, color: CHALK, fontFamily: 'sans-serif', lineHeight: 1.4}}>
            The answer is always 42.
          </div>
        </div>
      </div>

      {/* Settings sidebar (right edge) */}
      <div
        style={{
          position: 'absolute',
          top: 56,
          right: 0,
          width: 220,
          bottom: 4,
          background: 'rgba(255,255,255,0.03)',
          borderLeft: '1px solid rgba(255,255,255,0.07)',
          padding: '24px 20px',
          display: 'flex',
          flexDirection: 'column',
          gap: 20,
          opacity: ci(frame, [fps * 0.6, fps * 1.0], [0, 1]),
        }}
      >
        <div style={{fontSize: 11, letterSpacing: '3px', color: DIM, textTransform: 'uppercase' as const}}>Settings</div>
        {['Font Size', 'Line Height', 'Theme', 'Margins'].map((label, i) => (
          <div key={i} style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
            <div style={{color: CHALK, fontSize: 13, fontFamily: 'sans-serif'}}>{label}</div>
            <div
              style={{
                width: 36,
                height: 20,
                borderRadius: 10,
                background: i === 0 || i === 2 ? AMBER : 'rgba(255,255,255,0.1)',
                border: '1px solid rgba(255,255,255,0.15)',
              }}
            />
          </div>
        ))}
      </div>

      {/* ── Spotlight Overlay ── */}
      {phase > 0 && (
        <div style={{position: 'absolute', inset: 0, pointerEvents: 'none'}}>
          <svg width="100%" height="100%">
            <defs>
              <radialGradient id={`spot${phase}`} cx={spot.x / 1920} cy={spot.y / 1080} r="0.3">
                <stop offset="0%" stopColor="transparent" />
                <stop offset="100%" stopColor="rgba(0,0,0,0.72)" />
              </radialGradient>
              <mask id={`spotMask${phase}`}>
                <rect width="1920" height="1080" fill="white" />
                <circle cx={spot.x} cy={spot.y} r={spotR} fill="black" />
              </mask>
            </defs>
            <rect width="1920" height="1080" fill="rgba(0,0,0,0.72)" mask={`url(#spotMask${phase})`} />
            {/* Spotlight ring */}
            <circle
              cx={spot.x}
              cy={spot.y}
              r={spotR}
              fill="none"
              stroke={spot.color}
              strokeWidth="2"
              opacity={0.6}
            />
          </svg>
          {/* Label */}
          <div
            style={{
              position: 'absolute',
              top: Math.min(spot.y + spotR + 16, 1000),
              left: Math.max(spot.x - 200, 20),
              opacity: labelOp,
              background: `${spot.color}22`,
              border: `1px solid ${spot.color}88`,
              borderRadius: 8,
              padding: '8px 18px',
              color: spot.color,
              fontFamily: 'sans-serif',
              fontSize: 18,
              fontWeight: 700,
            }}
          >
            {spot.label}
          </div>
        </div>
      )}

      <Audio src={staticFile('vo/kb-scene-03-reader.mp3')} volume={1} />
    </AbsoluteFill>
  );
};

// ══════════════════════════════════════════════════════════════════════════════
// SCENE 4 — COMMUNITY MOSAIC: grid of "discussion tiles" that pop in like a
// magazine layout. Shows book clubs as a living, breathing community board.
// ══════════════════════════════════════════════════════════════════════════════
export const SceneCommunity: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();

  // Discussion threads — mock data
  const threads = [
    {club: 'Sci-Fi Stargazers', book: 'Dune', msg: '"The spice must flow — but seriously, that ending 🤯"', avatar: '🚀', color: SKY,    time: '2m ago', likes: 14},
    {club: 'Mystery Nebula',    book: 'Gone Girl', msg: '"I did NOT see that twist coming. Chapter 22 broke me."', avatar: '🔭', color: EMBER,  time: '5m ago', likes: 31},
    {club: 'Fantasy Comets',    book: 'Name of the Wind', msg: '"Kvothe\'s lute scene > everything."', avatar: '⭐', color: AMBER,  time: '8m ago', likes: 22},
    {club: 'Sci-Fi Stargazers', book: 'Dune', msg: '"Who\'s up for the sequel read-along starting Monday?"', avatar: '🚀', color: SKY,    time: '11m ago', likes: 8},
    {club: 'Classics Orbit',    book: 'Crime & Punishment', msg: '"Raskolnikov\'s moral spiral is genuinely terrifying."', avatar: '📜', color: SAGE,   time: '14m ago', likes: 17},
    {club: 'Fantasy Comets',    book: 'Name of the Wind', msg: '"We need a Kingkiller Chronicle night. Who\'s in?"', avatar: '⭐', color: AMBER,  time: '19m ago', likes: 41},
  ];

  // Grid: 3 cols × 2 rows
  const cols = 3;
  const rows = 2;

  // Hero stat numbers
  const memberCount = Math.round(ci(frame, [fps * 2.0, fps * 3.5], [0, 4800]));
  const clubCount   = Math.round(ci(frame, [fps * 2.2, fps * 3.5], [0, 120]));
  const bookCount   = Math.round(ci(frame, [fps * 2.4, fps * 3.5], [0, 2400]));

  return (
    <AbsoluteFill>
      <InkBg />

      {/* Header */}
      <div
        style={{
          position: 'absolute',
          top: 48,
          left: 80,
          right: 80,
          display: 'flex',
          alignItems: 'baseline',
          gap: 20,
          opacity: ci(frame, [0, fps * 0.5], [0, 1]),
        }}
      >
        <div
          style={{
            fontSize: 52,
            fontWeight: 700,
            fontFamily: 'Georgia, serif',
            color: PARCHMENT,
          }}
        >
          The Community
        </div>
        <div style={{flex: 1, height: 1, background: `rgba(255,255,255,0.1)`, alignSelf: 'center'}} />
        <div style={{fontSize: 13, color: DIM, fontFamily: 'sans-serif', letterSpacing: '2px'}}>LIVE FEED</div>
        {/* Pulsing live dot */}
        <div
          style={{
            width: 10,
            height: 10,
            borderRadius: '50%',
            background: SAGE,
            boxShadow: `0 0 ${8 + 6 * Math.sin(frame * 0.15)}px ${SAGE}`,
          }}
        />
      </div>

      {/* Discussion tile grid */}
      <div
        style={{
          position: 'absolute',
          top: 148,
          left: 80,
          right: 80,
          display: 'grid',
          gridTemplateColumns: `repeat(${cols}, 1fr)`,
          gridTemplateRows: `repeat(${rows}, 1fr)`,
          gap: 20,
          height: 620,
        }}
      >
        {threads.map((t, i) => {
          const col = i % cols;
          const row = Math.floor(i / cols);
          // stagger: tiles pop in column by column, row by row
          const tileDelay = fps * (0.3 + col * 0.18 + row * 0.35);
          const s = spring({frame: frame - tileDelay, fps, config: {damping: 18, stiffness: 140}});
          const tileOp = ci(frame, [tileDelay, tileDelay + fps * 0.3], [0, 1]);

          return (
            <div
              key={i}
              style={{
                transform: `scale(${s}) translateY(${interpolate(s, [0, 1], [30, 0])}px)`,
                opacity: tileOp,
                background: 'rgba(255,255,255,0.04)',
                border: `1px solid rgba(255,255,255,0.08)`,
                borderTop: `3px solid ${t.color}`,
                borderRadius: 14,
                padding: '20px 22px',
                display: 'flex',
                flexDirection: 'column',
                gap: 10,
                overflow: 'hidden',
              }}
            >
              {/* Club + book row */}
              <div style={{display: 'flex', alignItems: 'center', gap: 10}}>
                <span style={{fontSize: 22}}>{t.avatar}</span>
                <div>
                  <div style={{fontSize: 12, color: t.color, fontFamily: 'sans-serif', fontWeight: 700}}>
                    {t.club}
                  </div>
                  <div style={{fontSize: 11, color: DIM, fontFamily: 'sans-serif'}}>
                    📖 {t.book}
                  </div>
                </div>
              </div>

              {/* Message */}
              <div
                style={{
                  fontSize: 15,
                  color: CHALK,
                  fontFamily: 'Georgia, serif',
                  fontStyle: 'italic',
                  lineHeight: 1.45,
                  flex: 1,
                }}
              >
                {t.msg}
              </div>

              {/* Footer */}
              <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                <div style={{fontSize: 11, color: DIM, fontFamily: 'sans-serif'}}>{t.time}</div>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 5,
                    background: 'rgba(255,255,255,0.05)',
                    borderRadius: 20,
                    padding: '3px 10px',
                  }}
                >
                  <span style={{fontSize: 12}}>♥</span>
                  <span style={{fontSize: 12, color: CHALK, fontFamily: 'sans-serif'}}>{t.likes}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Stats bar at bottom */}
      <div
        style={{
          position: 'absolute',
          bottom: 48,
          left: 80,
          right: 80,
          display: 'flex',
          justifyContent: 'space-around',
          opacity: ci(frame, [fps * 1.8, fps * 2.2], [0, 1]),
        }}
      >
        {[
          {val: memberCount.toLocaleString(), label: 'Active Readers'},
          {val: clubCount.toLocaleString(),   label: 'Book Clubs'},
          {val: bookCount.toLocaleString(),   label: 'Books in Library'},
        ].map((s, i) => (
          <div key={i} style={{textAlign: 'center' as const}}>
            <div style={{fontSize: 42, fontWeight: 900, color: AMBER, fontFamily: 'sans-serif'}}>
              {s.val}
            </div>
            <div style={{fontSize: 14, color: DIM, fontFamily: 'sans-serif', letterSpacing: '2px', textTransform: 'uppercase' as const}}>
              {s.label}
            </div>
          </div>
        ))}
      </div>

      <Audio src={staticFile('vo/kb-scene-04-bookclubs.mp3')} volume={1} />
    </AbsoluteFill>
  );
};

// ══════════════════════════════════════════════════════════════════════════════
// SCENE 5 — DASHBOARD MAGAZINE SPREAD: parchment background, dark ink stats
// Feels like opening a physical reading journal / magazine centrefold
// ══════════════════════════════════════════════════════════════════════════════
export const SceneDashboardSpread: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();

  // Parchment reveal: page peels from left
  const peelW = ci(frame, [0, fps * 0.7], [0, 1920]);

  // Stats
  const stats = [
    {val: 42,   suffix: '',   label: 'Books\nCompleted',  color: INK},
    {val: 14,   suffix: 'd',  label: 'Day\nStreak',       color: EMBER},
    {val: 1250, suffix: 'pg', label: 'Pages This\nWeek', color: SAGE},
    {val: 3,    suffix: '',   label: 'Clubs\nJoined',     color: SKY},
  ];

  // Monthly reading chart (pages per week, last 8 weeks)
  const weekData = [320, 480, 290, 610, 540, 720, 850, 1250];
  const maxWeek  = 1250;

  // Currently reading
  const books = [
    {title: 'Dune',                  author: 'Frank Herbert',    pct: 62, color: AMBER},
    {title: 'Project Hail Mary',     author: 'Andy Weir',        pct: 18, color: SKY},
    {title: 'The Name of the Wind',  author: 'Patrick Rothfuss', pct: 91, color: SAGE},
  ];

  return (
    <AbsoluteFill>
      {/* Parchment base */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: PARCHMENT,
          overflow: 'hidden',
        }}
      >
        {/* Subtle paper texture */}
        <svg width="100%" height="100%" style={{position: 'absolute', opacity: 0.04}}>
          <filter id="paper">
            <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="4" seed="5" />
            <feColorMatrix type="saturate" values="0" />
          </filter>
          <rect width="100%" height="100%" filter="url(#paper)" />
        </svg>
      </div>

      {/* Ink reveal (clips to peelW) */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          clipPath: `inset(0 ${1920 - peelW}px 0 0)`,
        }}
      >
        {/* ── Left column: header + stat blocks ── */}
        <div
          style={{
            position: 'absolute',
            left: 80,
            top: 80,
            width: 520,
          }}
        >
          {/* Section label */}
          <div
            style={{
              fontSize: 11,
              letterSpacing: '5px',
              color: AMBER,
              fontFamily: 'sans-serif',
              textTransform: 'uppercase' as const,
              marginBottom: 8,
            }}
          >
            Your Reading Life
          </div>

          <div
            style={{
              fontSize: 58,
              fontWeight: 700,
              fontFamily: 'Georgia, serif',
              color: INK,
              lineHeight: 1.1,
              marginBottom: 8,
            }}
          >
            Reading<br />Dashboard
          </div>

          <DrawRule startFrame={fps * 0.8} color={INK} width={440} />

          {/* Stat grid */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 20,
              marginTop: 32,
            }}
          >
            {stats.map((st, i) => {
              const delay = fps * (0.9 + i * 0.2);
              const countVal = Math.round(
                ci(frame, [delay, delay + fps * 1.2], [0, st.val]),
              );
              return (
                <div
                  key={i}
                  style={{
                    opacity: ci(frame, [delay, delay + fps * 0.4], [0, 1]),
                    background: st.color === INK ? `${INK}08` : `${st.color}12`,
                    border: `1px solid ${st.color === INK ? 'rgba(0,0,0,0.12)' : `${st.color}44`}`,
                    borderRadius: 14,
                    padding: '20px 18px',
                  }}
                >
                  <div
                    style={{
                      fontSize: 44,
                      fontWeight: 900,
                      fontFamily: 'sans-serif',
                      color: st.color === INK ? INK : st.color,
                      lineHeight: 1,
                    }}
                  >
                    {countVal}{st.suffix}
                  </div>
                  <div
                    style={{
                      fontSize: 13,
                      color: DIM,
                      fontFamily: 'sans-serif',
                      marginTop: 6,
                      whiteSpace: 'pre-line' as const,
                    }}
                  >
                    {st.label}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Center: bar chart ── */}
        <div
          style={{
            position: 'absolute',
            left: 640,
            top: 80,
            width: 560,
          }}
        >
          <div
            style={{
              fontSize: 13,
              color: DIM,
              fontFamily: 'sans-serif',
              letterSpacing: '3px',
              textTransform: 'uppercase' as const,
              marginBottom: 24,
              opacity: ci(frame, [fps * 0.7, fps * 1.0], [0, 1]),
            }}
          >
            Weekly Pages — Last 8 Weeks
          </div>

          <div style={{display: 'flex', alignItems: 'flex-end', gap: 14, height: 260}}>
            {weekData.map((pages, i) => {
              const barDelay = fps * (1.1 + i * 0.1);
              const barH = ci(frame, [barDelay, barDelay + fps * 0.6], [0, (pages / maxWeek) * 240]);
              const isLast = i === weekData.length - 1;
              return (
                <div
                  key={i}
                  style={{flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8}}
                >
                  <div
                    style={{
                      width: '100%',
                      height: barH,
                      borderRadius: '6px 6px 0 0',
                      background: isLast
                        ? `linear-gradient(180deg, ${AMBER}, ${EMBER})`
                        : `${INK}22`,
                      boxShadow: isLast ? `0 0 20px ${AMBER}55` : 'none',
                    }}
                  />
                  <div
                    style={{
                      color: isLast ? AMBER : DIM,
                      fontFamily: 'sans-serif',
                      fontSize: 12,
                      fontWeight: isLast ? 700 : 400,
                    }}
                  >
                    W{i + 1}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Currently reading */}
          <div
            style={{
              marginTop: 40,
              opacity: ci(frame, [fps * 2.0, fps * 2.4], [0, 1]),
            }}
          >
            <div
              style={{
                fontSize: 12,
                letterSpacing: '4px',
                color: DIM,
                fontFamily: 'sans-serif',
                textTransform: 'uppercase' as const,
                marginBottom: 16,
              }}
            >
              Currently Reading
            </div>
            {books.map((b, i) => {
              const bDelay = fps * (2.1 + i * 0.2);
              return (
                <div
                  key={i}
                  style={{
                    opacity: ci(frame, [bDelay, bDelay + fps * 0.3], [0, 1]),
                    display: 'flex',
                    alignItems: 'center',
                    gap: 14,
                    marginBottom: 14,
                  }}
                >
                  <div style={{flex: 1}}>
                    <div style={{fontSize: 15, fontFamily: 'Georgia, serif', color: INK, fontWeight: 700}}>{b.title}</div>
                    <div style={{fontSize: 12, color: DIM, fontFamily: 'sans-serif'}}>{b.author}</div>
                  </div>
                  <div style={{width: 140}}>
                    <div style={{height: 6, background: `${INK}15`, borderRadius: 3, overflow: 'hidden'}}>
                      <div
                        style={{
                          height: '100%',
                          width: `${ci(frame, [bDelay + fps * 0.1, bDelay + fps * 0.7], [0, b.pct])}%`,
                          background: b.color,
                          borderRadius: 3,
                        }}
                      />
                    </div>
                    <div style={{fontSize: 11, color: DIM, fontFamily: 'sans-serif', marginTop: 3, textAlign: 'right' as const}}>
                      {b.pct}%
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Right column: achievement badges ── */}
        <div
          style={{
            position: 'absolute',
            right: 80,
            top: 80,
            width: 340,
            opacity: ci(frame, [fps * 1.5, fps * 1.9], [0, 1]),
          }}
        >
          <div
            style={{
              fontSize: 12,
              letterSpacing: '4px',
              color: DIM,
              fontFamily: 'sans-serif',
              textTransform: 'uppercase' as const,
              marginBottom: 20,
            }}
          >
            Achievements
          </div>
          {[
            {icon: '🔥', name: 'On Fire',      desc: '14-day streak',      color: EMBER, earned: true},
            {icon: '🦉', name: 'Night Owl',    desc: '10 late-night sessions', color: AMBER, earned: true},
            {icon: '⚡', name: 'Speed Reader', desc: '500 pages in a week', color: SKY,   earned: true},
            {icon: '🏆', name: 'Centurion',    desc: '100 books read',      color: SAGE,  earned: false},
          ].map((badge, i) => {
            const bDelay = fps * (1.6 + i * 0.2);
            const s = spring({frame: frame - bDelay, fps, config: {damping: 16}});
            return (
              <div
                key={i}
                style={{
                  transform: `scale(${s})`,
                  opacity: interpolate(s, [0, 1], [0, 1]) * (badge.earned ? 1 : 0.4),
                  display: 'flex',
                  alignItems: 'center',
                  gap: 14,
                  marginBottom: 18,
                  background: badge.earned ? `${badge.color}12` : 'rgba(0,0,0,0.04)',
                  border: `1px solid ${badge.earned ? `${badge.color}44` : 'rgba(0,0,0,0.1)'}`,
                  borderRadius: 12,
                  padding: '14px 16px',
                }}
              >
                <span style={{fontSize: 28, filter: badge.earned ? 'none' : 'grayscale(100%)'}}>{badge.icon}</span>
                <div>
                  <div style={{fontSize: 15, fontFamily: 'sans-serif', fontWeight: 700, color: badge.earned ? INK : DIM}}>{badge.name}</div>
                  <div style={{fontSize: 12, color: DIM, fontFamily: 'sans-serif'}}>{badge.desc}</div>
                </div>
                {badge.earned && (
                  <div style={{marginLeft: 'auto', width: 20, height: 20, borderRadius: '50%', background: badge.color, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
                    <svg width="11" height="11" viewBox="0 0 11 11"><path d="M2 5.5l2.5 2.5L9 3" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none"/></svg>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <Audio src={staticFile('vo/kb-scene-05-dashboard.mp3')} volume={1} />
    </AbsoluteFill>
  );
};

// ══════════════════════════════════════════════════════════════════════════════
// SCENE 6 — CTA: full-bleed amber/ember gradient, massive typography,
// no cards, no icons — pure editorial confidence
// ══════════════════════════════════════════════════════════════════════════════
export const SceneFinalCTA: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();

  // Amber → ember gradient sweeps across
  const gradAngle = ci(frame, [0, fps * 3], [135, 160]);

  // Main headline: words fly in individually
  const words = ['Your', 'next', 'great', 'read', 'is', 'waiting.'];
  const wordDelay = fps * 0.25;

  // Tagline fade
  const tagOp = ci(frame, [fps * 1.8, fps * 2.3], [0, 1]);
  const tagY  = ci(frame, [fps * 1.8, fps * 2.3], [24, 0]);

  // CTA text stamp
  const ctaS = spring({frame: frame - fps * 2.6, fps, config: {damping: 10, stiffness: 100}});

  // Star ratings
  const starsOp = ci(frame, [fps * 3.2, fps * 3.6], [0, 1]);

  // Scrolling ticker at very bottom
  const tickerX = ci(frame, [fps * 3.0, fps * 14], [-200, -2400]);
  const tickerItems = '· Kane\'s Bookstore Reader · 4,800+ Active Readers · 120+ Book Clubs · 2,400+ Titles · Free to Join · ';

  return (
    <AbsoluteFill>
      {/* Gradient background */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: `linear-gradient(${gradAngle}deg, ${INK} 0%, #1C0A04 40%, ${EMBER}22 100%)`,
        }}
      />

      {/* Grain */}
      <svg width="100%" height="100%" style={{position: 'absolute', opacity: 0.04}}>
        <filter id="cta-grain">
          <feTurbulence type="fractalNoise" baseFrequency="0.68" numOctaves="4" seed="9" />
          <feColorMatrix type="saturate" values="0" />
        </filter>
        <rect width="100%" height="100%" filter="url(#cta-grain)" />
      </svg>

      {/* Amber accent bar top */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: ci(frame, [0, fps * 0.5], [0, 1920]),
          height: 5,
          background: `linear-gradient(90deg, ${AMBER}, ${EMBER})`,
        }}
      />

      {/* Main headline */}
      <div
        style={{
          position: 'absolute',
          top: 220,
          left: 120,
          right: 120,
        }}
      >
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap' as const,
            gap: '0 22px',
            fontSize: 118,
            fontWeight: 900,
            fontFamily: 'Georgia, serif',
            lineHeight: 1.05,
            color: PARCHMENT,
          }}
        >
          {words.map((word, i) => {
            const wDelay = fps * 0.4 + i * wordDelay;
            const wS = spring({frame: frame - wDelay, fps, config: {damping: 14, stiffness: 100}});
            const wOp = ci(frame, [wDelay, wDelay + fps * 0.3], [0, 1]);
            const isHighlight = word === 'great' || word === 'read';
            return (
              <span
                key={i}
                style={{
                  display: 'inline-block',
                  transform: `translateY(${interpolate(wS, [0, 1], [80, 0])}px) scale(${wS})`,
                  opacity: wOp,
                  color: isHighlight ? AMBER : PARCHMENT,
                  transformOrigin: 'bottom center',
                }}
              >
                {word}
              </span>
            );
          })}
        </div>

        {/* Tagline */}
        <div
          style={{
            opacity: tagOp,
            transform: `translateY(${tagY}px)`,
            marginTop: 32,
            fontSize: 26,
            color: DIM,
            fontFamily: 'sans-serif',
            fontWeight: 300,
            letterSpacing: '1px',
          }}
        >
          Join Kane's Komets — where readers discover, discuss, and grow.
        </div>
      </div>

      {/* CTA stamp */}
      <div
        style={{
          position: 'absolute',
          bottom: 180,
          left: 120,
          transform: `scale(${ctaS})`,
          opacity: interpolate(ctaS, [0, 1], [0, 1]),
          transformOrigin: 'left center',
        }}
      >
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 20,
            background: AMBER,
            borderRadius: 6,
            padding: '22px 52px',
          }}
        >
          <span
            style={{
              color: INK,
              fontFamily: 'sans-serif',
              fontWeight: 900,
              fontSize: 28,
              letterSpacing: '0.5px',
            }}
          >
            Start Reading Free
          </span>
          <span style={{color: INK, fontSize: 28, fontWeight: 900}}>→</span>
        </div>
      </div>

      {/* Star ratings */}
      <div
        style={{
          position: 'absolute',
          bottom: 184,
          right: 120,
          opacity: starsOp,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-end',
          gap: 8,
        }}
      >
        <div style={{display: 'flex', gap: 4}}>
          {Array.from({length: 5}).map((_, i) => (
            <span key={i} style={{color: AMBER, fontSize: 28}}>★</span>
          ))}
        </div>
        <div style={{color: CHALK, fontFamily: 'sans-serif', fontSize: 16}}>
          4.9 / 5 — over 1,200 reader reviews
        </div>
      </div>

      {/* Bottom ticker */}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: 48,
          background: AMBER,
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'center',
        }}
      >
        <div
          style={{
            whiteSpace: 'nowrap' as const,
            transform: `translateX(${tickerX}px)`,
            color: INK,
            fontFamily: 'sans-serif',
            fontWeight: 700,
            fontSize: 16,
            letterSpacing: '1px',
          }}
        >
          {tickerItems.repeat(6)}
        </div>
      </div>

      <Audio src={staticFile('vo/kb-scene-07-cta.mp3')} volume={1} />
    </AbsoluteFill>
  );
};

// ══════════════════════════════════════════════════════════════════════════════
// MASTER COMPOSITION
// VO durations (same files as V1):
//   hero:      7.99s → 284f   (scene-01)
//   overview: 13.70s → 456f   (scene-02)
//   reader:   14.74s → 487f   (scene-03)
//   clubs:    16.70s → 546f   (scene-04)
//   dashboard:13.15s → 439f   (scene-05)
//   CTA:       8.57s → 302f   (scene-07)
//
// 6 scenes, 5 transitions × 20f = 100f
// Total: 284+456+487+546+439+302 - 100 = 2414 frames ≈ 80s
// ══════════════════════════════════════════════════════════════════════════════
export const KanesBookstoreV2: React.FC = () => {
  return (
    <TransitionSeries>
      <TransitionSeries.Sequence durationInFrames={284}>
        <SceneColdOpen />
      </TransitionSeries.Sequence>
      <TransitionSeries.Transition
        presentation={wipe({direction: 'from-right'})}
        timing={linearTiming({durationInFrames: 20})}
      />

      <TransitionSeries.Sequence durationInFrames={456}>
        <SceneSplitFeatures />
      </TransitionSeries.Sequence>
      <TransitionSeries.Transition
        presentation={fade()}
        timing={springTiming({config: {damping: 200}, durationInFrames: 25})}
      />

      <TransitionSeries.Sequence durationInFrames={487}>
        <SceneReaderDeepDive />
      </TransitionSeries.Sequence>
      <TransitionSeries.Transition
        presentation={wipe({direction: 'from-bottom'})}
        timing={linearTiming({durationInFrames: 20})}
      />

      <TransitionSeries.Sequence durationInFrames={546}>
        <SceneCommunity />
      </TransitionSeries.Sequence>
      <TransitionSeries.Transition
        presentation={fade()}
        timing={springTiming({config: {damping: 200}, durationInFrames: 25})}
      />

      <TransitionSeries.Sequence durationInFrames={439}>
        <SceneDashboardSpread />
      </TransitionSeries.Sequence>
      <TransitionSeries.Transition
        presentation={wipe({direction: 'from-left'})}
        timing={linearTiming({durationInFrames: 20})}
      />

      <TransitionSeries.Sequence durationInFrames={302}>
        <SceneFinalCTA />
      </TransitionSeries.Sequence>
    </TransitionSeries>
  );
};
