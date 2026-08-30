/**
 * Credential storage.
 *
 * A 0600 file under ~/.antevo, NOT the OS keychain. That is a deliberate v0
 * choice and a known limitation, stated here rather than buried: keytar and its
 * successors are native modules, and a native dependency turns `npx @antevo/cli`
 * — the one-command story this exists for — into a compile step that fails
 * differently on every machine.
 *
 * The trade is real. A 0600 file is readable by anything already running as the
 * user, where a keychain entry would at least prompt. Access tokens here are
 * short-lived (10 minutes) and read-only by default; the refresh token is the
 * asset worth protecting, and moving it to a keychain behind an optional
 * dependency is the follow-up.
 */
import { chmod, mkdir, readFile, writeFile, rm } from 'node:fs/promises';
import { CONFIG_DIR, CREDENTIALS_PATH } from './config.js';

export interface Credentials {
  client_id: string;
  access_token?: string;
  refresh_token?: string;
  /** Epoch seconds. */
  expires_at?: number;
  scope?: string;
}

export async function load(): Promise<Credentials | null> {
  try {
    return JSON.parse(await readFile(CREDENTIALS_PATH, 'utf8')) as Credentials;
  } catch {
    return null;
  }
}

export async function save(c: Credentials): Promise<void> {
  await mkdir(CONFIG_DIR, { recursive: true, mode: 0o700 });
  // Write then chmod: the file must never exist, even briefly, at the umask's
  // default permissions with a refresh token in it.
  await writeFile(CREDENTIALS_PATH, JSON.stringify(c, null, 2), { mode: 0o600 });
  await chmod(CREDENTIALS_PATH, 0o600);
}

export async function clear(): Promise<void> {
  await rm(CREDENTIALS_PATH, { force: true });
}

export function isExpired(c: Credentials): boolean {
  if (!c.access_token || !c.expires_at) return true;
  // 30s of slack: a token that expires mid-request is a confusing 401 rather
  // than a refresh.
  return Date.now() / 1000 >= c.expires_at - 30;
}
