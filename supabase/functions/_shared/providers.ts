// Generation providers.
//
// `mock` renders audio locally and needs no third-party account, so the whole
// pipeline is exercisable from day one. `replicate` is the seam for a hosted
// music model: set GENERATION_PROVIDER=replicate plus the two REPLICATE_* env
// vars and nothing else in the system changes.

import { synthesize } from './synth.ts';

export interface GenerationRequest {
  prompt: string;
  lyrics: string;
  style: string;
  seconds: number;
  instrumental: boolean;
  /** Distinguishes one take from another for the same prompt. */
  seed: string;
}

export interface GenerationOutput {
  bytes: Uint8Array;
  contentType: string;
  extension: string;
  durationSeconds: number;
  metadata: Record<string, unknown>;
}

/** Report progress; resolving to `true` means the job was cancelled — stop. */
export type ProgressFn = (percent: number, message: string) => Promise<boolean>;

export class CancelledError extends Error {
  constructor() {
    super('cancelled');
  }
}

export interface GenerationProvider {
  readonly id: string;
  generate(req: GenerationRequest, onProgress: ProgressFn): Promise<GenerationOutput>;
}

const STAGES: Array<[number, string]> = [
  [15, 'Analyzing prompt…'],
  [30, 'Composing melody…'],
  [50, 'Arranging instruments…'],
  [70, 'Performing take…'],
  [85, 'Mixing audio…'],
  [95, 'Mastering…'],
];

const mockProvider: GenerationProvider = {
  id: 'mock',
  async generate(req, onProgress) {
    for (const [percent, message] of STAGES) {
      if (await onProgress(percent, message)) throw new CancelledError();
      await new Promise((r) => setTimeout(r, 700));
    }

    const result = synthesize({
      prompt: `${req.prompt} ${req.style} ${req.lyrics}`.trim(),
      seconds: req.seconds,
      instrumental: req.instrumental,
      seed: req.seed,
    });

    return {
      bytes: result.wav,
      contentType: 'audio/wav',
      extension: 'wav',
      durationSeconds: result.durationSeconds,
      metadata: { bpm: result.bpm, key: result.key, sampleRate: result.sampleRate },
    };
  },
};

const replicateProvider: GenerationProvider = {
  id: 'replicate',
  async generate(req, onProgress) {
    const token = Deno.env.get('REPLICATE_API_TOKEN');
    const version = Deno.env.get('REPLICATE_MODEL_VERSION');
    if (!token || !version) {
      throw new Error('REPLICATE_API_TOKEN and REPLICATE_MODEL_VERSION must be set');
    }

    if (await onProgress(15, 'Submitting to model…')) throw new CancelledError();

    const created = await fetch('https://api.replicate.com/v1/predictions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        version,
        input: {
          prompt: [req.prompt, req.style].filter(Boolean).join(', '),
          duration: req.seconds,
        },
      }),
    });
    if (!created.ok) throw new Error(`replicate: ${created.status} ${await created.text()}`);

    let prediction = await created.json();
    let tick = 0;

    while (['starting', 'processing'].includes(prediction.status)) {
      if (await onProgress(Math.min(20 + tick * 4, 92), 'Generating audio…')) {
        // Best effort: stop paying for work nobody wants.
        await fetch(prediction.urls?.cancel, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        }).catch(() => {});
        throw new CancelledError();
      }
      await new Promise((r) => setTimeout(r, 2500));
      tick++;
      const poll = await fetch(prediction.urls.get, {
        headers: { Authorization: `Bearer ${token}` },
      });
      prediction = await poll.json();
    }

    if (prediction.status !== 'succeeded') {
      throw new Error(`replicate: ${prediction.status}: ${prediction.error ?? 'no output'}`);
    }

    const url = Array.isArray(prediction.output) ? prediction.output[0] : prediction.output;
    if (typeof url !== 'string') throw new Error('replicate: unexpected output shape');

    if (await onProgress(95, 'Downloading master…')) throw new CancelledError();

    const audio = await fetch(url);
    if (!audio.ok) throw new Error(`replicate: download failed ${audio.status}`);
    const bytes = new Uint8Array(await audio.arrayBuffer());
    const contentType = audio.headers.get('Content-Type') ?? 'audio/mpeg';
    const extension = contentType.includes('wav') ? 'wav' : 'mp3';

    return {
      bytes,
      contentType,
      extension,
      durationSeconds: req.seconds,
      metadata: { predictionId: prediction.id, model: version },
    };
  },
};

export function getProvider(): GenerationProvider {
  const id = Deno.env.get('GENERATION_PROVIDER') ?? 'mock';
  switch (id) {
    case 'replicate':
      return replicateProvider;
    case 'mock':
      return mockProvider;
    default:
      throw new Error(`unknown GENERATION_PROVIDER: ${id}`);
  }
}

const FILLER = new Set([
  'make',
  'create',
  'generate',
  'write',
  'a',
  'an',
  'the',
  'song',
  'track',
  'beat',
  'tune',
  'about',
  'for',
  'with',
  'that',
  'of',
  'in',
  'on',
  'me',
  'please',
  'some',
  'and',
]);

/** Turn a prompt into something that reads like a title in a library row. */
export function titleFromPrompt(prompt: string): string {
  const words = prompt
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s'-]/gu, ' ')
    .split(/\s+/)
    .filter(Boolean);

  const meaningful = words.filter((w) => !FILLER.has(w));
  const picked = (meaningful.length ? meaningful : words).slice(0, 4);
  if (!picked.length) return 'Untitled Creation';

  return picked
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
    .slice(0, 80);
}
