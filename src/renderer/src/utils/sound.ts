import { useSettingsStore } from '../store/useSettingsStore';

// Helper to get AudioContext safely
const getAudioContext = () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
  if (!AudioContext) return null;
  return new AudioContext();
};

const createOscillator = (
  ctx: AudioContext,
  freq: number,
  startTime: number,
  duration: number,
  type: OscillatorType = 'sine',
  vol: number = 1
) => {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.type = type;
  osc.frequency.value = freq;

  // Smooth Envelope
  gain.gain.setValueAtTime(0, startTime);
  gain.gain.linearRampToValueAtTime(vol, startTime + 0.01); // Quick attack
  gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration); // Smooth decay

  osc.start(startTime);
  osc.stop(startTime + duration + 0.1);
};

export const playTimerCompletionSound = (repeat: boolean = false, isBreak: boolean = false) => {
  try {
    const { settings } = useSettingsStore.getState();
    if (!settings.endSound) return;

    const volume = settings.taskSoundVolume ?? settings.soundVolume ?? 0.5;
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;

    if (isBreak) {
      // Break Done: Gentle, relaxed chime (Pentatonic: E5, G5, A5)
      // Soft and airy
      createOscillator(ctx, 659.25, now, 1.0, 'sine', 0.2 * volume); // E5
      createOscillator(ctx, 783.99, now + 0.2, 1.2, 'sine', 0.2 * volume); // G5
      createOscillator(ctx, 880.00, now + 0.4, 1.5, 'sine', 0.15 * volume); // A5
    } else {
      // Focus Done: Energetic, rewarding (Major 9th: C5, E5, G5, B5, D6)
      // Bright and triumphant
      const notes = [
        523.25, // C5
        659.25, // E5
        783.99, // G5
        987.77, // B5
        1174.66 // D6
      ];

      notes.forEach((freq, i) => {
        createOscillator(ctx, freq, now + i * 0.06, 1.5 - i * 0.1, 'sine', 0.2 * volume);
      });
      
      // Add a subtle "shimmer" with triangle wave for brightness on the root
      createOscillator(ctx, 1046.50, now + 0.1, 0.8, 'triangle', 0.05 * volume); // C6
    }

    // Handle repeat for high urgency (only relevant for focus usually, or alarm mode)
    if (repeat) {
       // ... existing repeat logic if needed, but simplified here for now ...
       // For now, let's trust the single play is enough or rely on notification interaction
    }

    setTimeout(() => {
      if (ctx.state !== 'closed') ctx.close().catch(console.error);
    }, 3000);

  } catch (e) {
    console.error('Failed to play timer sound', e);
  }
};

export const playTaskCompletionSound = () => {
  try {
    const { settings } = useSettingsStore.getState();
    if (settings.taskSoundEnabled === false) return;

    const volume = settings.taskSoundVolume ?? settings.soundVolume ?? 0.5;
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;

    // Satisfying "Pop" / "Ding"
    // Quick ascending interval: A5 -> C#6 -> E6 (Major Triad)
    createOscillator(ctx, 880.00, now, 0.15, 'sine', 0.3 * volume);
    createOscillator(ctx, 1108.73, now + 0.05, 0.25, 'sine', 0.3 * volume);
    createOscillator(ctx, 1318.51, now + 0.10, 0.35, 'sine', 0.2 * volume); // E6

    // Subtle high sparkle for crispness
    createOscillator(ctx, 2200, now, 0.1, 'triangle', 0.08 * volume);

    setTimeout(() => {
      if (ctx.state !== 'closed') ctx.close().catch(console.error);
    }, 500);

  } catch (e) {
    console.error('Failed to play task sound', e);
  }
};

export const playTimerStartSound = () => {
  try {
    const { settings } = useSettingsStore.getState();
    const volume = (settings.taskSoundVolume ?? 0.5) * 0.6; // Slightly quieter
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    
    // Gentle, pleasant chime - soft ascending tones
    // Using sine waves for smoother sound
    createOscillator(ctx, 523.25, now, 0.1, 'sine', 0.15 * volume); // C5 - gentle start
    createOscillator(ctx, 659.25, now + 0.05, 0.1, 'sine', 0.2 * volume); // E5 - warm middle
    createOscillator(ctx, 783.99, now + 0.1, 0.15, 'sine', 0.15 * volume); // G5 - soft end

    setTimeout(() => {
      if (ctx.state !== 'closed') ctx.close().catch(console.error);
    }, 300);
  } catch (e) { console.error(e); }
};

export const playTimerPauseSound = () => {
  try {
    const { settings } = useSettingsStore.getState();
    const volume = (settings.taskSoundVolume ?? 0.5) * 0.6;
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    
    // "Power down" feel (Descending pitch)
    createOscillator(ctx, 400, now, 0.1, 'sine', 0.2 * volume);
    createOscillator(ctx, 300, now + 0.05, 0.15, 'sine', 0.2 * volume);

    setTimeout(() => {
      if (ctx.state !== 'closed') ctx.close().catch(console.error);
    }, 300);
  } catch (e) { console.error(e); }
};
