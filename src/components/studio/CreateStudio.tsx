import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  BookmarkPlus,
  ChevronDown,
  Dice5,
  Folder,
  ImagePlus,
  Library,
  ListPlus,
  Loader2,
  Lock,
  Maximize2,
  Mic2,
  Minimize2,
  Music2,
  Redo2,
  Sparkles,
  Trash2,
  Undo2,
  Wand2,
} from 'lucide-react';
import StyleTags from './StyleTags';
import ReferenceUploads from './ReferenceUploads';
import { useAuthStore } from '@/store/authStore';
import { useGenerationStore } from '@/store/generationStore';
import { useProjectStore } from '@/store/projectStore';
import { useLibraryStore } from '@/store/libraryStore';
import { useUiStore } from '@/store/uiStore';
import { GENERATION_COST, LYRICS_COST, canAfford } from '@/lib/credits';
import { fetchPlans, generateLyrics } from '@/lib/api';
import { formatDuration } from '@/lib/format';
import type { Plan, ReferenceUpload } from '@/lib/types';

const SONG_IDEAS = [
  'A late-night drive through a city after the rain',
  'An uplifting song about starting over',
  'A cinematic soundtrack for an impossible escape',
  'A slow-burn indie song about leaving town',
  'A deep vintage Jamaican roots reggae track about unity and meditation',
];

const SPEECH_IDEAS = [
  'An energetic stadium announcer hyping up the championship crowd',
  'A warm late-night FM radio host introducing a soulful midnight record',
  'A dramatic movie trailer voiceover over rising orchestral brass',
  'Spoken word poetry over gentle rain and lo-fi piano chords',
];

