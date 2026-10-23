const SECONDS_KEY = "aqsa-sign-in-listening-seconds-v1";
const VISITS_KEY = "aqsa-sign-in-visit-count-v1";
const SESSION_KEY = "aqsa-sign-in-visit-counted-v1";
const RESUME_TARGET_KEY = "aqsa-sign-in-resume-target-v1";
const DISMISSED_UNTIL_KEY = "aqsa-sign-in-dismissed-until-v1";

export const SIGN_IN_AUDIO_REST_EVENT = "aqsa:audio-rest";
export const SIGN_IN_DISMISS_DAYS = 30;
const TEN_MINUTES = 600;

function readNumber(key: string): number {
  try {
    const value = Number(localStorage.getItem(key));
    return Number.isFinite(value) && value > 0 ? value : 0;
  } catch {
    return 0;
  }
}

export function noteSignInVisit(): void {
  try {
    if (sessionStorage.getItem(SESSION_KEY)) return;
    sessionStorage.setItem(SESSION_KEY, "1");
    localStorage.setItem(VISITS_KEY, String(Math.min(99, readNumber(VISITS_KEY) + 1)));
  } catch {
    // The invitation is optional when storage is restricted.
  }
}

export function recordListeningDelta(previous: number, current: number, isSeeking: boolean): number {
  const delta = current - previous;
  return !isSeeking && Number.isFinite(delta) && delta > 0 && delta <= 15 ? delta : 0;
}

export function addListeningSeconds(delta: number): void {
  if (!Number.isFinite(delta) || delta <= 0) return;
  try {
    localStorage.setItem(SECONDS_KEY, String(Math.min(TEN_MINUTES, readNumber(SECONDS_KEY) + delta)));
  } catch {
    // Listening still works without browser storage.
  }
}

export function markResumedEpisode(): void {
  try {
    if (readNumber(VISITS_KEY) < 2 || readNumber(RESUME_TARGET_KEY)) return;
    localStorage.setItem(RESUME_TARGET_KEY, String(readNumber(SECONDS_KEY) + 60));
  } catch {
    // The ten-minute route remains available when possible.
  }
}

export function isSignInInviteDue(now = Date.now()): boolean {
  if (readNumber(DISMISSED_UNTIL_KEY) > now) return false;
  const listened = readNumber(SECONDS_KEY);
  const resumeTarget = readNumber(RESUME_TARGET_KEY);
  return listened >= TEN_MINUTES || (resumeTarget > 0 && listened >= resumeTarget);
}

export function dismissSignInInvite(now = Date.now()): void {
  try {
    localStorage.setItem(DISMISSED_UNTIL_KEY, String(now + SIGN_IN_DISMISS_DAYS * 24 * 60 * 60 * 1000));
  } catch {
    // Dismiss for this session even if storage is unavailable.
  }
}
