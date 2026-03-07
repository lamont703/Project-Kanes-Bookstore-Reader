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
import {slide} from '@remotion/transitions/slide';
import {wipe} from '@remotion/transitions/wipe';

// ─── Brand Colors ─────────────────────────────────────────────────────────────
const COSMIC_PURPLE  = '#6B21A8';   // deep cosmic purple
const NEBULA_BLUE    = '#1E40AF';   // deep nebula blue
const STAR_GOLD      = '#F59E0B';   // warm star gold
const COMET_TEAL     = '#0D9488';   // comet accent teal
const VOID           = '#050508';   // near-black space
const WHITE          = '#FFFFFF';
const MUTED          = '#94A3B8';
const GLOW_PINK      = '#DB2777';   // accent pink for highlights
const GREEN_CHECK    = '#10B981';

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fadeIn = (frame: number, fps: number, delay = 0, duration = 0.55) =>
  interpolate(frame, [delay * fps, (delay + duration) * fps], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

const slideUp = (frame: number, fps: number, delay = 0, duration = 0.5) =>
  interpolate(frame, [delay * fps, (delay + duration) * fps], [50, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

// ─── Starfield Background ─────────────────────────────────────────────────────
// Deterministic "random" stars using index seeding
const STARS = Array.from({length: 80}, (_, i) => ({
  x: ((i * 137.508 + 42) % 100),
  y: ((i * 97.132 + 17) % 100),
  r: 0.8 + (i % 5) * 0.4,
  opacity: 0.2 + (i % 4) * 0.2,
  twinkleOffset: i % 60,
}));

const CosmicBg: React.FC<{accent?: string}> = ({accent = NEBULA_BLUE}) => {
  const frame = useCurrentFrame();
  const nebulaPulse = interpolate(frame, [0, 180], [0, 1], {extrapolateRight: 'clamp'});

  return (
    <AbsoluteFill
      style={{
        background: `radial-gradient(ellipse at 30% 40%, ${COSMIC_PURPLE}44 0%, transparent 55%),
                     radial-gradient(ellipse at 75% 65%, ${accent}33 0%, transparent 45%),
                     linear-gradient(135deg, #0D0720 0%, ${VOID} 60%, #050B1A 100%)`,
      }}
    >
      {/* Stars */}
      <svg width="100%" height="100%" style={{position: 'absolute', top: 0, left: 0}}>
        {STARS.map((s, i) => {
          const twinkle = interpolate(
            (frame + s.twinkleOffset) % 60,
            [0, 30, 60],
            [s.opacity, Math.min(s.opacity + 0.4, 1), s.opacity],
            {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'},
          );
          return (
            <circle
              key={i}
              cx={`${s.x}%`}
              cy={`${s.y}%`}
              r={s.r}
              fill={WHITE}
              opacity={twinkle}
            />
          );
        })}
      </svg>

      {/* Comet streak (decorative) */}
      <svg width="100%" height="100%" style={{position: 'absolute', opacity: 0.06}}>
        <line x1="0" y1="0" x2="60%" y2="40%" stroke={STAR_GOLD} strokeWidth="1.5" />
        <line x1="100%" y1="20%" x2="40%" y2="60%" stroke={COMET_TEAL} strokeWidth="1" />
      </svg>
    </AbsoluteFill>
  );
};

// ─── Orbit Ring ───────────────────────────────────────────────────────────────
const OrbitRing: React.FC<{size: number; delay?: number; color?: string}> = ({
  size,
  delay = 0,
  color = STAR_GOLD,
}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const scale = spring({frame: frame - delay, fps, config: {damping: 12}});
  const rotate = interpolate(frame, [0, 600], [0, 360], {extrapolateRight: 'clamp'});
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        border: `2px solid ${color}`,
        transform: `scale(${scale}) rotate(${rotate}deg)`,
        opacity: interpolate(scale, [0, 1], [0, 0.25]),
      }}
    />
  );
};

// ─── Book Icon SVG ─────────────────────────────────────────────────────────────
const BookIcon: React.FC<{size?: number; color?: string}> = ({size = 60, color = STAR_GOLD}) => (
  <svg width={size} height={size} viewBox="0 0 64 64" fill="none">
    <rect x="8" y="6" width="36" height="48" rx="4" stroke={color} strokeWidth="2.5" fill={`${color}15`} />
    <line x1="16" y1="20" x2="36" y2="20" stroke={color} strokeWidth="2" />
    <line x1="16" y1="28" x2="36" y2="28" stroke={color} strokeWidth="2" />
    <line x1="16" y1="36" x2="28" y2="36" stroke={color} strokeWidth="2" />
    <path d="M44 14 L56 20 L56 54 L44 48 Z" stroke={color} strokeWidth="2" fill={`${color}10`} />
    {/* comet streak on cover */}
    <circle cx="44" cy="8" r="4" fill={color} opacity="0.9" />
    <line x1="40" y1="12" x2="30" y2="22" stroke={color} strokeWidth="1.5" opacity="0.5" />
  </svg>
);

// ─── Comet Badge (Kane's Komets branding) ─────────────────────────────────────
const KometBadge: React.FC<{scale?: number}> = ({scale = 1}) => (
  <svg
    width={120 * scale}
    height={120 * scale}
    viewBox="0 0 120 120"
  >
    {/* outer ring */}
    <circle cx="60" cy="60" r="56" fill="none" stroke={STAR_GOLD} strokeWidth="2.5" opacity="0.7" />
    <circle cx="60" cy="60" r="50" fill={`${COSMIC_PURPLE}33`} />
    {/* comet body */}
    <circle cx="60" cy="48" r="14" fill={STAR_GOLD} opacity="0.95" />
    {/* comet tail */}
    <ellipse cx="48" cy="64" rx="16" ry="6" fill={STAR_GOLD} opacity="0.3" transform="rotate(-35,48,64)" />
    <ellipse cx="42" cy="72" rx="10" ry="3.5" fill={STAR_GOLD} opacity="0.15" transform="rotate(-35,42,72)" />
    {/* K letter */}
    <text x="60" y="54" textAnchor="middle" dominantBaseline="middle" fill={VOID} fontSize="16" fontWeight="900" fontFamily="sans-serif">K</text>
    {/* label */}
    <text x="60" y="82" textAnchor="middle" fill={STAR_GOLD} fontSize="11" fontWeight="700" fontFamily="sans-serif" letterSpacing="2">KANE'S</text>
    <text x="60" y="96" textAnchor="middle" fill={WHITE} fontSize="9" fontFamily="sans-serif" letterSpacing="1" opacity="0.8">KOMETS</text>
  </svg>
);

// ─── Scene 1: Hero ─────────────────────────────────────────────────────────────
export const SceneHero: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();

  const badgeScale = spring({frame, fps, config: {damping: 11}});
  const titleOp    = fadeIn(frame, fps, 0.45);
  const titleY     = slideUp(frame, fps, 0.45);
  const tagOp      = fadeIn(frame, fps, 0.85);
  const tagY       = slideUp(frame, fps, 0.85);
  const divW       = interpolate(frame, [fps * 1.2, fps * 2.0], [0, 340], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill style={{alignItems: 'center', justifyContent: 'center'}}>
      <CosmicBg accent={COMET_TEAL} />

      {/* Orbit rings */}
      <div style={{position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)'}}>
        {[360, 520, 700].map((s, i) => (
          <div key={s} style={{position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)'}}>
            <OrbitRing size={s} delay={i * 10} color={i === 1 ? COMET_TEAL : STAR_GOLD} />
          </div>
        ))}
      </div>

      {/* Content */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 20,
          position: 'relative',
          zIndex: 10,
        }}
      >
        <div style={{transform: `scale(${badgeScale})`}}>
          <KometBadge scale={1.1} />
        </div>

        <div
          style={{
            opacity: titleOp,
            transform: `translateY(${titleY}px)`,
            textAlign: 'center' as const,
            lineHeight: 1.05,
          }}
        >
          <div style={{fontSize: 80, fontWeight: 900, color: WHITE, fontFamily: 'sans-serif', letterSpacing: '-2px'}}>
            Kane's <span style={{color: STAR_GOLD}}>Bookstore</span>
          </div>
          <div style={{fontSize: 44, fontWeight: 700, color: COMET_TEAL, fontFamily: 'sans-serif', letterSpacing: '1px'}}>
            Reader
          </div>
        </div>

        <div
          style={{
            opacity: tagOp,
            transform: `translateY(${tagY}px)`,
            fontSize: 20,
            color: MUTED,
            fontFamily: 'sans-serif',
            letterSpacing: '4px',
            textTransform: 'uppercase' as const,
          }}
        >
          Discover · Read · Connect Among the Stars
        </div>

        <div
          style={{
            width: divW,
            height: 2,
            background: `linear-gradient(90deg, transparent, ${STAR_GOLD}, ${COMET_TEAL}, transparent)`,
            opacity: fadeIn(frame, fps, 1.2),
          }}
        />
      </div>

      <Audio src={staticFile('vo/kb-scene-01-hero.mp3')} volume={1} />
    </AbsoluteFill>
  );
};

// ─── Scene 2: Platform Overview ────────────────────────────────────────────────
export const SceneOverview: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();

  const features = [
    {icon: '📖', text: 'Immersive browser-based e-reader', accent: STAR_GOLD},
    {icon: '🔍', text: 'Smart book discovery & advanced search', accent: COMET_TEAL},
    {icon: '👥', text: 'Virtual book clubs & live discussions', accent: GLOW_PINK},
    {icon: '📊', text: 'Personal reading dashboard & stats', accent: GREEN_CHECK},
  ];

  return (
    <AbsoluteFill style={{alignItems: 'center', justifyContent: 'center'}}>
      <CosmicBg accent={COSMIC_PURPLE} />

      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 36,
          padding: '0 100px',
          width: '100%',
          maxWidth: 1100,
        }}
      >
        <div
          style={{
            opacity: fadeIn(frame, fps, 0),
            transform: `translateY(${slideUp(frame, fps, 0)}px)`,
            fontSize: 52,
            fontWeight: 800,
            color: WHITE,
            fontFamily: 'sans-serif',
            textAlign: 'center' as const,
          }}
        >
          What is <span style={{color: STAR_GOLD}}>Kane's Reader</span>?
        </div>

        {features.map((f, i) => {
          const delay = 0.3 + i * 0.22;
          return (
            <div
              key={i}
              style={{
                opacity: fadeIn(frame, fps, delay),
                transform: `translateY(${slideUp(frame, fps, delay)}px)`,
                display: 'flex',
                alignItems: 'center',
                gap: 28,
                background: `rgba(255,255,255,0.04)`,
                border: `1px solid ${f.accent}44`,
                borderLeft: `4px solid ${f.accent}`,
                borderRadius: 16,
                padding: '20px 36px',
                width: '100%',
              }}
            >
              <span style={{fontSize: 40}}>{f.icon}</span>
              <span style={{fontSize: 26, color: WHITE, fontFamily: 'sans-serif', fontWeight: 500}}>
                {f.text}
              </span>
              <div
                style={{
                  marginLeft: 'auto',
                  width: 10,
                  height: 10,
                  borderRadius: '50%',
                  background: f.accent,
                  boxShadow: `0 0 12px ${f.accent}`,
                }}
              />
            </div>
          );
        })}
      </div>

      <Sequence from={20} layout="none"><Audio src={staticFile('vo/kb-scene-02-overview.mp3')} volume={1} /></Sequence>
    </AbsoluteFill>
  );
};

