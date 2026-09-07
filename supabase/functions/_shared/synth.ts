// A small deterministic synthesizer.
//
// The point is not musical ambition: it is that the generation pipeline should
// produce a real, decodable audio file so playback, seeking, download and
// storage are exercised end to end. Swap this for a hosted model by
// implementing the GenerationProvider interface in providers.ts.

const SAMPLE_RATE = 32000;

/** xorshift32 — same prompt in, same song out. */
function seededRandom(seed: number) {
  let s = seed || 1;
  return () => {
    s ^= s << 13;
    s >>>= 0;
    s ^= s >> 17;
    s ^= s << 5;
    s >>>= 0;
    return s / 4294967296;
  };
}

export function hashString(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

const MINOR = [0, 2, 3, 5, 7, 8, 10];
const MAJOR = [0, 2, 4, 5, 7, 9, 11];
const MINOR_PROGRESSION = [0, 5, 3, 4]; // i – VI – iv – v
const MAJOR_PROGRESSION = [0, 4, 5, 3]; // I – V – vi – IV

const midiToHz = (midi: number) => 440 * Math.pow(2, (midi - 69) / 12);

export const MIN_SECONDS = 8;
export const MAX_SECONDS = 300;

/** Keeps a bad `seconds` input from allocating an unbounded buffer. */
export function clampDuration(seconds: number): number {
  if (!Number.isFinite(seconds)) return MIN_SECONDS;
  return Math.max(MIN_SECONDS, Math.min(MAX_SECONDS, Math.floor(seconds)));
}

// A wavetable is roughly an order of magnitude cheaper than Math.sin per
// sample, which matters: a five-minute render is ~10M samples with several
// voices layered on each one.
const TABLE_SIZE = 4096;
const SINE = new Float32Array(TABLE_SIZE + 1);
for (let i = 0; i <= TABLE_SIZE; i++) {
  SINE[i] = Math.sin((2 * Math.PI * i) / TABLE_SIZE);
}

/** `phase` is a normalised 0..1 position in the cycle. */
function osc(phase: number): number {
  const x = (phase - Math.floor(phase)) * TABLE_SIZE;
  const index = x | 0;
  const frac = x - index;
  return SINE[index] + (SINE[index + 1] - SINE[index]) * frac;
}

function adsr(t: number, dur: number, a: number, d: number, s: number, r: number): number {
  if (t < a) return t / a;
  if (t < a + d) return 1 - (1 - s) * ((t - a) / d);
  if (t < dur - r) return s;
  if (t < dur) return s * (1 - (t - (dur - r)) / r);
  return 0;
}

export interface SynthOptions {
  prompt: string;
  seconds: number;
  instrumental: boolean;
}

export interface SynthResult {
  wav: Uint8Array;
  durationSeconds: number;
  bpm: number;
  key: string;
  sampleRate: number;
}

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

export function synthesize({ prompt, seconds, instrumental }: SynthOptions): SynthResult {
  const seed = hashString(prompt);
  const rand = seededRandom(seed);

  const isMinor = /sad|melanchol|dark|goth|moody|lo-?fi|rain|lonely|heart/i.test(prompt)
    ? true
    : /happy|upbeat|summer|party|edm|dance|joy|bright/i.test(prompt)
      ? false
      : rand() > 0.45;

  const scale = isMinor ? MINOR : MAJOR;
  const progression = isMinor ? MINOR_PROGRESSION : MAJOR_PROGRESSION;

  const bpm = /edm|dance|drum|energetic|workout|hype/i.test(prompt)
    ? 124 + Math.floor(rand() * 12)
    : /lo-?fi|ballad|slow|ambient|sleep/i.test(prompt)
      ? 72 + Math.floor(rand() * 12)
      : 92 + Math.floor(rand() * 24);

  const root = 48 + Math.floor(rand() * 12); // C3–B3
  const beat = 60 / bpm;
  const bar = beat * 4;
  const total = clampDuration(seconds);
  const n = Math.floor(total * SAMPLE_RATE);
  const out = new Float32Array(n);

  const degreeToMidi = (base: number, degree: number) => {
    const octave = Math.floor(degree / scale.length);
    return base + scale[((degree % scale.length) + scale.length) % scale.length] + octave * 12;
  };

  // --- Harmony: a sustained triad pad per bar -------------------------------
  const barCount = Math.ceil(total / bar);
  for (let b = 0; b < barCount; b++) {
    const degree = progression[b % progression.length];
    const chord = [0, 2, 4].map((i) => degreeToMidi(root + 12, degree + i));
    const start = b * bar;
    const dur = Math.min(bar, total - start);
    if (dur <= 0) break;

    const offset = Math.floor(start * SAMPLE_RATE);
    const length = Math.floor(dur * SAMPLE_RATE);

    for (const midi of chord) {
      const freq = midiToHz(midi);
      const detune = 1 + (rand() - 0.5) * 0.004;
      const increment = (freq * detune) / SAMPLE_RATE;
      let phase = 0;

      for (let i = 0; i < length; i++) {
        const env = adsr(i / SAMPLE_RATE, dur, 0.25, 0.3, 0.7, 0.4) * 0.11;
        out[offset + i] += env * (osc(phase) + 0.35 * osc(phase * 2) + 0.18 * osc(phase * 3));
        phase += increment;
        if (phase >= 1) phase -= 1;
      }
    }
  }

  // --- Bass: root of the bar, one note per beat -----------------------------
  for (let b = 0; b < barCount; b++) {
    const degree = progression[b % progression.length];
    const midi = degreeToMidi(root - 12, degree);
    const freq = midiToHz(midi);
    for (let beatIdx = 0; beatIdx < 4; beatIdx++) {
      const start = b * bar + beatIdx * beat;
      if (start >= total) break;
      const dur = Math.min(beat * 0.9, total - start);
      const offset = Math.floor(start * SAMPLE_RATE);
      const length = Math.floor(dur * SAMPLE_RATE);
      const increment = freq / SAMPLE_RATE;
      let phase = 0;

      for (let i = 0; i < length; i++) {
        const env = adsr(i / SAMPLE_RATE, dur, 0.005, 0.08, 0.6, 0.08) * 0.3;
        // Fattening the sine toward a square reads as a rounded synth bass.
        const sample = osc(phase);
        out[offset + i] += env * Math.sign(sample) * Math.sqrt(Math.abs(sample));
        phase += increment;
        if (phase >= 1) phase -= 1;
      }
    }
  }

  // --- Lead: eighth-note melody, skipped for instrumental-off variety -------
  const leadGain = instrumental ? 0.22 : 0.26;
  let degree = 0;
  for (let step = 0; step * (beat / 2) < total; step++) {
    const start = step * (beat / 2);
    if (rand() < 0.28) continue; // rests keep it from droning
    degree += Math.floor(rand() * 5) - 2;
    degree = Math.max(-2, Math.min(9, degree));
    const midi = degreeToMidi(root + 24, degree);
    const freq = midiToHz(midi);
    const dur = Math.min((beat / 2) * 0.85, total - start);
    if (dur <= 0) break;
    const offset = Math.floor(start * SAMPLE_RATE);
    const length = Math.floor(dur * SAMPLE_RATE);
    const increment = freq / SAMPLE_RATE;
    let phase = 0;

    for (let i = 0; i < length; i++) {
      const env = adsr(i / SAMPLE_RATE, dur, 0.01, 0.06, 0.5, 0.06) * leadGain;
      out[offset + i] += env * (osc(phase) + 0.25 * osc(phase * 2));
      phase += increment;
      if (phase >= 1) phase -= 1;
    }
  }

  // --- Drums ----------------------------------------------------------------
  const addKick = (start: number) => {
    const offset = Math.floor(start * SAMPLE_RATE);
    const length = Math.floor(0.18 * SAMPLE_RATE);
    let phase = 0;

    for (let i = 0; i < length && offset + i < n; i++) {
      const t = i / SAMPLE_RATE;
      // Pitch sweeps down from a click to a body tone.
      const freq = 120 * Math.exp(-t * 28) + 45;
      out[offset + i] += Math.exp(-t * 16) * 0.55 * osc(phase);
      phase += freq / SAMPLE_RATE;
      if (phase >= 1) phase -= 1;
    }
  };
  const addNoise = (start: number, dur: number, gain: number, decay: number) => {
    const offset = Math.floor(start * SAMPLE_RATE);
    const length = Math.floor(dur * SAMPLE_RATE);
    for (let i = 0; i < length && offset + i < n; i++) {
      out[offset + i] += Math.exp((-i / SAMPLE_RATE) * decay) * gain * (rand() * 2 - 1);
    }
  };

  for (let b = 0; b < barCount; b++) {
    for (let beatIdx = 0; beatIdx < 4; beatIdx++) {
      const at = b * bar + beatIdx * beat;
      if (at >= total) break;
      if (beatIdx === 0 || beatIdx === 2) addKick(at);
      if (beatIdx === 1 || beatIdx === 3) addNoise(at, 0.12, 0.22, 34);
      addNoise(at + beat / 2, 0.04, 0.06, 90);
    }
  }

  // --- Master: fades, soft clip, normalise ---------------------------------
  const fade = Math.floor(1.2 * SAMPLE_RATE);
  for (let i = 0; i < fade && i < n; i++) {
    out[i] *= i / fade;
    out[n - 1 - i] *= i / fade;
  }

  let peak = 0;
  for (let i = 0; i < n; i++) {
    out[i] = Math.tanh(out[i] * 1.1);
    const a = Math.abs(out[i]);
    if (a > peak) peak = a;
  }
  const norm = peak > 0 ? 0.89 / peak : 1;

  return {
    wav: encodeWav(out, norm, SAMPLE_RATE),
    durationSeconds: Math.round(total),
    bpm,
    key: `${NOTE_NAMES[root % 12]} ${isMinor ? 'minor' : 'major'}`,
    sampleRate: SAMPLE_RATE,
  };
}

/** 16-bit mono PCM WAV. */
function encodeWav(samples: Float32Array, gain: number, sampleRate: number): Uint8Array {
  const dataBytes = samples.length * 2;
  const buffer = new ArrayBuffer(44 + dataBytes);
  const view = new DataView(buffer);
  const ascii = (offset: number, text: string) => {
    for (let i = 0; i < text.length; i++) view.setUint8(offset + i, text.charCodeAt(i));
  };

  ascii(0, 'RIFF');
  view.setUint32(4, 36 + dataBytes, true);
  ascii(8, 'WAVE');
  ascii(12, 'fmt ');
  view.setUint32(16, 16, true); // PCM chunk size
  view.setUint16(20, 1, true); // format = PCM
  view.setUint16(22, 1, true); // channels
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true); // block align
  view.setUint16(34, 16, true); // bits per sample
  ascii(36, 'data');
  view.setUint32(40, dataBytes, true);

  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i] * gain));
    view.setInt16(44 + i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }
  return new Uint8Array(buffer);
}
