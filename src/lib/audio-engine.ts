/**
 * One <audio> element for the whole app.
 *
 * Keeping it outside React means playback survives route changes, and the
 * store stays a thin reflection of what the element is actually doing rather
 * than a timer pretending to be playback.
 */
let element: HTMLAudioElement | null = null;

export function getAudioElement(): HTMLAudioElement {
  if (!element) {
    element = new Audio();
    element.preload = 'metadata';
    // Signed URLs are same-origin to Supabase storage; anonymous is correct.
    element.crossOrigin = 'anonymous';

    // `new Audio()` is detached from the document, which plays fine but is
    // invisible to devtools and to anything inspecting the page. Attaching it
    // costs nothing and makes what is actually playing observable.
    if (typeof document !== 'undefined') {
      element.setAttribute('data-jamz-player', '');
      element.hidden = true;
      document.body.appendChild(element);
    }
  }
  return element;
}

/** Test seam: drop the singleton so each test starts clean. */
export function resetAudioElement() {
  if (element) {
    element.pause();
    element.src = '';
    element.remove();
  }
  element = null;
}
