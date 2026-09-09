import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  ChevronDown,
  Dice5,
  ImagePlus,
  Loader2,
  Lock,
  Maximize2,
  Mic2,
  Minimize2,
  Music2,
  Sparkles,
  Wand2,
} from 'lucide-react';
import StyleTags from './StyleTags';
import ReferenceUploads from './ReferenceUploads';
import { useAuthStore } from '@/store/authStore';
import { useGenerationStore } from '@/store/generationStore';
import { useProjectStore } from '@/store/projectStore';
import { useLibraryStore } from '@/store/libraryStore';
import { GENERATION_COST, LYRICS_COST, canAfford } from '@/lib/credits';
import { fetchPlans, generateLyrics } from '@/lib/api';
import { formatDuration } from '@/lib/format';
import type { Plan, ReferenceUpload } from '@/lib/types';

const IDEAS = [
  'A late-night drive through a city after the rain',
  'An uplifting song about starting over',
  'A cinematic soundtrack for an impossible escape',
  'A slow-burn indie song about leaving town',
];

const THUMBNAILS = [
  { label: 'Neon', value: 'neon night', image: '/images/song-1.jpg' },
  { label: 'Golden hour', value: 'golden hour', image: '/images/song-2.jpg' },
  { label: 'Monochrome', value: 'high contrast monochrome', image: '/images/song-3.jpg' },
  { label: 'Abstract', value: 'abstract color field', image: '/images/song-4.jpg' },
];

const MODEL_LABELS: Record<string, string> = {
  'v4.5': 'v4.5-all',
  v5: 'v5',
};

function Section({
  title,
  icon: Icon,
  children,
  actions,
  defaultOpen = true,
}: {
  title: string;
  icon?: typeof Music2;
  children: ReactNode;
  actions?: ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section className="rounded-xl border border-white/10 bg-white/[0.03]">
      <div className="flex items-center gap-2 px-3 py-2.5">
        <button
          type="button"
          onClick={() => setOpen(!open)}
          aria-expanded={open}
          className="flex flex-1 items-center gap-2 text-left text-sm font-medium text-white/80 hover:text-white"
        >
          <ChevronDown
            className={`w-4 h-4 text-white/40 transition-transform ${open ? '' : '-rotate-90'}`}
            aria-hidden="true"
          />
          {Icon && <Icon className="w-4 h-4 text-white/50" aria-hidden="true" />}
          {title}
        </button>
        {open && actions}
      </div>
      {open && <div className="px-3 pb-3">{children}</div>}
    </section>
  );
}

