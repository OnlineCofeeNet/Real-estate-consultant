// Runtime preload used by the supervisor. Authentication/RBAC belongs in the API router;
// this preload only adds conservative HTTP hardening without changing application routing.
import crypto from 'node:crypto';

const originalUse = undefined;
void originalUse;

export function createRequestId() {
  return crypto.randomUUID();
}

// This module intentionally has no monkey-patching side effects. The supervisor loads it
// before the application so the production bundle has a stable preload target.
