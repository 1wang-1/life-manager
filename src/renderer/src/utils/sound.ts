import { useSettingsStore } from '../store/useSettingsStore';

// Helper to get AudioContext safely
const getAudioContext = () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
  if (!AudioContext) return null;
  return new AudioContext();
};

export const playTimerCompletionSound = (repeat: boolean = false) => {
  try {
    const { settings } = useSettingsStore.getState();
    if (!settings.endSound) return;

    const volume = settings.taskSoundVolume ?? settings.soundVolume ?? 0.5;
    const ctx = getAudioContext();
    if (!ctx) return;
    
    // Create a chord: C5 (523.25), E5 (659.25), G5 (783.99) - C Major
    const notes = [523.25, 659.25, 783.99, 1046.50]; // Add C6 for brightness
    
    const playChord = (startTime: number) => {
      notes.forEach((freq, index) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        
        osc.connect(gain);
        gain.connect(ctx.destination);
        
        osc.type = 'sine'; // Sine is smooth
        osc.frequency.value = freq;
        
        // Staggered entry for a "strummed" or "arpeggiated" feel (very fast)
        const entryTime = startTime + (index * 0.05);
        
        // ADSR Envelope
        // Attack
        gain.gain.setValueAtTime(0, entryTime);
        gain.gain.linearRampToValueAtTime(0.3 * volume, entryTime + 0.05);
        // Decay & Sustain
        gain.gain.exponentialRampToValueAtTime(0.1 * volume, entryTime + 0.3);
        // Release
        gain.gain.exponentialRampToValueAtTime(0.001, entryTime + 1.5);
        
        osc.start(entryTime);
        osc.stop(entryTime + 1.5);
      });
    };

    playChord(ctx.currentTime);

    // If repeat is requested (Level 3), loop it
    if (repeat) {
      const interval = setInterval(() => {
        if (ctx.state === 'closed') {
          clearInterval(interval);
          return;
        }
        playChord(ctx.currentTime);
      }, 2000); // Repeat every 2 seconds

      setTimeout(() => {
        clearInterval(interval);
        ctx.close().catch(console.error);
      }, 30000);
    } else {
      // Auto close after sound finishes
      setTimeout(() => {
        ctx.close().catch(console.error);
      }, 2000);
    }

  } catch (e) {
    console.error('Failed to play timer completion sound', e);
  }
};

export const playTaskCompletionSound = () => {
  try {
    const { settings } = useSettingsStore.getState();
    // Check if task sound is enabled (we will add this setting)
    if (settings.taskSoundEnabled === false) return;

    const volume = settings.taskSoundVolume ?? settings.soundVolume ?? 0.5;
    const ctx = getAudioContext();
    if (!ctx) return;

    // A simple, satisfying "ding" or "pop"
    // E6 (1318.51) -> G6 (1567.98) - High pitch, quick ascending
    const notes = [1318.51, 1567.98];
    
    notes.forEach((freq, index) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.type = 'sine';
      osc.frequency.value = freq;
      
      const startTime = ctx.currentTime + (index * 0.08);
      
      // Short envelope
      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(0.2 * volume, startTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.3);
      
      osc.start(startTime);
      osc.stop(startTime + 0.3);
    });

    setTimeout(() => {
      ctx.close().catch(console.error);
    }, 500);

  } catch (e) {
    console.error('Failed to play task completion sound', e);
  }
};
