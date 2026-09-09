import { useState, type FormEvent } from 'react';
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
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Loader2 } from 'lucide-react';
import { REPORT_REASONS, reportSong } from '@/lib/api';
import type { Song } from '@/lib/types';

interface ReportDialogProps {
  song: Song | null;
  onClose: () => void;
}

export default function ReportDialog({ song, onClose }: ReportDialogProps) {
  const [reason, setReason] = useState<string>(REPORT_REASONS[0].value);
  const [details, setDetails] = useState('');
  const [sending, setSending] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!song) return;

    setSending(true);
    try {
      await reportSong(song.id, reason, details.trim());
      toast.success('Report submitted. Thank you — a moderator will review it.');
      setDetails('');
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not submit that report.');
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={Boolean(song)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md bg-[#0a0a0a] border-white/10 text-white">
        <DialogHeader>
          <DialogTitle>Report “{song?.title}”</DialogTitle>
          <DialogDescription className="text-white/50">
            Tell us what is wrong with this track. Reports are reviewed by a moderator.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} className="space-y-4">
          <RadioGroup value={reason} onValueChange={setReason} className="space-y-2">
            {REPORT_REASONS.map((option) => (
              <div key={option.value} className="flex items-center gap-2">
                <RadioGroupItem value={option.value} id={`reason-${option.value}`} />
                <Label
                  htmlFor={`reason-${option.value}`}
                  className="text-white/70 text-sm font-normal cursor-pointer"
                >
                  {option.label}
                </Label>
              </div>
            ))}
          </RadioGroup>

          <div className="space-y-2">
            <Label htmlFor="report-details" className="text-white/70 text-sm">
              Anything else? (optional)
            </Label>
            <textarea
              id="report-details"
              value={details}
              onChange={(event) => setDetails(event.target.value)}
              rows={3}
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
              disabled={sending}
              className="bg-[#ff6b6b] text-black font-semibold hover:bg-[#ff8e8e]"
            >
              {sending ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" /> : 'Report'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
