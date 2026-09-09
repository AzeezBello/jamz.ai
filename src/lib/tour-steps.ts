/**
 * Steps for the guided tour.
 *
 * Kept out of the component file so fast refresh keeps working, and so the
 * copy can be read and edited without wading through positioning logic.
 * `target` matches a `data-tour="…"` attribute in the page.
 */
export interface TourStep {
  target: string;
  title: string;
  body: string;
}

export const TOUR_STEPS: TourStep[] = [
  {
    target: 'studio',
    title: 'The studio',
    body: 'Describe a song here. Lyrics and instruments are optional — leave them empty and the model fills in the gaps.',
  },
  {
    target: 'studio-length',
    title: 'Length and mood',
    body: 'Drag for anything from fifteen seconds to three minutes, and switch to instrumental if you do not want vocals.',
  },
  {
    target: 'library-stats',
    title: 'Your totals',
    body: 'Plays, likes and how many songs you have made. These count your whole library, not just what is on screen.',
  },
  {
    target: 'library-toolbar',
    title: 'Finding things later',
    body: 'Search covers titles, prompts and lyrics. Sort and filter by visibility, and switch between list and grid.',
  },
  {
    target: 'projects',
    title: 'Projects',
    body: 'Group songs into projects — an album, a client, an idea. Deleting a project keeps the songs; it just unfiles them.',
  },
];
