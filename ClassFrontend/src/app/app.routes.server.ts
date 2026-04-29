import { RenderMode, ServerRoute } from '@angular/ssr';

export const serverRoutes: ServerRoute[] = [
  // Public pages can be prerendered as static HTML.
  { path: '', renderMode: RenderMode.Prerender },
  { path: 'login', renderMode: RenderMode.Prerender },
  { path: 'register', renderMode: RenderMode.Prerender },

  // Auth-gated pages must never be statically prerendered because their
  // ngOnInit changes UI state (loadingOptions, auth redirects) immediately
  // on the client, which creates a hydration mismatch when paired with
  // withEventReplay(). Rendering these on the client avoids the mismatch.
  { path: 'home', renderMode: RenderMode.Client },
  { path: 'schedule', renderMode: RenderMode.Client },
  { path: 'create', renderMode: RenderMode.Client },
  { path: 'recommendations', renderMode: RenderMode.Client },

  // Catch-all falls back to server rendering for any unknown paths.
  { path: '**', renderMode: RenderMode.Server }
];
