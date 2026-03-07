import {Composition} from 'remotion';
import {OnlyCryptoVideo} from './OnlyCrypto';
import {KanesBookstoreVideo} from './KanesBookstore';
import {KanesBookstoreV2} from './KanesV2';

// ── OnlyCrypto ───────────────────────────────────────────────────────────────
// Scene durations: 276+345+372+510+546+492+348 = 2889
// Transitions: 6 × 20f = 120
// Total: 2889 - 120 = 2769 frames @ 30fps ≈ 92 seconds
const ONLYCRYPTO_DURATION = 2769;

// ── Kane's Bookstore Reader ──────────────────────────────────────────────────
// Scene durations: 284+456+487+546+439+608+302 = 3122
// Transitions: 6 × 20f = 120
// Total: 3122 - 120 = 3002 frames @ 30fps ≈ 100 seconds
const KANES_DURATION = 3002;

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="KanesBookstoreV2"
        component={KanesBookstoreV2}
        durationInFrames={2414}
        fps={30}
        width={1920}
        height={1080}
      />
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
