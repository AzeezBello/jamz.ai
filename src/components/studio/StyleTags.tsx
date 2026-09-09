import { useState, type KeyboardEvent } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Dice5, X } from 'lucide-react';

const SUGGESTIONS = [
  'ethereal female voice',
  'warm analog synths',
  'brushed drums',
  '6/8',
  'melancholic melodies',
  'gentle, slow',
  'driving bassline',
  'lo-fi tape hiss',
  'gospel choir',
  'dub delay',
  'fingerpicked guitar',
  'four on the floor',
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
 * Style as removable chips over a plain comma-separated string, so the stored
 * value stays exactly what the generator already reads.
 */
export default function StyleTags({ value, onChange }: StyleTagsProps) {
  const [draft, setDraft] = useState('');
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
      // Backspace on an empty field removes the last chip, as in every other
      // tag input people have used.
      setTags(tags.slice(0, -1));
    }
  };

  const shuffle = () => {
    const pool = SUGGESTIONS.filter((item) => !tags.includes(item));
    if (!pool.length) return;
    setTags([...tags, pool[Math.floor(Math.random() * pool.length)]]);
  };

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <Input
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={handleKey}
          onBlur={commitDraft}
          aria-label="Add a style"
          placeholder="Dream pop, warm analog synths, brushed drums"
          className="bg-white/5 border-white/10 text-white placeholder:text-white/30"
        />
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={shuffle}
          aria-label="Suggest a style"
          className="border-white/10 text-white/70 hover:bg-white/10 shrink-0"
        >
          <Dice5 className="w-4 h-4" aria-hidden="true" />
        </Button>
      </div>

      {tags.length > 0 && (
        <ul className="flex flex-wrap gap-1.5" aria-label="Selected styles">
          {tags.map((tag) => (
            <li key={tag}>
              <button
                type="button"
                onClick={() => setTags(tags.filter((item) => item !== tag))}
                aria-label={`Remove style ${tag}`}
                className="group flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-white/70 hover:border-[#ff6b6b]/50 hover:text-white"
              >
                {tag}
                <X
                  className="w-3 h-3 text-white/30 group-hover:text-[#ff6b6b]"
                  aria-hidden="true"
                />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
