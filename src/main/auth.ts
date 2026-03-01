import fs from 'fs';
import path from 'path';
import os from 'os';

export interface OAuthCredentials {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  scopes: string[];
  subscriptionType: string | null;
  rateLimitTier: string | null;
}

const CREDENTIALS_PATH = path.join(os.homedir(), '.claude', '.credentials.json');

/**
 * Reads Claude Code's stored OAuth credentials from ~/.claude/.credentials.json.
 * Returns null if the file doesn't exist or is malformed (user hasn't run `claude login`).
 */
export function readCredentials(): OAuthCredentials | null {
  try {
    const raw = fs.readFileSync(CREDENTIALS_PATH, 'utf8');
    const parsed = JSON.parse(raw);
    const creds = parsed?.claudeAiOauth;
    if (!creds?.accessToken) return null;
    return {
      accessToken: creds.accessToken,
      refreshToken: creds.refreshToken ?? '',
      expiresAt: creds.expiresAt ?? 0,
      scopes: creds.scopes ?? [],
      subscriptionType: creds.subscriptionType ?? null,
      rateLimitTier: creds.rateLimitTier ?? null,
    };
  } catch {
    return null;
  }
}

/** Returns true if credentials exist and are not expired */
export function isAuthenticated(): boolean {
  const creds = readCredentials();
  if (!creds) return false;
  // Allow up to 5 minutes past expiry as a grace period
  return Date.now() < creds.expiresAt + 5 * 60 * 1000;
}