export default function CreateStudio() {
  const profile = useAuthStore((state) => state.profile);
  const { start, submitting } = useGenerationStore();
  const projects = useProjectStore((state) => state.projects);
  const activeProject = useLibraryStore((state) => state.projectId);

  const [mode, setMode] = useState<'simple' | 'advanced'>('simple');
  const [prompt, setPrompt] = useState('');
  const [lyrics, setLyrics] = useState('');
  const [style, setStyle] = useState('');
  const [title, setTitle] = useState('');
  const [thumbnailStyle, setThumbnailStyle] = useState(THUMBNAILS[0].value);
  const [instrumental, setInstrumental] = useState(false);
  const [seconds, setSeconds] = useState(45);
  const [vocalGender, setVocalGender] = useState<'any' | 'male' | 'female'>('any');
  const [weirdness, setWeirdness] = useState(50);
  const [styleInfluence, setStyleInfluence] = useState(50);
  const [references, setReferences] = useState<ReferenceUpload[]>([]);
  const [projectId, setProjectId] = useState<string>('none');
  const [plans, setPlans] = useState<Plan[]>([]);
  const [model, setModel] = useState('v4.5');
  const [writingLyrics, setWritingLyrics] = useState(false);
  const [lyricsExpanded, setLyricsExpanded] = useState(false);

  useEffect(() => {
    void fetchPlans()
      .then(setPlans)
      .catch(() => setPlans([]));
  }, []);

  // Default the save target to whichever project the library is filtered to.
  useEffect(() => {
    if (activeProject) setProjectId(activeProject);
  }, [activeProject]);

  const plan = plans.find((item) => item.id === profile?.plan_id);
  // Memoised so the effect below does not see a new array every render.
  const allowedModels = useMemo(() => plan?.models ?? ['v4.5'], [plan]);
  const everyModel = useMemo(
    () => [...new Set(plans.flatMap((item) => item.models ?? []))],
    [plans],
  );

  // Keep the selection legal if the plan changes underneath it.
  useEffect(() => {
    if (!allowedModels.includes(model)) setModel(allowedModels[0] ?? 'v4.5');
  }, [allowedModels, model]);

  const writeLyrics = async () => {
    if (prompt.trim().length < 3) {
      toast.error('Describe the song first, then I can write words for it.');
      return;
    }
    setWritingLyrics(true);
    try {
      const result = await generateLyrics({
        prompt: prompt.trim(),
        style: style.trim() || undefined,
        existing: lyrics.trim() || undefined,
      });
      setLyrics(result.lyrics);
      if (!title.trim()) setTitle(result.title);
      toast.success(`Wrote “${result.title}” — edit it however you like.`);
      await useAuthStore.getState().refreshProfile();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not write lyrics.');
    } finally {
      setWritingLyrics(false);
    }
  };

  const submit = async () => {
    if (prompt.trim().length < 3) {
      toast.error('Describe the song you want in a few words.');
      return;
    }

    const job = await start({
      prompt: prompt.trim(),
      lyrics: lyrics.trim() || undefined,
      style: style.trim() || undefined,
      title: title.trim() || undefined,
      thumbnailStyle,
      instrumental,
      seconds,
      model,
      vocalGender,
      weirdness,
      styleInfluence,
      referenceIds: references.map((item) => item.id),
      projectId: projectId === 'none' ? undefined : projectId,
    });

    if (job) {
      setPrompt('');
      setLyrics('');
      setTitle('');
      setReferences([]);
      toast.success('Your song is being created.');
    } else {
      toast.error(useGenerationStore.getState().error ?? 'Could not start generation.');
    }
  };

  const affordable = canAfford(profile?.credit_balance ?? 0);

  return (
    <section
      data-tour="studio"
      aria-label="Create a song"
      className="rounded-2xl border border-white/10 bg-white/[0.04] p-4"
    >
      <div className="flex items-center justify-between gap-2 mb-4">
        <div
          role="group"
          aria-label="Composer mode"
          className="flex items-center rounded-lg border border-white/10 bg-white/5 p-0.5"
        >
          {(['simple', 'advanced'] as const).map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setMode(option)}
              aria-pressed={mode === option}
              className={`rounded-md px-3 py-1 text-xs capitalize transition-colors ${
                mode === option ? 'bg-white/15 text-white' : 'text-white/50 hover:text-white'
              }`}
            >
              {option}
            </button>
          ))}
        </div>

        <Select value={model} onValueChange={setModel}>
          <SelectTrigger
            aria-label="Model version"
            className="h-8 w-[120px] bg-white/5 border-white/10 text-white text-xs"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-[#0a0a0a] border-white/10 text-white">
            {(everyModel.length ? everyModel : allowedModels).map((option) => {
              const locked = !allowedModels.includes(option);
              return (
                <SelectItem key={option} value={option} disabled={locked}>
                  <span className="flex items-center gap-2">
                    {MODEL_LABELS[option] ?? option}
                    {locked && <Lock className="w-3 h-3 text-white/30" aria-label="Pro plan" />}
                  </span>
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-3">
        <div className="space-y-2">
          <Label htmlFor="studio-prompt" className="text-white/70 text-sm">
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

        {mode === 'advanced' && (
          <ReferenceUploads references={references} onChange={setReferences} />
        )}

        <Section
          title="Lyrics"
          icon={Mic2}
          actions={
            <div className="flex items-center gap-1">
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => void writeLyrics()}
                disabled={writingLyrics}
                className="h-7 text-[#ff8e8e] hover:text-white hover:bg-white/10 text-xs"
              >
                {writingLyrics ? (
                  <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" aria-hidden="true" />
                ) : (
                  <Wand2 className="w-3.5 h-3.5 mr-1" aria-hidden="true" />
                )}
                {lyrics.trim() ? 'Rewrite' : 'Write with AI'}
                <span className="ml-1 text-white/30">{LYRICS_COST}cr</span>
              </Button>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                onClick={() => setLyricsExpanded(!lyricsExpanded)}
                aria-label={lyricsExpanded ? 'Collapse lyrics editor' : 'Expand lyrics editor'}
                className="h-7 w-7 text-white/40 hover:text-white"
              >
                {lyricsExpanded ? (
                  <Minimize2 className="w-3.5 h-3.5" aria-hidden="true" />
                ) : (
                  <Maximize2 className="w-3.5 h-3.5" aria-hidden="true" />
                )}
              </Button>
            </div>
          }
        >
          <label htmlFor="studio-lyrics" className="sr-only">
            Lyrics
          </label>
          <textarea
            id="studio-lyrics"
            value={lyrics}
            onChange={(event) => setLyrics(event.target.value)}
            rows={lyricsExpanded ? 18 : 6}
            placeholder="Write your own, or press Write with AI — you can edit whatever comes back before creating the song. Leave empty for an instrumental."
            className="w-full resize-y rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/30 outline-none focus:ring-1 focus:ring-[#ff6b6b]"
          />
        </Section>

        <Section title="Styles" icon={Music2}>
          <StyleTags value={style} onChange={setStyle} />
        </Section>

        {mode === 'advanced' && (
          <Section title="More options" defaultOpen={false}>
            <div className="space-y-5 pt-1">
              <div className="flex items-center justify-between gap-3">
                <Label className="text-white/70 text-sm font-normal">Vocal gender</Label>
                <div
                  role="group"
                  aria-label="Vocal gender"
                  className="flex items-center rounded-lg border border-white/10 bg-white/5 p-0.5"
                >
                  {(['any', 'male', 'female'] as const).map((option) => (
                    <button
                      key={option}
                      type="button"
                      onClick={() => setVocalGender(option)}
                      aria-pressed={vocalGender === option}
                      disabled={instrumental}
                      className={`rounded-md px-2.5 py-1 text-xs capitalize transition-colors disabled:opacity-40 ${
                        vocalGender === option
                          ? 'bg-white/15 text-white'
                          : 'text-white/50 hover:text-white'
                      }`}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              </div>

              <SliderRow
                id="studio-weirdness"
                label="Weirdness"
                hint="How far the arrangement wanders from the brief."
                value={weirdness}
                onChange={setWeirdness}
              />
              <SliderRow
                id="studio-style-influence"
                label="Style influence"
                hint="How strongly the style tags steer the result."
                value={styleInfluence}
                onChange={setStyleInfluence}
              />

              <div>
                <Label className="text-white/70 text-sm flex items-center gap-2 mb-2">
                  <ImagePlus className="w-4 h-4" aria-hidden="true" /> Cover direction
                </Label>
                <div className="grid grid-cols-4 gap-2">
                  {THUMBNAILS.map((thumbnail) => (
                    <button
                      key={thumbnail.value}
                      type="button"
                      onClick={() => setThumbnailStyle(thumbnail.value)}
                      aria-label={`Use ${thumbnail.label} cover`}
                      aria-pressed={thumbnailStyle === thumbnail.value}
                      className={`overflow-hidden rounded-lg border-2 transition-transform hover:scale-105 ${
                        thumbnailStyle === thumbnail.value
                          ? 'border-[#ff6b6b]'
                          : 'border-transparent'
                      }`}
                    >
                      <img
                        src={thumbnail.image}
                        alt=""
                        className="aspect-square w-full object-cover"
                      />
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </Section>
        )}

        <div className="space-y-2" data-tour="studio-length">
          <div className="flex items-center justify-between">
            <Label htmlFor="studio-length" className="text-white/70 text-sm">
              Length
            </Label>
            <span className="text-white/50 text-sm tabular-nums">{formatDuration(seconds)}</span>
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
          <Label htmlFor="studio-instrumental" className="text-white/70 text-sm font-normal">
            Instrumental only
          </Label>
          <Switch
            id="studio-instrumental"
            checked={instrumental}
            onCheckedChange={setInstrumental}
            className="data-[state=checked]:bg-[#ff6b6b]"
          />
        </div>

        <Input
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          aria-label="Song title (optional)"
          placeholder="Song title (optional)"
          className="bg-white/5 border-white/10 text-white placeholder:text-white/30"
        />

        <div className="flex items-center justify-between gap-2">
          <Label htmlFor="studio-project" className="text-white/50 text-xs">
            Save to
          </Label>
          <Select value={projectId} onValueChange={setProjectId}>
            <SelectTrigger
              id="studio-project"
              aria-label="Save to project"
              className="h-8 w-[160px] bg-white/5 border-white/10 text-white text-xs"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-[#0a0a0a] border-white/10 text-white">
              <SelectItem value="none">No project</SelectItem>
              {projects.map((project) => (
                <SelectItem key={project.id} value={project.id}>
                  {project.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Button
          type="button"
          onClick={() => void submit()}
          disabled={submitting || !affordable}
          className="w-full gradient-coral text-black font-semibold"
        >
          {submitting ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" aria-hidden="true" />
          ) : (
            <Sparkles className="w-4 h-4 mr-2" aria-hidden="true" />
          )}
          Create
        </Button>

        <p className="text-center text-[11px] text-white/35">
          {GENERATION_COST} credits · {profile?.credit_balance ?? 0} left
          {!affordable && <span className="text-[#ff6b6b]"> — not enough for another song</span>}
        </p>
      </div>
    </section>
  );
}

function SliderRow({
  id,
  label,
  hint,
  value,
  onChange,
}: {
  id: string;
  label: string;
  hint: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <Label htmlFor={id} className="text-white/70 text-sm font-normal">
          {label}
        </Label>
        <span className="text-white/50 text-sm tabular-nums">{value}%</span>
      </div>
      <Slider
        id={id}
        value={[value]}
        onValueChange={([next]) => onChange(next)}
        min={0}
        max={100}
        step={5}
        aria-label={label}
        aria-describedby={`${id}-hint`}
      />
      <p id={`${id}-hint`} className="text-[11px] text-white/30">
        {hint}
      </p>
    </div>
  );
}
