import {Composition} from 'remotion';
import {OnlyCryptoVideo} from './OnlyCrypto';
import {KanesBookstoreVideo} from './KanesBookstore';

// ── OnlyCrypto ───────────────────────────────────────────────────────────────
// Scene durations: 276+345+372+510+546+492+348 = 2889
// Transitions: 6 × 20f = 120
// Total: 2889 - 120 = 2769 frames @ 30fps ≈ 92 seconds
const ONLYCRYPTO_DURATION = 2769;

// ── Kane's Bookstore Reader ──────────────────────────────────────────────────
// Scene durations: 240+330+390+420+390+390+360 = 2520
// Transitions: 6 × 20f = 120
// Total: 2520 - 120 = 2400 frames @ 30fps = 80 seconds
const KANES_DURATION = 2400;

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="KanesBookstore"
        component={KanesBookstoreVideo}
        durationInFrames={KANES_DURATION}
        fps={30}
        width={1920}
        height={1080}
      />
      <Composition
        id="OnlyCrypto"
        component={OnlyCryptoVideo}
        durationInFrames={ONLYCRYPTO_DURATION}
        fps={30}
        width={1920}
        height={1080}
      />
    </>
  );
};