// ─── Scene 3: E-Reader Showcase ────────────────────────────────────────────────
// Shows an animated "mock reader" interface with feature callouts
export const SceneReader: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();

  const windowS = spring({frame, fps, config: {damping: 15}});

  // Feature callout items that appear progressively
  const callouts = [
    {label: 'Real-time Highlighting', icon: '✏️', delay: 0.5, side: 'right'},
    {label: 'Bookmarks & Notes',     icon: '🔖', delay: 0.9, side: 'right'},
    {label: 'Progress Tracking',     icon: '📈', delay: 1.3, side: 'left'},
    {label: 'Distraction-Free Mode', icon: '🌙', delay: 1.7, side: 'left'},
  ];

  return (
    <AbsoluteFill style={{alignItems: 'center', justifyContent: 'center'}}>
      <CosmicBg accent={NEBULA_BLUE} />

      <div
        style={{
          opacity: fadeIn(frame, fps, 0),
          transform: `translateY(${slideUp(frame, fps, 0)}px)`,
          position: 'absolute',
          top: 36,
          left: 0,
          right: 0,
          textAlign: 'center' as const,
          fontSize: 48,
          fontWeight: 800,
          color: WHITE,
          fontFamily: 'sans-serif',
        }}
      >
        The <span style={{color: STAR_GOLD}}>E-Reader</span> Experience
      </div>

      {/* Mock reader window */}
      <div
        style={{
          transform: `scale(${windowS})`,
          opacity: windowS,
          width: 680,
          height: 420,
          background: 'rgba(15,12,30,0.95)',
          border: `2px solid ${STAR_GOLD}55`,
          borderRadius: 20,
          overflow: 'hidden',
          position: 'relative',
          boxShadow: `0 0 60px ${COSMIC_PURPLE}44`,
        }}
      >
        {/* Window titlebar */}
        <div
          style={{
            height: 36,
            background: `linear-gradient(90deg, ${COSMIC_PURPLE}88, ${NEBULA_BLUE}88)`,
            display: 'flex',
            alignItems: 'center',
            padding: '0 16px',
            gap: 8,
          }}
        >
          {[GLOW_PINK, STAR_GOLD, GREEN_CHECK].map((c, i) => (
            <div key={i} style={{width: 12, height: 12, borderRadius: '50%', background: c, opacity: 0.8}} />
          ))}
          <div style={{marginLeft: 12, color: MUTED, fontSize: 14, fontFamily: 'monospace'}}>
            The Hitchhiker's Guide to the Galaxy — Chapter 4
          </div>
        </div>

        {/* Reader body with progress bar */}
        <div style={{padding: '20px 40px', position: 'relative'}}>
          {/* Progress bar */}
          <div style={{height: 3, background: `${STAR_GOLD}22`, borderRadius: 2, marginBottom: 20}}>
            <div
              style={{
                height: '100%',
                width: `${interpolate(frame, [fps * 0.2, fps * 2], [0, 62], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'})}%`,
                background: `linear-gradient(90deg, ${STAR_GOLD}, ${COMET_TEAL})`,
                borderRadius: 2,
              }}
            />
          </div>

          {/* Simulated text lines */}
          {[1.0, 0.9, 1.0, 0.85, 0.95, 0.9, 0.75].map((w, i) => {
            const highlighted = i === 2;
            return (
              <div
                key={i}
                style={{
                  height: 14,
                  borderRadius: 3,
                  marginBottom: 12,
                  width: `${w * 100}%`,
                  background: highlighted
                    ? `linear-gradient(90deg, ${STAR_GOLD}55, ${STAR_GOLD}22)`
                    : `rgba(255,255,255,${0.06 + i * 0.01})`,
                  boxShadow: highlighted ? `0 0 8px ${STAR_GOLD}44` : 'none',
                }}
              />
            );
          })}

          {/* Page counter */}
          <div
            style={{
              position: 'absolute',
              bottom: 16,
              right: 40,
              color: MUTED,
              fontFamily: 'sans-serif',
              fontSize: 13,
            }}
          >
            Page 62 of 193 · 32% complete
          </div>
        </div>
      </div>

      {/* Callouts */}
      {callouts.map((c, i) => {
        const isRight = c.side === 'right';
        const op = fadeIn(frame, fps, c.delay);
        const xFrom = isRight ? 80 : -80;
        const xVal = interpolate(
          frame,
          [c.delay * fps, (c.delay + 0.5) * fps],
          [xFrom, 0],
          {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'},
        );
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              top: `${38 + i * 13}%`,
              [isRight ? 'right' : 'left']: '7%',
              opacity: op,
              transform: `translateX(${xVal}px)`,
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              background: 'rgba(255,255,255,0.05)',
              border: `1px solid ${STAR_GOLD}44`,
              borderRadius: 12,
              padding: '10px 18px',
            }}
          >
            {!isRight && <span style={{fontSize: 24}}>{c.icon}</span>}
            <span style={{color: WHITE, fontFamily: 'sans-serif', fontSize: 18, fontWeight: 600}}>{c.label}</span>
            {isRight && <span style={{fontSize: 24}}>{c.icon}</span>}
          </div>
        );
      })}

      <Sequence from={20} layout="none"><Audio src={staticFile('vo/kb-scene-03-reader.mp3')} volume={1} /></Sequence>
    </AbsoluteFill>
  );
};