const LYRIC_TAGS = [
  '[Verse 1]',
  '[Chorus]',
  '[Verse 2]',
  '[Bridge]',
  '[Guitar Solo]',
  '[Dub Drop]',
  '[Spoken Word]',
  '[Outro]',
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
  const mySongs = useLibraryStore((state) => state.mySongs);
  const savedStylePresets = useUiStore((state) => state.savedStylePresets);
  const addStylePreset = useUiStore((state) => state.addStylePreset);

  const initialDraft = useUiStore.getState().composerDraft;
  const [contentType, setContentType] = useState<'songs' | 'speech'>(
    initialDraft?.contentType ?? 'songs',
  );
  const [mode, setMode] = useState<'simple' | 'advanced'>(initialDraft?.mode ?? 'advanced');
  const [prompt, setPrompt] = useState(initialDraft?.prompt ?? '');
  const [lyrics, setLyrics] = useState(initialDraft?.lyrics ?? '');
  const [lyricsHistory, setLyricsHistory] = useState<string[]>([initialDraft?.lyrics ?? '']);
  const [historyIndex, setHistoryIndex] = useState(0);
  const [style, setStyle] = useState(initialDraft?.style ?? '');
  const [title, setTitle] = useState(initialDraft?.title ?? '');
  const [thumbnailStyle, setThumbnailStyle] = useState(THUMBNAILS[0].value);
  const [instrumental, setInstrumental] = useState(initialDraft?.instrumental ?? false);
  const [durationMode, setDurationMode] = useState<'auto' | 'custom'>('custom');
  const [seconds, setSeconds] = useState(45);
  const [vocalGender, setVocalGender] = useState<'any' | 'male' | 'female'>('any');
  const [maxMode, setMaxMode] = useState(false);
  const [weirdness, setWeirdness] = useState(50);
  const [styleInfluence, setStyleInfluence] = useState(50);
  const [variety, setVariety] = useState(50);
  const [personalize, setPersonalize] = useState(false);
  const [references, setReferences] = useState<ReferenceUpload[]>([]);
  const [projectId, setProjectId] = useState<string>(activeProject ?? 'none');
  const [plans, setPlans] = useState<Plan[]>([]);
  const [model, setModel] = useState(initialDraft?.model ?? 'v4.5');
  const [writingLyrics, setWritingLyrics] = useState(false);
  const [lyricsExpanded, setLyricsExpanded] = useState(false);

  useEffect(() => {
    if (useUiStore.getState().composerDraft) {
      useUiStore.getState().setComposerDraft(null);
    }
    return useUiStore.subscribe((state, prev) => {
      const draft = state.composerDraft;
      if (!draft || draft === prev.composerDraft) return;
      if (draft.prompt !== undefined) setPrompt(draft.prompt);
      if (draft.style !== undefined) setStyle(draft.style);
      if (draft.lyrics !== undefined) {
        setLyrics(draft.lyrics);
        setLyricsHistory([draft.lyrics]);
        setHistoryIndex(0);
      }
      if (draft.title !== undefined) setTitle(draft.title);
      if (draft.contentType) setContentType(draft.contentType);
      if (draft.instrumental !== undefined) setInstrumental(draft.instrumental);
      if (draft.mode) setMode(draft.mode);
      if (draft.model) setModel(draft.model);
      useUiStore.getState().setComposerDraft(null);
    });
  }, []);

  useEffect(() => {
    void fetchPlans()
      .then(setPlans)
      .catch(() => setPlans([]));
  }, []);

  // Default the save target to whichever project the library is filtered to.
  useEffect(() => {
    return useLibraryStore.subscribe((state, prev) => {
      if (state.projectId && state.projectId !== prev.projectId) {
        setProjectId(state.projectId);
      }
    });
  }, []);

  const plan = plans.find((item) => item.id === profile?.plan_id);
  const allowedModels = useMemo(() => plan?.models ?? ['v4.5'], [plan]);
  const everyModel = useMemo(
    () => [...new Set(plans.flatMap((item) => item.models ?? []))],
    [plans],
  );

  // Keep the selection legal if the plan changes underneath it.
  useEffect(() => {
    if (!allowedModels.includes(model)) setModel(allowedModels[0] ?? 'v4.5');
  }, [allowedModels, model]);

  const updateLyricsWithHistory = (next: string) => {
    setLyrics(next);
    const sliced = lyricsHistory.slice(0, historyIndex + 1);
    if (sliced[sliced.length - 1] !== next) {
      const updated = [...sliced, next].slice(-25);
      setLyricsHistory(updated);
      setHistoryIndex(updated.length - 1);
    }
  };

  const undoLyrics = () => {
    if (historyIndex > 0) {
      const nextIdx = historyIndex - 1;
      setHistoryIndex(nextIdx);
      setLyrics(lyricsHistory[nextIdx] ?? '');
    }
  };

  const redoLyrics = () => {
    if (historyIndex < lyricsHistory.length - 1) {
      const nextIdx = historyIndex + 1;
      setHistoryIndex(nextIdx);
      setLyrics(lyricsHistory[nextIdx] ?? '');
    }
  };

  const insertLyricTag = (tag: string) => {
    const prefix = lyrics.trim() ? `${lyrics.replace(/\s+$/, '')}\n\n${tag}\n` : `${tag}\n`;
    updateLyricsWithHistory(prefix);
  };

  const writeLyrics = async () => {
    const seedPrompt =
      prompt.trim() ||
      style.trim() ||
      (contentType === 'speech'
        ? 'An inspiring spoken word announcement over warm background music'
        : 'A soulful late-night song');
    if (seedPrompt.length < 3) {
      toast.error('Describe the song first, then I can write words for it.');
      return;
    }
    if (!prompt.trim()) setPrompt(seedPrompt);
    setWritingLyrics(true);
    try {
      const result = await generateLyrics({
        prompt: seedPrompt,
        style: style.trim() || undefined,
        existing: lyrics.trim() || undefined,
      });
      updateLyricsWithHistory(result.lyrics);
      if (!title.trim()) setTitle(result.title);
      toast.success(`Wrote “${result.title}” — edit it however you like.`);
      await useAuthStore.getState().refreshProfile();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not write lyrics.');
    } finally {
      setWritingLyrics(false);
    }
  };

  const handleSavePreset = () => {
    if (!style.trim()) {
      toast.error('Add some style tags first before saving a preset.');
      return;
    }
    const label = style.split(',')[0]?.trim().slice(0, 28) || 'Custom Style';
    addStylePreset(label, style);
    toast.success(`Saved preset “${label}”`);
  };

  const resetComposer = () => {
    setPrompt('');
    updateLyricsWithHistory('');
    setStyle('');
    setTitle('');
    setReferences([]);
    setInstrumental(false);
    setWeirdness(50);
    setStyleInfluence(50);
    setVariety(50);
    setMaxMode(false);
    toast.success('Cleared studio composer.');
  };

  const submit = async () => {
    const effectivePrompt = prompt.trim() || style.trim();
    if (effectivePrompt.length < 3) {
      toast.error('Describe the song you want in a few words.');
      return;
    }

    // Build enriched style string incorporating Speech mode, Max Mode, and Personalize taste.
    const extraStyles: string[] = [];
    if (style.trim()) extraStyles.push(style.trim());
    if (contentType === 'speech') {
      extraStyles.push('spoken word narration, expressive voiceover with matching background music');
    }
    if (maxMode) {
      extraStyles.push('high-fidelity studio master, wide dynamic range');
    }
    if (personalize && mySongs.length > 0 && mySongs[0]?.style) {
      const firstTag = mySongs[0].style.split(',')[0]?.trim();
      if (firstTag) extraStyles.push(firstTag);
    }

    const job = await start({
      prompt: effectivePrompt,
      lyrics: lyrics.trim() || undefined,
      style: extraStyles.join(', ') || undefined,
      title: title.trim() || undefined,
      thumbnailStyle,
      instrumental: contentType === 'speech' ? false : instrumental,
      seconds: durationMode === 'auto' ? 60 : seconds,
      model,
      vocalGender,
      weirdness: Math.round((weirdness + (variety - 50) * 0.25) * 10) / 10,
      styleInfluence,
      referenceIds: references.map((item) => item.id),
      projectId: projectId === 'none' ? undefined : projectId,
    });

    if (job) {
      setPrompt('');
      updateLyricsWithHistory('');
      setTitle('');
      setReferences([]);
      toast.success(
        contentType === 'speech' ? 'Your speech track is being created.' : 'Your song is being created.',
      );
    } else {
      toast.error(useGenerationStore.getState().error ?? 'Could not start generation.');
    }
  };

  const affordable = canAfford(profile?.credit_balance ?? 0);
  const ideas = contentType === 'speech' ? SPEECH_IDEAS : SONG_IDEAS;
  const varietyLabel = variety < 35 ? 'Low' : variety > 65 ? 'High' : 'Normal';

  return (
    <section
      data-tour="studio"
      aria-label="Create a song"
      className="rounded-2xl border border-white/10 bg-[#111111] p-4 shadow-2xl"
    >
      {/* Top Songs / Speech Tabs (Image 1 & Image 3) */}
      <div
        role="tablist"
        aria-label="Creation type"
        className="grid grid-cols-2 border-b border-white/10 mb-3.5 -mx-4 px-4"
      >
        <button
          type="button"
          role="tab"
          aria-selected={contentType === 'songs'}
          onClick={() => setContentType('songs')}
          className={`pb-2.5 text-sm font-medium transition-colors border-b-2 ${
            contentType === 'songs'
              ? 'border-white text-white'
              : 'border-transparent text-white/45 hover:text-white/80'
          }`}
        >
          Songs
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={contentType === 'speech'}
          onClick={() => setContentType('speech')}
          className={`pb-2.5 text-sm font-medium transition-colors border-b-2 flex items-center justify-center gap-1.5 ${
            contentType === 'speech'
              ? 'border-white text-white'
              : 'border-transparent text-white/45 hover:text-white/80'
          }`}
        >
          Speech
          <span className="rounded-full bg-pink-500/20 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-pink-300">
            Beta
          </span>
        </button>
      </div>

      {/* Mode Switch + Model Selector Row */}
      <div className="flex items-center justify-between gap-2 mb-3.5">
        <div
          role="group"
          aria-label="Composer mode"
          className="flex items-center rounded-full border border-white/10 bg-white/5 p-0.5"
        >
          {(['simple', 'advanced'] as const).map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setMode(option)}
              aria-pressed={mode === option}
              className={`rounded-full px-3.5 py-1 text-xs font-medium capitalize transition-colors ${
                mode === option ? 'bg-white/15 text-white shadow-xs' : 'text-white/50 hover:text-white'
              }`}
            >
              {option}
            </button>
          ))}
        </div>

        <Select value={model} onValueChange={setModel}>
          <SelectTrigger
            aria-label="Model version"
            className="h-8 w-[124px] rounded-full bg-white/5 border-white/10 text-white text-xs"
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
        {mode === 'advanced' && (
          <ReferenceUploads references={references} onChange={setReferences} />
        )}

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="studio-prompt" className="text-white/70 text-xs font-medium">
              {contentType === 'speech' ? 'Speech & background vibe' : 'Song concept'}
            </Label>
            {contentType === 'speech' && (
              <span className="text-[11px] text-pink-300/80">Voice + matching backing music</span>
            )}
          </div>
          <div className="flex gap-2">
            <Input
              id="studio-prompt"
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
              placeholder={
                contentType === 'speech'
                  ? 'Energetic announcer with matching funk brass background'
                  : 'A slow-burn indie song about leaving town'
              }
              className="bg-white/5 border-white/10 text-white placeholder:text-white/30 text-sm"
            />
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => setPrompt(ideas[Math.floor(Math.random() * ideas.length)])}
              aria-label="Use a song idea"
              className="border-white/10 bg-white/5 text-white/70 hover:bg-white/10 shrink-0"
            >
              <Dice5 className="w-4 h-4" aria-hidden="true" />
            </Button>
          </div>
        </div>

        {/* Lyrics Accordion Card (Image 1 & Image 3) */}
        <Section
          title="Lyrics"
          icon={Mic2}
          actions={
            <div className="flex items-center gap-0.5">
              <Button
                type="button"
                size="icon"
                variant="ghost"
                onClick={undoLyrics}
                disabled={historyIndex <= 0}
                aria-label="Undo lyrics edit"
                className="h-7 w-7 text-white/40 hover:text-white disabled:opacity-25"
              >
                <Undo2 className="w-3.5 h-3.5" aria-hidden="true" />
              </Button>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                onClick={redoLyrics}
                disabled={historyIndex >= lyricsHistory.length - 1}
                aria-label="Redo lyrics edit"
                className="h-7 w-7 text-white/40 hover:text-white disabled:opacity-25"
              >
                <Redo2 className="w-3.5 h-3.5" aria-hidden="true" />
              </Button>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    aria-label="Insert song section tag"
                    className="h-7 w-7 text-white/40 hover:text-white"
                  >
                    <ListPlus className="w-3.5 h-3.5" aria-hidden="true" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  className="bg-[#0a0a0a] border-white/10 text-white"
                >
                  <DropdownMenuLabel className="text-xs text-white/40">
                    Insert structure tag
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator className="bg-white/10" />
                  {LYRIC_TAGS.map((tag) => (
                    <DropdownMenuItem
                      key={tag}
                      onClick={() => insertLyricTag(tag)}
                      className="cursor-pointer text-xs"
                    >
                      {tag}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => void writeLyrics()}
                disabled={writingLyrics}
                className="h-7 px-2 text-[#ff8e8e] hover:text-white hover:bg-white/10 text-xs"
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
          <div className="relative">
            <label htmlFor="studio-lyrics" className="sr-only">
              Lyrics
            </label>
            <textarea
              id="studio-lyrics"
              value={lyrics}
              onChange={(event) => updateLyricsWithHistory(event.target.value)}
              rows={lyricsExpanded ? 16 : 6}
              placeholder={
                contentType === 'speech'
                  ? 'Write the script or announcement you want spoken…'
                  : 'Start writing lyrics, or leave this empty for instrumental'
              }
              className="w-full resize-y rounded-lg border border-white/10 bg-black/40 px-3 py-2.5 pb-10 text-sm text-white placeholder:text-white/30 outline-none focus:ring-1 focus:ring-[#ff6b6b]"
            />
            <div className="absolute bottom-2.5 left-1/2 -translate-x-1/2">
              <Button
                type="button"
                size="icon"
                variant="outline"
                disabled={writingLyrics}
                onClick={() => void writeLyrics()}
                aria-label="Generate lyrics with AI wand"
                className="h-8 w-8 rounded-full border-white/15 bg-white/10 text-white/80 hover:bg-white/20 hover:text-white backdrop-blur"
              >
                {writingLyrics ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
                ) : (
                  <Wand2 className="w-3.5 h-3.5" aria-hidden="true" />
                )}
              </Button>
            </div>
          </div>
        </Section>

        {/* Styles Accordion Card (Image 1) */}
        <Section
          title="Styles"
          icon={Music2}
          actions={
            <div className="flex items-center gap-0.5">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    aria-label="Style presets"
                    className="h-7 w-7 text-white/40 hover:text-white"
                  >
                    <Library className="w-3.5 h-3.5" aria-hidden="true" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  className="w-64 bg-[#0a0a0a] border-white/10 text-white"
                >
                  <DropdownMenuLabel className="text-xs text-white/40">
                    Saved Style Presets
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator className="bg-white/10" />
                  {savedStylePresets.map((preset) => (
                    <DropdownMenuItem
                      key={preset.id}
                      onClick={() => {
                        setStyle(preset.style);
                        toast.success(`Loaded “${preset.name}”`);
                      }}
                      className="cursor-pointer flex flex-col items-start gap-0.5 py-2"
                    >
                      <span className="text-xs font-medium text-white">{preset.name}</span>
                      <span className="text-[11px] text-white/40 line-clamp-1">{preset.style}</span>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              <Button
                type="button"
                size="icon"
                variant="ghost"
                onClick={handleSavePreset}
                aria-label="Save current style preset"
                className="h-7 w-7 text-white/40 hover:text-white"
              >
                <BookmarkPlus className="w-3.5 h-3.5" aria-hidden="true" />
              </Button>

              <Button
                type="button"
                size="icon"
                variant="ghost"
                onClick={() => setStyle('')}
                disabled={!style.trim()}
                aria-label="Clear styles"
                className="h-7 w-7 text-white/40 hover:text-white disabled:opacity-25"
              >
                <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
              </Button>
            </div>
          }
        >
          <StyleTags value={style} onChange={setStyle} />
        </Section>

        {/* More Options Accordion Card (Image 1) */}
        {mode === 'advanced' && (
          <Section title="More options" defaultOpen={false}>
            <div className="space-y-3 pt-1">
              {/* Vocal Gender */}
              <div className="flex items-center justify-between gap-3 rounded-lg bg-black/30 px-3 py-2 border border-white/5">
                <Label className="text-white/75 text-xs font-normal">Vocal Gender</Label>
                <div
                  role="group"
                  aria-label="Vocal gender"
                  className="flex items-center rounded-md border border-white/10 bg-white/5 p-0.5"
                >
                  {(['any', 'male', 'female'] as const).map((option) => (
                    <button
                      key={option}
                      type="button"
                      onClick={() => setVocalGender(option)}
                      aria-pressed={vocalGender === option}
                      disabled={instrumental}
                      className={`rounded px-2.5 py-1 text-xs capitalize transition-colors disabled:opacity-40 ${
                        vocalGender === option
                          ? 'bg-white/15 text-white font-medium'
                          : 'text-white/50 hover:text-white'
                      }`}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              </div>

              {/* Duration Mode (Custom | Auto) */}
              <div className="flex items-center justify-between gap-3 rounded-lg bg-black/30 px-3 py-2 border border-white/5">
                <Label className="text-white/75 text-xs font-normal">Duration</Label>
                <div
                  role="group"
                  aria-label="Duration mode"
                  className="flex items-center rounded-md border border-white/10 bg-white/5 p-0.5"
                >
                  {(['custom', 'auto'] as const).map((option) => (
                    <button
                      key={option}
                      type="button"
                      onClick={() => setDurationMode(option)}
                      aria-pressed={durationMode === option}
                      className={`rounded px-2.5 py-1 text-xs capitalize transition-colors ${
                        durationMode === option
                          ? 'bg-white/15 text-white font-medium'
                          : 'text-white/50 hover:text-white'
                      }`}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              </div>

              {/* Max Mode */}
              <div className="flex items-center justify-between gap-3 rounded-lg bg-black/30 px-3 py-2 border border-white/5">
                <div>
                  <span className="text-white/75 text-xs block">Max Mode</span>
                  <span className="text-[10px] text-white/35">Extended dynamic fidelity</span>
                </div>
                <div
                  role="group"
                  aria-label="Max Mode"
                  className="flex items-center rounded-md border border-white/10 bg-white/5 p-0.5"
                >
                  {(['off', 'on'] as const).map((option) => {
                    const active = (option === 'on') === maxMode;
                    return (
                      <button
                        key={option}
                        type="button"
                        onClick={() => setMaxMode(option === 'on')}
                        aria-pressed={active}
                        className={`rounded px-2.5 py-1 text-xs capitalize transition-colors ${
                          active
                            ? 'bg-white/15 text-white font-medium'
                            : 'text-white/50 hover:text-white'
                        }`}
                      >
                        {option}
                      </button>
                    );
                  })}
                </div>
              </div>

              <SliderRow
                id="studio-weirdness"
                label="Weirdness"
                hint="How far the arrangement wanders from the brief."
                value={weirdness}
                displayValue={`${weirdness}%`}
                onChange={setWeirdness}
              />
              <SliderRow
                id="studio-style-influence"
                label="Style Influence"
                hint="How strongly the style tags steer the result."
                value={styleInfluence}
                displayValue={`${styleInfluence}%`}
                onChange={setStyleInfluence}
              />
              <SliderRow
                id="studio-variety"
                label="Variety"
                hint="Controls melodic and structural diversity between takes."
                value={variety}
                displayValue={varietyLabel}
                onChange={setVariety}
              />

              {/* Personalize (My Taste) */}
              <div className="flex items-center justify-between gap-3 rounded-lg bg-black/30 px-3 py-2 border border-white/5">
                <div className="flex items-center gap-2">
                  <span className="text-white/75 text-xs">Personalize</span>
                  <span className="text-[11px] text-white/35">My Taste</span>
                </div>
                <div
                  role="group"
                  aria-label="Personalize my taste"
                  className="flex items-center rounded-md border border-white/10 bg-white/5 p-0.5"
                >
                  {(['off', 'on'] as const).map((option) => {
                    const active = (option === 'on') === personalize;
                    return (
                      <button
                        key={option}
                        type="button"
                        onClick={() => setPersonalize(option === 'on')}
                        aria-pressed={active}
                        className={`rounded px-2.5 py-1 text-xs capitalize transition-colors ${
                          active
                            ? 'bg-white/15 text-white font-medium'
                            : 'text-white/50 hover:text-white'
                        }`}
                      >
                        {option}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <Label className="text-white/70 text-xs flex items-center gap-2 mb-2">
                  <ImagePlus className="w-3.5 h-3.5" aria-hidden="true" /> Cover direction
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

        <div className="space-y-2 rounded-xl border border-white/10 bg-white/[0.02] px-3 py-2.5" data-tour="studio-length">
          <div className="flex items-center justify-between">
            <Label htmlFor="studio-length" className="text-white/70 text-xs">
              Length
            </Label>
            <span className="text-white/50 text-xs tabular-nums">
              {durationMode === 'auto' ? 'Auto (~1:00)' : formatDuration(seconds)}
            </span>
          </div>
          <Slider
            id="studio-length"
            value={[seconds]}
            onValueChange={([value]) => {
              setDurationMode('custom');
              setSeconds(value);
            }}
            min={15}
            max={180}
            step={15}
            aria-label="Song length"
          />
        </div>

        <div className="flex items-center justify-between px-1">
          <Label htmlFor="studio-instrumental" className="text-white/70 text-xs font-normal">
            Instrumental only
          </Label>
          <Switch
            id="studio-instrumental"
            checked={instrumental}
            onCheckedChange={setInstrumental}
            className="data-[state=checked]:bg-[#ff6b6b]"
          />
        </div>

        <div className="space-y-2 rounded-xl border border-white/10 bg-white/[0.02] p-2.5">
          <div className="relative">
            <Music2
              className="w-3.5 h-3.5 text-white/35 absolute left-3 top-1/2 -translate-y-1/2"
              aria-hidden="true"
            />
            <Input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              aria-label="Song title (optional)"
              placeholder="Song Title (Optional)"
              className="pl-8 bg-transparent border-0 border-b border-white/10 rounded-none text-white placeholder:text-white/30 text-xs focus-visible:ring-0"
            />
          </div>

          <div className="flex items-center justify-between gap-2 pt-1 px-1">
            <Label
              htmlFor="studio-project"
              className="text-white/50 text-xs flex items-center gap-1.5"
            >
              <Folder className="w-3.5 h-3.5 text-white/40" aria-hidden="true" />
              Save to..
            </Label>
            <Select value={projectId} onValueChange={setProjectId}>
              <SelectTrigger
                id="studio-project"
                aria-label="Save to project"
                className="h-7 w-[160px] rounded-full bg-white/5 border-white/10 text-white text-xs"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-[#0a0a0a] border-white/10 text-white">
                <SelectItem value="none">My Workspace</SelectItem>
                {projects.map((project) => (
                  <SelectItem key={project.id} value={project.id}>
                    {project.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Sticky-style bottom action row: Trash/Reset + Gradient Create Button (Image 1 & Image 3) */}
        <div className="flex items-center gap-2 pt-1">
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={resetComposer}
            aria-label="Reset composer"
            className="h-10 w-10 rounded-full border-white/10 bg-white/5 text-white/50 hover:bg-white/10 hover:text-white shrink-0"
          >
            <Trash2 className="w-4 h-4" aria-hidden="true" />
          </Button>

          <Button
            type="button"
            onClick={() => void submit()}
            disabled={submitting || !affordable}
            className="flex-1 h-10 rounded-full bg-gradient-to-r from-[#ff4d6d] via-[#ff6b6b] to-[#ff9e44] text-white font-semibold shadow-lg shadow-[#ff6b6b]/20 hover:opacity-95"
          >
            {submitting ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" aria-hidden="true" />
            ) : (
              <Sparkles className="w-4 h-4 mr-2" aria-hidden="true" />
            )}
            Create
          </Button>
        </div>

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
  displayValue,
  onChange,
}: {
  id: string;
  label: string;
  hint: string;
  value: number;
  displayValue: string;
  onChange: (value: number) => void;
}) {
  return (
    <div className="rounded-lg bg-black/30 px-3 py-2.5 border border-white/5 space-y-2">
      <div className="flex items-center justify-between gap-3">
        <Label htmlFor={id} className="text-white/75 text-xs font-normal shrink-0">
          {label}
        </Label>
        <div className="relative flex-1 flex items-center">
          {/* Subtle tick marks along the slider track (Image 1) */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-1 flex justify-between px-1"
          >
            {Array.from({ length: 9 }).map((_, idx) => (
              <span key={idx} className="h-2 w-px bg-white/15" />
            ))}
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
            className="relative z-10"
          />
        </div>
        <span className="text-white/60 text-xs tabular-nums w-12 text-right shrink-0">
          {displayValue}
        </span>
      </div>
      <p id={`${id}-hint`} className="text-[10px] text-white/30">
        {hint}
      </p>
    </div>
  );
}
