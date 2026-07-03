// This is a client-side, local-first app (Dexie/IndexedDB is the source of truth), so we
// disable SSR/prerendering and let everything run in the browser.
export const ssr = false;
export const prerender = false;
