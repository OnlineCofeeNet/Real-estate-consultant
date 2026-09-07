import { hasActiveSession, touchSession } from './auth';

let activityBound = false;
let lastActivity = 0;

/** Central client-side security guard for sensitive local operations. */
export function requireActiveSession(): boolean {
  if (!hasActiveSession()) return false;
  const now = Date.now();
  if (now - lastActivity > 60_000) {
    lastActivity = now;
    touchSession();
  }
  return hasActiveSession();
}

/** Install a throttled activity listener once per browser session. */
export function installSecurityActivityMonitor(): () => void {
  if (activityBound || typeof window === 'undefined') return () => {};
  activityBound = true;
  const events = ['pointerdown', 'keydown', 'touchstart', 'scroll', 'mousemove'];
  const onActivity = () => {
    if (!hasActiveSession()) return;
    const now = Date.now();
    if (now - lastActivity < 60_000) return;
    lastActivity = now;
    touchSession();
  };
  events.forEach((event) => window.addEventListener(event, onActivity, { passive: true }));
  return () => {
    events.forEach((event) => window.removeEventListener(event, onActivity));
    activityBound = false;
  };
}
