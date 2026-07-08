/**
 * First-visit onboarding state, backed by localStorage and exposed as an
 * external store so React can read it via useSyncExternalStore without a
 * hydration mismatch (server always reports "dismissed" so nothing flashes).
 */
const STORAGE_KEY = 'jarvis.onboarding.dismissed.v1';

const listeners = new Set<() => void>();
let snapshot: boolean | null = null;

function read(): boolean {
  if (typeof window === 'undefined') return true;
  try {
    return window.localStorage.getItem(STORAGE_KEY) === '1';
  } catch {
    return true;
  }
}

export function subscribeOnboarding(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Cached client snapshot (stable reference until dismissed). */
export function getOnboardingSnapshot(): boolean {
  if (snapshot === null) snapshot = read();
  return snapshot;
}

/** Server + hydration: treat as dismissed so the modal never flashes on SSR. */
export function getServerOnboardingSnapshot(): boolean {
  return true;
}

export function dismissOnboarding(): void {
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.setItem(STORAGE_KEY, '1');
    } catch {
      /* ignore */
    }
  }
  snapshot = null;
  for (const l of listeners) l();
}
