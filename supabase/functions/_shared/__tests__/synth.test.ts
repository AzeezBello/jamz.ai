import { describe, expect, it } from 'vitest';
import { clampDuration, hashString, MAX_SECONDS, MIN_SECONDS, synthesize } from '../synth.ts';
import { titleFromPrompt } from '../providers.ts';

/** Little-endian 32-bit read, matching the WAV encoder. */
function readU32(bytes: Uint8Array, offset: number): number {
  return new DataView(bytes.buffer, bytes.byteOffset).getUint32(offset, true);
}

function readAscii(bytes: Uint8Array, offset: number, length: number): string {
  return new TextDecoder().decode(bytes.subarray(offset, offset + length));
}

describe('synthesize', () => {
  const result = synthesize({
    prompt: 'a melancholic indie song about rain',
    seconds: 8,
    instrumental: false,
  });

  it('emits a RIFF/WAVE container', () => {
    expect(readAscii(result.wav, 0, 4)).toBe('RIFF');
    expect(readAscii(result.wav, 8, 4)).toBe('WAVE');
    expect(readAscii(result.wav, 36, 4)).toBe('data');
  });

  it('declares a data chunk that matches the bytes it actually wrote', () => {
    const declared = readU32(result.wav, 40);
    expect(declared).toBe(result.wav.length - 44);
  });

  it('declares a RIFF size consistent with the file length', () => {
    expect(readU32(result.wav, 4)).toBe(result.wav.length - 8);
  });

  it('produces the requested duration at the reported sample rate', () => {
    const samples = (result.wav.length - 44) / 2;
    expect(samples).toBe(8 * result.sampleRate);
    expect(result.durationSeconds).toBe(8);
  });

  it('produces audible signal rather than silence', () => {
    const view = new DataView(result.wav.buffer, result.wav.byteOffset);
    let peak = 0;
    for (let i = 44; i < result.wav.length - 1; i += 2) {
      peak = Math.max(peak, Math.abs(view.getInt16(i, true)));
    }
    expect(peak).toBeGreaterThan(1000);
  });

  it('is deterministic for the same prompt', () => {
    const again = synthesize({
      prompt: 'a melancholic indie song about rain',
      seconds: 8,
      instrumental: false,
    });
    expect(again.bpm).toBe(result.bpm);
    expect(again.key).toBe(result.key);
    expect(again.wav.length).toBe(result.wav.length);
  });

  it('gives a different take for a different seed', () => {
    // A variation must not be a byte-identical copy of the original.
    const a = synthesize({
      prompt: 'a steady indie track',
      seconds: 8,
      instrumental: false,
      seed: 'one',
    });
    const b = synthesize({
      prompt: 'a steady indie track',
      seconds: 8,
      instrumental: false,
      seed: 'two',
    });
    expect(Buffer.from(a.wav).equals(Buffer.from(b.wav))).toBe(false);
  });

  it('is still reproducible for the same prompt and seed', () => {
    const a = synthesize({
      prompt: 'a steady indie track',
      seconds: 8,
      instrumental: false,
      seed: 'one',
    });
    const b = synthesize({
      prompt: 'a steady indie track',
      seconds: 8,
      instrumental: false,
      seed: 'one',
    });
    expect(Buffer.from(a.wav).equals(Buffer.from(b.wav))).toBe(true);
  });

  it('reads the mood out of the prompt', () => {
    expect(
      synthesize({ prompt: 'a sad lonely ballad', seconds: 8, instrumental: false }).key,
    ).toMatch(/minor$/);
    expect(
      synthesize({ prompt: 'a happy bright summer party', seconds: 8, instrumental: false }).key,
    ).toMatch(/major$/);
  });

  it('applies the duration clamp it advertises', () => {
    expect(synthesize({ prompt: 'x', seconds: 0, instrumental: true }).durationSeconds).toBe(
      MIN_SECONDS,
    );
  });
});

describe('clampDuration', () => {
  it('caps a runaway request instead of allocating unbounded memory', () => {
    expect(clampDuration(100_000)).toBe(MAX_SECONDS);
  });

  it('raises a too-short request to the minimum', () => {
    expect(clampDuration(0)).toBe(MIN_SECONDS);
    expect(clampDuration(-30)).toBe(MIN_SECONDS);
  });

  it('passes a normal request through', () => {
    expect(clampDuration(45)).toBe(45);
  });

  it('falls back to the minimum for NaN', () => {
    expect(clampDuration(NaN)).toBe(MIN_SECONDS);
  });
});

describe('hashString', () => {
  it('is stable and differs between inputs', () => {
    expect(hashString('abc')).toBe(hashString('abc'));
    expect(hashString('abc')).not.toBe(hashString('abd'));
  });
});

describe('titleFromPrompt', () => {
  it('strips the instruction wrapper', () => {
    expect(titleFromPrompt('Make a country song about Jess being late')).toBe(
      'Country Jess Being Late',
    );
  });

  it('keeps at most four words', () => {
    expect(titleFromPrompt('one two three four five six').split(' ')).toHaveLength(4);
  });

  it('falls back when the prompt is only filler', () => {
    expect(titleFromPrompt('make a song')).toBe('Make A Song');
  });

  it('falls back when the prompt has no usable words', () => {
    expect(titleFromPrompt('!!! ???')).toBe('Untitled Creation');
  });
});
