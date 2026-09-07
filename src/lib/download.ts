import { toast } from 'sonner';
import { getAudioUrl } from './api';

/**
 * Downloads a master. The signed URL carries a Content-Disposition of
 * attachment, so the browser saves the file instead of navigating to it.
 */
export async function downloadSong(songId: string, title: string): Promise<void> {
  const toastId = toast.loading(`Preparing "${title}"…`);
  try {
    const url = await getAudioUrl(songId, true);
    const link = document.createElement('a');
    link.href = url;
    link.rel = 'noopener';
    document.body.appendChild(link);
    link.click();
    link.remove();
    toast.success('Download started', { id: toastId });
  } catch (err) {
    toast.error(err instanceof Error ? err.message : 'Download failed.', { id: toastId });
  }
}

export async function copyShareLink(songId: string): Promise<void> {
  const url = `${window.location.origin}/song/${songId}`;
  try {
    await navigator.clipboard.writeText(url);
    toast.success('Link copied to clipboard');
  } catch {
    // Clipboard access is denied in some browsers/contexts; show the URL so
    // the user can still copy it by hand.
    toast.message('Copy this link', { description: url });
  }
}