// ─── Scene 4: Book Clubs ───────────────────────────────────────────────────────
export const SceneBookClubs: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();

  // Simulated club member avatars (color-coded circles)
  const members = [
    {color: STAR_GOLD,    initials: 'KL', angle: 0},
    {color: COMET_TEAL,   initials: 'MR', angle: 51},
    {color: GLOW_PINK,    initials: 'AS', angle: 102},
    {color: GREEN_CHECK,  initials: 'JT', angle: 153},
    {color: NEBULA_BLUE,  initials: 'PW', angle: 204},
    {color: COSMIC_PURPLE, initials: 'NB', angle: 255},
    {color: STAR_GOLD,    initials: 'CR', angle: 306},
  ];

  const orbitRadius = 200;
  const orbitRotate = interpolate(frame, [0, fps * 10], [0, 360], {extrapolateRight: 'clamp'});

  const clubs = [
    {name: 'Sci-Fi Stargazers', members: 24, currentBook: 'Dune', icon: '🚀'},
    {name: 'Mystery Nebula',    members: 18, currentBook: 'Gone Girl', icon: '🔭'},
    {name: 'Fantasy Comets',    members: 31, currentBook: 'Name of the Wind', icon: '⭐'},
  ];

  return (
    <AbsoluteFill style={{alignItems: 'center', justifyContent: 'center'}}>
      <CosmicBg accent={GLOW_PINK} />

      <div
        style={{
          opacity: fadeIn(frame, fps, 0),
          transform: `translateY(${slideUp(frame, fps, 0)}px)`,
          position: 'absolute',
          top: 36,
          left: 0,
          right: 0,
          textAlign: 'center' as const,
          fontSize: 48,
          fontWeight: 800,
          color: WHITE,
          fontFamily: 'sans-serif',
        }}
      >
        Virtual <span style={{color: STAR_GOLD}}>Book Clubs</span>
      </div>

      {/* Left: animated orbit of members */}
      <div
        style={{
          position: 'absolute',
          left: 120,
          top: '50%',
          transform: 'translateY(-50%)',
          width: 460,
          height: 460,
          opacity: fadeIn(frame, fps, 0.2),
        }}
      >
        {/* Center hub */}
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%,-50%)',
            width: 90,
            height: 90,
            borderRadius: '50%',
            background: `radial-gradient(circle, ${STAR_GOLD}33, ${COSMIC_PURPLE}55)`,
            border: `2px solid ${STAR_GOLD}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 36,
            zIndex: 5,
          }}
        >
          📚
        </div>
        {/* Orbit ring */}
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%,-50%)',
            width: orbitRadius * 2,
            height: orbitRadius * 2,
            borderRadius: '50%',
            border: `1px dashed ${STAR_GOLD}33`,
          }}
        />
        {/* Member avatars */}
        {members.map((m, i) => {
          const angleRad = ((m.angle + orbitRotate) * Math.PI) / 180;
          const x = Math.cos(angleRad) * orbitRadius + 230;
          const y = Math.sin(angleRad) * orbitRadius + 230;
          const s = spring({frame: frame - i * 4, fps, config: {damping: 14}});
          return (
            <div
              key={i}
              style={{
                position: 'absolute',
                left: x - 22,
                top: y - 22,
                width: 44,
                height: 44,
                borderRadius: '50%',
                background: `${m.color}22`,
                border: `2px solid ${m.color}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 13,
                fontWeight: 700,
                color: m.color,
                fontFamily: 'sans-serif',
                transform: `scale(${s})`,
              }}
            >
              {m.initials}
            </div>
          );
        })}
      </div>

      {/* Right: club cards */}
      <div
        style={{
          position: 'absolute',
          right: 80,
          top: '50%',
          transform: 'translateY(-50%)',
          display: 'flex',
          flexDirection: 'column',
          gap: 24,
          width: 480,
        }}
      >
        {clubs.map((club, i) => {
          const delay = 0.4 + i * 0.25;
          const s = spring({frame: frame - delay * fps, fps, config: {damping: 14}});
          return (
            <div
              key={i}
              style={{
                transform: `scale(${s}) translateX(${interpolate(s, [0, 1], [60, 0])}px)`,
                opacity: s,
                background: 'rgba(255,255,255,0.04)',
                border: `1px solid ${STAR_GOLD}44`,
                borderRadius: 18,
                padding: '20px 28px',
                display: 'flex',
                alignItems: 'center',
                gap: 18,
              }}
            >
              <span style={{fontSize: 36}}>{club.icon}</span>
              <div style={{flex: 1}}>
                <div style={{color: STAR_GOLD, fontFamily: 'sans-serif', fontWeight: 700, fontSize: 20}}>
                  {club.name}
                </div>
                <div style={{color: MUTED, fontFamily: 'sans-serif', fontSize: 15, marginTop: 4}}>
                  📖 Now reading: <span style={{color: WHITE}}>{club.currentBook}</span>
                </div>
              </div>
              <div
                style={{
                  background: `${COMET_TEAL}22`,
                  border: `1px solid ${COMET_TEAL}`,
                  borderRadius: 20,
                  padding: '4px 14px',
                  color: COMET_TEAL,
                  fontFamily: 'sans-serif',
                  fontSize: 14,
                  fontWeight: 700,
                }}
              >
                {club.members} members
              </div>
            </div>
          );
        })}
        <div
          style={{
            opacity: fadeIn(frame, fps, 1.3),
            transform: `translateY(${slideUp(frame, fps, 1.3)}px)`,
            textAlign: 'center' as const,
            color: MUTED,
            fontFamily: 'sans-serif',
            fontSize: 16,
            fontStyle: 'italic',
          }}
        >
          Create your own club or join thousands of readers
        </div>
      </div>

      <Sequence from={20} layout="none"><Audio src={staticFile('vo/kb-scene-04-bookclubs.mp3')} volume={1} /></Sequence>
    </AbsoluteFill>
  );
};

