import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Dice5, ImagePlus, Loader2, Mic2, Music2, Sparkles } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { useGenerationStore } from '@/store/generationStore';
import { GENERATION_COST, canAfford } from '@/lib/credits';
import { formatDuration } from '@/lib/format';

const IDEAS = [
  'A late-night drive through a city after the rain',
  'An uplifting song about starting over',
  'A cinematic soundtrack for an impossible escape',
];

const THUMBNAILS = [
  { label: 'Neon', value: 'neon night', image: '/images/song-1.jpg' },
  { label: 'Golden hour', value: 'golden hour', image: '/images/song-2.jpg' },
  { label: 'Monochrome', value: 'high contrast monochrome', image: '/images/song-3.jpg' },
  { label: 'Abstract', value: 'abstract color field', image: '/images/song-4.jpg' },
];

export default function CreateStudio() {
  const profile = useAuthStore((state) => state.profile);
  const { start, submitting } = useGenerationStore();
  const [prompt, setPrompt] = useState('');
  const [lyrics, setLyrics] = useState('');
  const [style, setStyle] = useState('');
  const [thumbnailStyle, setThumbnailStyle] = useState(THUMBNAILS[0].value);
  const [instrumental, setInstrumental] = useState(false);
  const [seconds, setSeconds] = useState(45);

  const submit = async () => {
    if (prompt.trim().length < 3) {
      toast.error('Describe the song you want in a few words.');
      return;
    }

    const job = await start({
      prompt: prompt.trim(),
      lyrics: lyrics.trim() || undefined,
      style: style.trim() || undefined,
      thumbnailStyle,
      instrumental,
      seconds,
    });

    if (job) {
      setPrompt('');
      setLyrics('');
      toast.success('Your song is being created.');
    } else {
      const error = useGenerationStore.getState().error ?? 'Could not start generation.';
      toast.error(error);
    }
  };

  return (
    <section className="mb-10 border border-white/10 bg-white/[0.04] rounded-2xl p-5 md:p-7">
      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div>
          <p className="text-[#ff8e8e] text-xs uppercase tracking-[0.2em] font-semibold mb-2">
            Studio
          </p>
          <h2 className="text-2xl font-bold">Start a new creation</h2>
          <p className="text-white/50 text-sm mt-1">
            Shape the words, sound, and cover before you render.
          </p>
        </div>
        <div className="text-right text-sm text-white/50">
          <span className="text-white font-medium">{profile?.credit_balance ?? 0}</span> credits
          <span className="block text-xs">{GENERATION_COST} per song</span>
        </div>
      </div>

      <div className="grid lg:grid-cols-[1.2fr_0.8fr] gap-6">
        <div className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="studio-prompt" className="text-white/70">
              Song concept
            </Label>
            <div className="flex gap-2">
              <Input
                id="studio-prompt"
                value={prompt}
                onChange={(event) => setPrompt(event.target.value)}
                placeholder="A slow-burn indie song about leaving town"
                className="bg-white/5 border-white/10 text-white placeholder:text-white/30"
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => setPrompt(IDEAS[Math.floor(Math.random() * IDEAS.length)])}
                aria-label="Use a song idea"
                className="border-white/10 text-white/70 hover:bg-white/10 shrink-0"
              >
                <Dice5 className="w-4 h-4" aria-hidden="true" />
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="studio-lyrics" className="text-white/70 flex items-center gap-2">
              <Mic2 className="w-4 h-4" aria-hidden="true" /> Lyrics
            </Label>
            <textarea
              id="studio-lyrics"
              value={lyrics}
              onChange={(event) => setLyrics(event.target.value)}
              placeholder="Add lyrics or leave empty for an AI-written vocal concept"
              rows={5}
              className="w-full resize-y rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/30 outline-none focus:ring-1 focus:ring-[#ff6b6b]"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="studio-style" className="text-white/70 flex items-center gap-2">
              <Music2 className="w-4 h-4" aria-hidden="true" /> Style and instruments
            </Label>
            <Input
              id="studio-style"
              value={style}
              onChange={(event) => setStyle(event.target.value)}
              placeholder="Dream pop, warm analog synths, brushed drums"
              className="bg-white/5 border-white/10 text-white placeholder:text-white/30"
            />
          </div>
        </div>

        <div className="space-y-6">
          <div>
            <Label className="text-white/70 flex items-center gap-2 mb-3">
              <ImagePlus className="w-4 h-4" aria-hidden="true" /> Thumbnail direction
            </Label>
            <div className="grid grid-cols-4 gap-2">
              {THUMBNAILS.map((thumbnail) => (
                <button
                  key={thumbnail.value}
                  type="button"
                  onClick={() => setThumbnailStyle(thumbnail.value)}
                  aria-label={`Use ${thumbnail.label} thumbnail`}
                  aria-pressed={thumbnailStyle === thumbnail.value}
                  className={`overflow-hidden rounded-lg border-2 text-left transition-transform hover:scale-105 ${thumbnailStyle === thumbnail.value ? 'border-[#ff6b6b]' : 'border-transparent'}`}
                >
                  <img src={thumbnail.image} alt="" className="aspect-square w-full object-cover" />
                  <span className="block bg-black/80 px-1 py-1 text-[10px] text-white/70 truncate">
                    {thumbnail.label}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="studio-length" className="text-white/70">
                Length
              </Label>
              <span className="text-white/50 text-sm">{formatDuration(seconds)}</span>
            </div>
            <Slider
              id="studio-length"
              value={[seconds]}
              onValueChange={([value]) => setSeconds(value)}
              min={15}
              max={180}
              step={15}
              aria-label="Song length"
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="studio-instrumental" className="text-white/70">
              Instrumental only
            </Label>
            <Switch
              id="studio-instrumental"
              checked={instrumental}
              onCheckedChange={setInstrumental}
              className="data-[state=checked]:bg-[#ff6b6b]"
            />
          </div>

          <Button
            type="button"
            onClick={() => void submit()}
            disabled={submitting || !canAfford(profile?.credit_balance ?? 0)}
            className="w-full gradient-coral text-black font-semibold"
          >
            {submitting ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" aria-hidden="true" />
            ) : (
              <Sparkles className="w-4 h-4 mr-2" aria-hidden="true" />
            )}
            Create song
          </Button>
        </div>
      </div>
    </section>
  );
}
