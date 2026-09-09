import { useEffect, useState, type FormEvent } from 'react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import { useLibraryStore } from '@/store/libraryStore';
import type { Song } from '@/lib/types';

interface EditSongDialogProps {
  song: Song | null;
  onClose: () => void;
}

export default function EditSongDialog({ song, onClose }: EditSongDialogProps) {
  const saveDetails = useLibraryStore((state) => state.saveDetails);
  const [title, setTitle] = useState('');
  const [lyrics, setLyrics] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (song) {
      setTitle(song.title);
      setLyrics(song.lyrics ?? '');
    }
  }, [song]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!song) return;
    if (!title.trim()) {
      toast.error('A song needs a title.');
      return;
    }

    setSaving(true);
    try {
      await saveDetails(song.id, { title: title.trim(), lyrics: lyrics.trim() || null });
      toast.success('Saved.');
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not save those changes.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={Boolean(song)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg bg-[#0a0a0a] border-white/10 text-white">
        <DialogHeader>
          <DialogTitle>Edit song</DialogTitle>
          <DialogDescription className="text-white/50">
            Title and lyrics only. Plays, likes and rights come from the system.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="edit-title" className="text-white/70">
              Title
            </Label>
            <Input
              id="edit-title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              className="bg-white/5 border-white/10 text-white"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-lyrics" className="text-white/70">
              Lyrics
            </Label>
            <textarea
              id="edit-lyrics"
              value={lyrics}
              onChange={(event) => setLyrics(event.target.value)}
              rows={8}
              placeholder="No lyrics saved for this song yet."
              className="w-full resize-y rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/30 outline-none focus:ring-1 focus:ring-[#ff6b6b]"
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={onClose}
              className="text-white/60 hover:text-white"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={saving}
              className="gradient-coral text-black font-semibold"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" /> : 'Save'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
