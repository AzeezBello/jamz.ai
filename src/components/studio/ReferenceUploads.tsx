import { useRef, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { AudioLines, Info, Loader2, Mic, Plus, Sparkles, X } from 'lucide-react';
import { deleteReference, uploadReference, MAX_REFERENCE_BYTES } from '@/lib/api';
import type { ReferenceKind, ReferenceUpload } from '@/lib/types';

const KINDS: Array<{
  kind: ReferenceKind;
  label: string;
  icon: typeof AudioLines;
  accept: string;
}> = [
  { kind: 'audio', label: 'Audio', icon: AudioLines, accept: 'audio/*' },
  { kind: 'voice', label: 'Voice', icon: Mic, accept: 'audio/*' },
  { kind: 'inspo', label: 'Inspo', icon: Sparkles, accept: 'audio/*,image/*' },
];

interface ReferenceUploadsProps {
  references: ReferenceUpload[];
  onChange: (references: ReferenceUpload[]) => void;
}

export default function ReferenceUploads({ references, onChange }: ReferenceUploadsProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [pendingKind, setPendingKind] = useState<ReferenceKind | null>(null);
  const [busy, setBusy] = useState(false);

  const pick = (kind: ReferenceKind) => {
    setPendingKind(kind);
    inputRef.current?.click();
  };

  const handleFile = async (file: File | undefined) => {
    if (!file || !pendingKind) return;
    setBusy(true);
    try {
      onChange([...references, await uploadReference(file, pendingKind)]);
      toast.success(`Added ${file.name}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not upload that file.');
    } finally {
      setBusy(false);
      setPendingKind(null);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const remove = async (reference: ReferenceUpload) => {
    onChange(references.filter((item) => item.id !== reference.id));
    try {
      await deleteReference(reference);
    } catch {
      // The list is already updated; a leftover row is not worth a dialog.
    }
  };

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-3 gap-2">
        {KINDS.map(({ kind, label, icon: Icon }) => (
          <Button
            key={kind}
            type="button"
            variant="outline"
            disabled={busy}
            onClick={() => pick(kind)}
            className="border-white/10 bg-white/[0.03] text-white/70 hover:bg-white/10 hover:text-white"
          >
            {busy && pendingKind === kind ? (
              <Loader2 className="w-4 h-4 mr-1.5 animate-spin" aria-hidden="true" />
            ) : (
              <Plus className="w-4 h-4 mr-1.5" aria-hidden="true" />
            )}
            <Icon className="w-4 h-4 mr-1.5" aria-hidden="true" />
            {label}
          </Button>
        ))}
      </div>

      <input
        ref={inputRef}
        type="file"
        hidden
        accept={KINDS.find((item) => item.kind === pendingKind)?.accept ?? 'audio/*'}
        onChange={(event) => void handleFile(event.target.files?.[0])}
      />

      {references.length > 0 && (
        <ul className="space-y-1" aria-label="Attached references">
          {references.map((reference) => (
            <li
              key={reference.id}
              className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5"
            >
              <span className="text-[10px] uppercase tracking-wide text-[#ff8e8e] shrink-0">
                {reference.kind}
              </span>
              <span className="text-xs text-white/60 truncate flex-1">{reference.filename}</span>
              <button
                type="button"
                onClick={() => void remove(reference)}
                aria-label={`Remove ${reference.filename}`}
                className="text-white/30 hover:text-[#ff6b6b]"
              >
                <X className="w-3.5 h-3.5" aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      )}

      {/* Say plainly what these do and do not do. */}
      <p className="flex items-start gap-1.5 text-[11px] text-white/35">
        <Info className="w-3 h-3 mt-0.5 shrink-0" aria-hidden="true" />
        References are saved to your account, but the current model does not listen to them yet. Up
        to {Math.round(MAX_REFERENCE_BYTES / 1024 / 1024)} MB each.
      </p>
    </div>
  );
}
