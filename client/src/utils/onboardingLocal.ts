const PREFIX = 'lf_onboarding_v1';

export type OnboardingStep = 1 | 2 | 3;

export interface OnboardingProgress {
  step: OnboardingStep;
  goalId?: string;
  planId?: string;
}

function key(userId: string): string {
  return `${PREFIX}_${userId}`;
}

export function loadOnboardingProgress(userId: string): OnboardingProgress | null {
  try {
    const raw = localStorage.getItem(key(userId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as OnboardingProgress;
    if (parsed.step !== 1 && parsed.step !== 2 && parsed.step !== 3) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveOnboardingProgress(userId: string, data: OnboardingProgress): void {
  try {
    localStorage.setItem(key(userId), JSON.stringify(data));
  } catch {
    /* ignore quota */
  }
}

export function clearOnboardingProgress(userId: string): void {
  try {
    localStorage.removeItem(key(userId));
  } catch {
    /* ignore */
  }
}
