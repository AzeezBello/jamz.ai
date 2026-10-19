import { useState, type KeyboardEvent } from 'react';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Plus, RefreshCw, Wand2, X } from 'lucide-react';

const SUGGESTIONS = [
  'natural vocals',
  'mutation funk',
  'african folk',
  'roots reggae',
  'dub delay',
  'tape echo',
  'groovy organ',
  'analog warmth',
  'ethereal female voice',
  'warm analog synths',
  'brushed drums',
  '6/8',
  'melancholic melodies',
  'driving bassline',
  'lo-fi tape hiss',
  'gospel choir',
  'fingerpicked guitar',
  'four on the floor',
];

const PRODUCTION_BOOSTS = [
  'analog warmth, raw expressive vocals, fat basslines, 1970s live band room feel',
  'tape saturation, lush stereo imaging, crisp percussion transients, deep sub-bass',
  'vintage spring reverb, dub-style delay throws, warm tube compression, organic groove',
  'intimate studio mic placement, rich harmonic overtones, dynamic arrangement',
];

interface StyleTagsProps {
  /** Comma-separated style string — the shape the backend already expects. */
  value: string;
  onChange: (value: string) => void;
}

const split = (value: string) =>
  value
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);

/**
 * Style as removable chips over a plain comma-separated string, plus one-click
 * style boosting and scrollable genre/production suggestion chips inspired by Suno.
 */
export default function StyleTags({ value, onChange }: StyleTagsProps) {
  const [draft, setDraft] = useState('');
  const [boosted, setBoosted] = useState(false);
  const [pickIndex, setPickIndex] = useState(0);
  const tags = split(value);

  const setTags = (next: string[]) => onChange([...new Set(next)].join(', '));

  const commitDraft = () => {
    const parts = split(draft);
    if (parts.length) setTags([...tags, ...parts]);
    setDraft('');
  };

  const handleKey = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter' || event.key === ',') {
      event.preventDefault();
      commitDraft();
    } else if (event.key === 'Backspace' && !draft && tags.length) {
      setTags(tags.slice(0, -1));
    }
  };

  const shuffle = () => {
    const pool = SUGGESTIONS.filter((item) => !tags.includes(item));
    if (!pool.length) return;
    const chosen = pool[pickIndex % pool.length];
    setPickIndex((prev) => prev + 1);
    setTags([...tags, chosen]);
  };

  const boostStyle = () => {
    const pick = PRODUCTION_BOOSTS[pickIndex % PRODUCTION_BOOSTS.length];
    setPickIndex((prev) => prev + 1);
    const parts = split(pick);
    setTags([...tags, ...parts]);
    setBoosted(true);
    toast.success('Enhanced style with studio production details.');
  };

  const availableSuggestions = SUGGESTIONS.filter((item) => !tags.includes(item));

  return (
    <div className="space-y-2.5">
      <div className="flex gap-2">
        <Input
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={handleKey}
          onBlur={commitDraft}
          aria-label="Add a style"
          placeholder="Describe style (e.g. vintage Jamaican roots reggae, analog warmth, dub echo)…"
          className="bg-white/5 border-white/10 text-white placeholder:text-white/30 text-xs"
        />
      </div>

      {value.trim() && (
        <p className="rounded-lg bg-black/40 border border-white/5 px-2.5 py-2 text-xs text-white/75 leading-relaxed">
          {value}
        </p>
      )}

      {tags.length > 0 && (
        <ul className="flex flex-wrap gap-1.5" aria-label="Selected styles">
          {tags.map((tag) => (
            <li key={tag}>
              <button
                type="button"
                onClick={() => setTags(tags.filter((item) => item !== tag))}
                aria-label={`Remove style ${tag}`}
                className="group flex items-center gap-1.5 rounded-full border border-white/15 bg-white/[0.07] px-2.5 py-1 text-xs text-white/80 hover:border-[#ff6b6b]/50 hover:text-white transition-colors"
              >
                {tag}
                <X
                  className="w-3 h-3 text-white/40 group-hover:text-[#ff6b6b]"
                  aria-hidden="true"
                />
              </button>
            </li>
          ))}
        </ul>
      )}

      {/* Bottom style action bar + scrollable suggestion pills (Image 1) */}
      <div className="flex items-center gap-1.5 pt-1">
        <Button
          type="button"
          size="icon"
          variant="ghost"
          onClick={boostStyle}
          aria-label="Enhance style description"
          aria-pressed={boosted}
          className={`h-7 w-7 rounded-full shrink-0 transition-colors ${
            boosted
              ? 'bg-sky-500 text-white hover:bg-sky-400'
              : 'bg-sky-500/20 text-sky-300 hover:bg-sky-500/30 hover:text-white'
          }`}
        >
          <Wand2 className="w-3.5 h-3.5" aria-hidden="true" />
        </Button>

        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={shuffle}
          aria-label="Suggest a style"
          className="h-7 w-7 rounded-full border-white/10 bg-white/5 text-white/70 hover:bg-white/10 hover:text-white shrink-0"
        >
          <RefreshCw className="w-3.5 h-3.5" aria-hidden="true" />
        </Button>

        <div className="flex items-center gap-1.5 overflow-x-auto hide-scrollbar soft-edge-fade-x py-0.5 pr-4 min-w-0 flex-1">
          {availableSuggestions.slice(0, 10).map((suggestion) => (
            <button
              key={suggestion}
              type="button"
              onClick={() => setTags([...tags, suggestion])}
              aria-label={`Add style ${suggestion}`}
              className="flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.04] hover:bg-white/10 px-2.5 py-1 text-[11px] text-white/65 hover:text-white whitespace-nowrap shrink-0 transition-colors"
            >
              <Plus className="w-2.5 h-2.5 text-white/40" aria-hidden="true" />
              {suggestion}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