// ─── Scene 5: Dashboard & Stats ────────────────────────────────────────────────
export const SceneDashboard: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();

  const stats = [
    {label: 'Books Read',      value: 42,    suffix: '',   color: STAR_GOLD,    icon: '📚'},
    {label: 'Pages This Week', value: 1250,  suffix: '',   color: COMET_TEAL,   icon: '📄'},
    {label: 'Reading Streak',  value: 14,    suffix: 'd',  color: GLOW_PINK,    icon: '🔥'},
    {label: 'Clubs Joined',    value: 3,     suffix: '',   color: GREEN_CHECK,  icon: '👥'},
  ];

  // Animate bar chart for reading progress
  const barHeights = [65, 80, 45, 90, 70, 85, 100];
  const daysOfWeek = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

  return (
    <AbsoluteFill style={{alignItems: 'center', justifyContent: 'center'}}>
      <CosmicBg accent={COMET_TEAL} />

      <div
        style={{
          opacity: fadeIn(frame, fps, 0),
          transform: `translateY(${slideUp(frame, fps, 0)}px)`,
          position: 'absolute',
          top: 36,
          left: 0,
          right: 0,
          textAlign: 'center' as const,
          fontSize: 48,
          fontWeight: 800,
          color: WHITE,
          fontFamily: 'sans-serif',
        }}
      >
        Your <span style={{color: STAR_GOLD}}>Reading Dashboard</span>
      </div>

      {/* Stat cards row */}
      <div
        style={{
          position: 'absolute',
          top: 130,
          left: 80,
          right: 80,
          display: 'flex',
          gap: 28,
        }}
      >
        {stats.map((st, i) => {
          const delay = 0.25 + i * 0.18;
          const s = spring({frame: frame - delay * fps, fps, config: {damping: 14}});
          const countVal = Math.round(
            interpolate(frame, [(delay + 0.2) * fps, (delay + 1.2) * fps], [0, st.value], {
              extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
            }),
          );
          return (
            <div
              key={i}
              style={{
                flex: 1,
                transform: `scale(${s})`,
                opacity: interpolate(s, [0, 1], [0, 1]),
                background: `linear-gradient(135deg, ${st.color}12, rgba(255,255,255,0.03))`,
                border: `1px solid ${st.color}55`,
                borderRadius: 20,
                padding: '24px 20px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 10,
              }}
            >
              <span style={{fontSize: 36}}>{st.icon}</span>
              <div style={{fontSize: 48, fontWeight: 900, color: st.color, fontFamily: 'sans-serif', lineHeight: 1}}>
                {countVal}{st.suffix}
              </div>
              <div style={{fontSize: 14, color: MUTED, fontFamily: 'sans-serif', textAlign: 'center' as const}}>
                {st.label}
              </div>
            </div>
          );
        })}
      </div>

      {/* Reading chart */}
      <div
        style={{
          position: 'absolute',
          bottom: 80,
          left: 80,
          right: 80,
          opacity: fadeIn(frame, fps, 1.2),
        }}
      >
        <div style={{color: MUTED, fontFamily: 'sans-serif', fontSize: 14, marginBottom: 16, letterSpacing: 2, textTransform: 'uppercase' as const}}>
          Weekly Reading Activity (pages)
        </div>
        <div style={{display: 'flex', alignItems: 'flex-end', gap: 16, height: 140}}>
          {barHeights.map((h, i) => {
            const barDelay = 1.4 + i * 0.08;
            const barH = interpolate(
              frame,
              [barDelay * fps, (barDelay + 0.5) * fps],
              [0, h],
              {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'},
            );
            const isToday = i === 6;
            return (
              <div
                key={i}
                style={{
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <div
                  style={{
                    width: '100%',
                    height: barH * 1.3,
                    borderRadius: '6px 6px 0 0',
                    background: isToday
                      ? `linear-gradient(180deg, ${STAR_GOLD}, ${COMET_TEAL})`
                      : `${STAR_GOLD}44`,
                    boxShadow: isToday ? `0 0 16px ${STAR_GOLD}55` : 'none',
                  }}
                />
                <div style={{color: isToday ? STAR_GOLD : MUTED, fontFamily: 'sans-serif', fontSize: 14, fontWeight: isToday ? 700 : 400}}>
                  {daysOfWeek[i]}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <Sequence from={20} layout="none"><Audio src={staticFile('vo/kb-scene-05-dashboard.mp3')} volume={1} /></Sequence>
    </AbsoluteFill>
  );
};

// ─── Scene 6: Tech Stack & Admin ──────────────────────────────────────────────
export const SceneTech: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();

  const techItems = [
    {name: 'Next.js 15',    role: 'App Router + SSR',         color: WHITE,         icon: '▲'},
    {name: 'React 19',      role: 'Modern UI Components',      color: '#61DAFB',     icon: '⚛'},
    {name: 'Tailwind CSS',  role: 'Utility-First Styling',     color: '#38BDF8',     icon: '🎨'},
    {name: 'Supabase',      role: 'Auth + Postgres + Edge Fn', color: '#3ECF8E',     icon: '⚡'},
    {name: 'shadcn/ui',     role: 'Accessible Components',     color: WHITE,         icon: '🧩'},
    {name: 'Framer Motion', role: 'Fluid Animations',          color: '#FF0055',     icon: '🎬'},
  ];

  const adminFeatures = [
    'Book catalog management',
    'User subscription control',
    'Event & club scheduling',
    'Analytics overview',
  ];

  return (
    <AbsoluteFill style={{alignItems: 'center', justifyContent: 'center'}}>
      <CosmicBg accent={NEBULA_BLUE} />

      <div
        style={{
          opacity: fadeIn(frame, fps, 0),
          transform: `translateY(${slideUp(frame, fps, 0)}px)`,
          position: 'absolute',
          top: 36,
          left: 0,
          right: 0,
          textAlign: 'center' as const,
          fontSize: 48,
          fontWeight: 800,
          color: WHITE,
          fontFamily: 'sans-serif',
        }}
      >
        Built with <span style={{color: STAR_GOLD}}>Cutting-Edge Tech</span>
      </div>

      {/* Tech grid */}
      <div
        style={{
          position: 'absolute',
          top: 130,
          left: 80,
          width: 620,
          display: 'grid',
          gridTemplateColumns: '1fr 1fr 1fr',
          gap: 18,
        }}
      >
        {techItems.map((t, i) => {
          const delay = 0.25 + i * 0.15;
          const s = spring({frame: frame - delay * fps, fps, config: {damping: 16}});
          return (
            <div
              key={i}
              style={{
                transform: `scale(${s})`,
                opacity: s,
                background: `${t.color}0D`,
                border: `1px solid ${t.color}44`,
                borderRadius: 16,
                padding: '18px 16px',
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
              }}
            >
              <div style={{fontSize: 28}}>{t.icon}</div>
              <div style={{color: t.color, fontFamily: 'sans-serif', fontWeight: 700, fontSize: 17}}>{t.name}</div>
              <div style={{color: MUTED, fontFamily: 'sans-serif', fontSize: 13}}>{t.role}</div>
            </div>
          );
        })}
      </div>

      {/* Admin panel callout */}
      <div
        style={{
          position: 'absolute',
          right: 80,
          top: 130,
          width: 480,
          opacity: fadeIn(frame, fps, 1.2),
          transform: `translateY(${slideUp(frame, fps, 1.2)}px)`,
          background: 'rgba(255,255,255,0.04)',
          border: `1px solid ${STAR_GOLD}44`,
          borderRadius: 20,
          padding: '28px 32px',
        }}
      >
        <div style={{fontSize: 22, fontWeight: 700, color: STAR_GOLD, fontFamily: 'sans-serif', marginBottom: 20}}>
          🛡️ Admin Suite
        </div>
        {adminFeatures.map((f, i) => {
          const delay = 1.4 + i * 0.2;
          return (
            <div
              key={i}
              style={{
                opacity: fadeIn(frame, fps, delay),
                display: 'flex',
                alignItems: 'center',
                gap: 14,
                marginBottom: 16,
              }}
            >
              <div
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: '50%',
                  background: `${GREEN_CHECK}22`,
                  border: `1px solid ${GREEN_CHECK}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <svg width="12" height="12" viewBox="0 0 12 12">
                  <path d="M2 6l2.5 2.5L10 3" stroke={GREEN_CHECK} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                </svg>
              </div>
              <span style={{color: WHITE, fontFamily: 'sans-serif', fontSize: 18}}>{f}</span>
            </div>
          );
        })}
        <div
          style={{
            marginTop: 16,
            padding: '10px 16px',
            background: `${COMET_TEAL}15`,
            border: `1px solid ${COMET_TEAL}44`,
            borderRadius: 10,
            color: COMET_TEAL,
            fontFamily: 'sans-serif',
            fontSize: 14,
            opacity: fadeIn(frame, fps, 2.2),
          }}
        >
          📱 Fully responsive — desktop, tablet &amp; mobile
        </div>
      </div>

      <Sequence from={20} layout="none"><Audio src={staticFile('vo/kb-scene-06-tech.mp3')} volume={1} /></Sequence>
    </AbsoluteFill>
  );
};

// ─── Scene 7: CTA ──────────────────────────────────────────────────────────────
export const SceneCTA: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();

  const badgeScale = spring({frame, fps, config: {damping: 11}});
  const btnScale   = spring({frame: frame - fps * 1.0, fps, config: {damping: 14}});
  const glowPulse  = interpolate(
    frame % (fps * 1.3),
    [0, fps * 0.65, fps * 1.3],
    [0.5, 1, 0.5],
    {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'},
  );

  // Floating book particles
  const bookEmojis = ['📖', '⭐', '🚀', '🔭', '📚', '💫'];

  return (
    <AbsoluteFill style={{alignItems: 'center', justifyContent: 'center'}}>
      <CosmicBg accent={COMET_TEAL} />

      {/* Orbit rings */}
      <div style={{position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)'}}>
        {[300, 480, 660].map((s, i) => (
          <div key={s} style={{position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)'}}>
            <OrbitRing size={s} delay={i * 8} color={i % 2 === 0 ? STAR_GOLD : COMET_TEAL} />
          </div>
        ))}
      </div>

      {/* Floating emoji particles */}
      {bookEmojis.map((emoji, i) => {
        const angle = (i / bookEmojis.length) * Math.PI * 2;
        const radius = 340;
        const floatOffset = interpolate(
          (frame + i * 20) % (fps * 3),
          [0, fps * 1.5, fps * 3],
          [-12, 12, -12],
          {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'},
        );
        const x = Math.cos(angle) * radius;
        const y = Math.sin(angle) * radius + floatOffset;
        const emojiOp = fadeIn(frame, fps, 0.3 + i * 0.1);
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              top: `calc(50% + ${y}px - 20px)`,
              left: `calc(50% + ${x}px - 20px)`,
              fontSize: 32,
              opacity: emojiOp * 0.6,
            }}
          >
            {emoji}
          </div>
        );
      })}

      {/* Main content */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 28,
          position: 'relative',
          zIndex: 10,
        }}
      >
        <div style={{transform: `scale(${badgeScale})`}}>
          <KometBadge scale={1.2} />
        </div>

        <div
          style={{
            opacity: fadeIn(frame, fps, 0.5),
            transform: `translateY(${slideUp(frame, fps, 0.5)}px)`,
            fontSize: 58,
            fontWeight: 900,
            color: WHITE,
            fontFamily: 'sans-serif',
            textAlign: 'center' as const,
            lineHeight: 1.1,
          }}
        >
          Start Your Reading<br />
          <span style={{color: STAR_GOLD}}>Adventure Today</span>
        </div>

        <div
          style={{
            opacity: fadeIn(frame, fps, 0.8),
            transform: `translateY(${slideUp(frame, fps, 0.8)}px)`,
            fontSize: 22,
            color: MUTED,
            fontFamily: 'sans-serif',
            textAlign: 'center' as const,
            maxWidth: 640,
            lineHeight: 1.5,
          }}
        >
          Join Kane's Komets community. Read more, share more, grow together —
          among the stars.
        </div>

        {/* CTA Button */}
        <div
          style={{
            transform: `scale(${btnScale})`,
            opacity: interpolate(btnScale, [0, 1], [0, 1]),
            background: `linear-gradient(135deg, ${STAR_GOLD}, ${COMET_TEAL})`,
            borderRadius: 16,
            padding: '20px 64px',
            boxShadow: `0 0 ${50 * glowPulse}px ${STAR_GOLD}${Math.round(80 * glowPulse).toString(16).padStart(2, '0')}`,
          }}
        >
          <span
            style={{
              color: VOID,
              fontFamily: 'sans-serif',
              fontWeight: 900,
              fontSize: 26,
              letterSpacing: '1px',
            }}
          >
            Explore Kane's Bookstore →
          </span>
        </div>

        {/* Tech badge row */}
        <div
          style={{
            opacity: fadeIn(frame, fps, 1.5),
            display: 'flex',
            gap: 12,
            alignItems: 'center',
          }}
        >
          {['Next.js 15', 'React 19', 'Supabase', 'Tailwind'].map((t) => (
            <div
              key={t}
              style={{
                background: 'rgba(255,255,255,0.07)',
                border: '1px solid rgba(255,255,255,0.15)',
                borderRadius: 20,
                padding: '5px 14px',
                color: MUTED,
                fontFamily: 'sans-serif',
                fontSize: 13,
              }}
            >
              {t}
            </div>
          ))}
        </div>
      </div>

      <Sequence from={20} layout="none"><Audio src={staticFile('vo/kb-scene-07-cta.mp3')} volume={1} /></Sequence>
    </AbsoluteFill>
  );
};

// ─── Master Composition ────────────────────────────────────────────────────────
// VO durations (ffprobe):  7.99s · 13.70s · 14.74s · 16.70s · 13.15s · 18.77s · 8.57s
// Frames (×30 + 45 buffer): 284  ·  456   ·  487   ·  546   ·  439   ·  608   · 302
// Sum: 284+456+487+546+439+608+302 = 3122
// Transitions: 6 × 20f = 120
// Total: 3122 - 120 = 3002 frames @ 30fps ≈ 100 seconds
export const KanesBookstoreVideo: React.FC = () => {
  return (
    <TransitionSeries>
      <TransitionSeries.Sequence durationInFrames={284}>
        <SceneHero />
      </TransitionSeries.Sequence>
      <TransitionSeries.Transition
        presentation={fade()}
        timing={linearTiming({durationInFrames: 20})}
      />

      <TransitionSeries.Sequence durationInFrames={456}>
        <SceneOverview />
      </TransitionSeries.Sequence>
      <TransitionSeries.Transition
        presentation={slide({direction: 'from-right'})}
        timing={linearTiming({durationInFrames: 20})}
      />

      <TransitionSeries.Sequence durationInFrames={487}>
        <SceneReader />
      </TransitionSeries.Sequence>
      <TransitionSeries.Transition
        presentation={slide({direction: 'from-right'})}
        timing={linearTiming({durationInFrames: 20})}
      />

      <TransitionSeries.Sequence durationInFrames={546}>
        <SceneBookClubs />
      </TransitionSeries.Sequence>
      <TransitionSeries.Transition
        presentation={fade()}
        timing={linearTiming({durationInFrames: 20})}
      />

      <TransitionSeries.Sequence durationInFrames={439}>
        <SceneDashboard />
      </TransitionSeries.Sequence>
      <TransitionSeries.Transition
        presentation={slide({direction: 'from-right'})}
        timing={linearTiming({durationInFrames: 20})}
      />

      <TransitionSeries.Sequence durationInFrames={608}>
        <SceneTech />
      </TransitionSeries.Sequence>
      <TransitionSeries.Transition
        presentation={fade()}
        timing={linearTiming({durationInFrames: 20})}
      />

      <TransitionSeries.Sequence durationInFrames={302}>
        <SceneCTA />
      </TransitionSeries.Sequence>
    </TransitionSeries>
  );
};
