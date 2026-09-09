// Lyric writers.
//
// `anthropic` calls Claude. `mock` is a deterministic local writer so the
// feature — and its metering, refunds and UI — is exercisable without an API
// key, the same arrangement as the audio providers in providers.ts.

import Anthropic from 'npm:@anthropic-ai/sdk';
import { z } from 'npm:zod';
import { zodOutputFormat } from 'npm:@anthropic-ai/sdk/helpers/zod';
import { hashString } from './synth.ts';

export interface LyricsRequest {
  prompt: string;
  style: string;
  /** Existing words to rework rather than replace, when the user has some. */
  existing?: string;
}

export interface LyricsResult {
  title: string;
  lyrics: string;
  provider: string;
}

const LyricsSchema = z.object({
  title: z.string().describe('A short, evocative song title. No quotation marks.'),
  lyrics: z
    .string()
    .describe(
      'The full lyric. Use [Verse 1], [Chorus], [Bridge] section markers on their own lines, and a blank line between sections.',
    ),
});

const SYSTEM = `You write song lyrics for a music generation product.

Write lyrics that a singer could actually perform: concrete images over abstractions,
a repeatable chorus, and a shape that fits the requested mood. Mark sections with
[Verse 1], [Chorus], [Bridge] and similar on their own lines.

Keep it to roughly 16-28 lines unless the brief clearly calls for more. Do not
explain your choices or add commentary — return only the title and the lyric.`;

async function writeWithClaude(request: LyricsRequest): Promise<LyricsResult> {
  const apiKey = Deno.env.get('ANTHROPIC_API_KEY');
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY is not set');

  const client = new Anthropic({ apiKey });

  const brief = [
    `Song concept: ${request.prompt}`,
    request.style ? `Style and instrumentation: ${request.style}` : '',
    request.existing
      ? `The writer already has these words. Keep what works, and develop them rather than starting over:\n\n${request.existing}`
      : '',
  ]
    .filter(Boolean)
    .join('\n\n');

  const response = await client.messages.parse({
    model: 'claude-opus-5',
    max_tokens: 16000,
    system: SYSTEM,
    messages: [{ role: 'user', content: brief }],
    output_config: { format: zodOutputFormat(LyricsSchema) },
  });

  // A safety decline returns 200 with no usable content, so check before reading.
  if (response.stop_reason === 'refusal') {
    throw new Error('The model declined to write lyrics for that brief.');
  }

  const parsed = response.parsed_output;
  if (!parsed) throw new Error('The model returned no usable lyrics.');

  return { title: parsed.title, lyrics: parsed.lyrics, provider: 'anthropic' };
}

// --- Keyless fallback --------------------------------------------------------

const OPENERS = [
  'I keep the light on out past midnight',
  'There is a road I never finished',
  'You said the quiet part out loud',
  'Somewhere the radio is still playing',
];
const TURNS = [
  'and I am not the same as I was',
  'and the morning does not ask me why',
  'and the city keeps its own time',
  'and nothing here stays where I left it',
];

function seeded(seed: number) {
  let s = seed || 1;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function titleFrom(prompt: string): string {
  const words = prompt
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .filter((word) => word.length > 3);
  const picked = words.slice(0, 3);
  if (!picked.length) return 'Untitled';
  return picked.map((word) => word[0].toUpperCase() + word.slice(1)).join(' ');
}

/**
 * Deterministic stand-in. It is openly a placeholder — it recombines the brief
 * rather than writing about it — but it exercises the whole path, and being
 * seeded means the same brief gives the same words.
 */
function writeLocally(request: LyricsRequest): LyricsResult {
  const rand = seeded(hashString(`${request.prompt}|${request.style}`));
  const pick = <T>(list: T[]) => list[Math.floor(rand() * list.length)];
  const subject = request.prompt.trim().replace(/[.!?]+$/, '') || 'this feeling';

  const lyrics = [
    '[Verse 1]',
    pick(OPENERS) + ',',
    pick(TURNS) + '.',
    `Thinking about ${subject},`,
    'counting what the dark gave back.',
    '',
    '[Chorus]',
    `So here is to ${subject},`,
    'and every version I let go.',
    'If you are listening, I am still here —',
    'louder than I was before.',
    '',
    '[Verse 2]',
    pick(OPENERS) + ',',
    pick(TURNS) + '.',
    'I traded quiet for the noise,',
    'and the noise gave me a name.',
    '',
    '[Chorus]',
    `So here is to ${subject},`,
    'and every version I let go.',
    'If you are listening, I am still here —',
    'louder than I was before.',
  ].join('\n');

  return { title: titleFrom(request.prompt), lyrics, provider: 'mock' };
}

export async function writeLyrics(request: LyricsRequest): Promise<LyricsResult> {
  const provider =
    Deno.env.get('LYRICS_PROVIDER') ?? (Deno.env.get('ANTHROPIC_API_KEY') ? 'anthropic' : 'mock');
  switch (provider) {
    case 'anthropic':
      return await writeWithClaude(request);
    case 'mock':
      return writeLocally(request);
    default:
      throw new Error(`unknown LYRICS_PROVIDER: ${provider}`);
  }
}
