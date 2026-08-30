/**
 * RFC 8628 device authorization.
 *
 * Device-code rather than a browser redirect because a CLI has nowhere to
 * redirect TO: no localhost listener over SSH, none in a container. The user
 * approves on whatever device has a browser, and this polls.
 */
import { ISSUER, CLIENT_NAME, CLIENT_REDIRECT } from './config.js';
import { load, save, isExpired, type Credentials } from './store.js';

interface DeviceAuth {
  device_code: string;
  user_code: string;
  verification_uri: string;
  verification_uri_complete?: string;
  expires_in: number;
  interval: number;
}

async function form(path: string, body: Record<string, string>): Promise<any> {
  const r = await fetch(`${ISSUER}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(body),
  });
  const text = await r.text();
  let data: any;
  try { data = JSON.parse(text); } catch { data = { error: 'invalid_response', error_description: text.slice(0, 200) }; }
  // OAuth errors are a flat object with `error` at the top level, and this API
  // returns them that way on /oauth/* paths. Anything else here is a bug
  // upstream, not something to paper over.
  if (!r.ok && !data.error) data.error = `http_${r.status}`;
  return data;
}

/** Register this CLI as an OAuth client. Once, then cached. */
async function ensureClient(): Promise<string> {
  const existing = await load();
  if (existing?.client_id) return existing.client_id;

  const r = await fetch(`${ISSUER}/oauth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_name: CLIENT_NAME,
      redirect_uris: [CLIENT_REDIRECT],
      grant_types: ['authorization_code', 'refresh_token',
                    'urn:ietf:params:oauth:grant-type:device_code'],
      response_types: ['code'],
      token_endpoint_auth_method: 'none',
    }),
  });
  const data: any = await r.json();
  if (!r.ok) {
    throw new Error(`registration failed: ${data.error_description ?? data.error ?? r.status}`);
  }
  await save({ ...(existing ?? {}), client_id: data.client_id });
  return data.client_id as string;
}

export async function login(onPrompt: (d: DeviceAuth) => void): Promise<Credentials> {
  const client_id = await ensureClient();

  const auth: DeviceAuth = await form('/oauth/device_authorization', {
    client_id, scope: 'mcp:read',
  });
  if ((auth as any).error) {
    throw new Error(`device authorization failed: ${(auth as any).error_description ?? (auth as any).error}`);
  }
  onPrompt(auth);

  const deadline = Date.now() + auth.expires_in * 1000;
  // The server sets the poll interval; honour it rather than choosing one.
  let interval = (auth.interval || 5) * 1000;

  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, interval));
    const t = await form('/oauth/token', {
      grant_type: 'urn:ietf:params:oauth:grant-type:device_code',
      device_code: auth.device_code,
      client_id,
    });

    if (t.access_token) {
      const creds: Credentials = {
        client_id,
        access_token: t.access_token,
        refresh_token: t.refresh_token,
        expires_at: Math.floor(Date.now() / 1000) + (t.expires_in ?? 600),
        scope: t.scope,
      };
      await save(creds);
      return creds;
    }
    if (t.error === 'authorization_pending') continue;
    // RFC 8628: slow_down means add five seconds, permanently, not retry sooner.
    if (t.error === 'slow_down') { interval += 5000; continue; }
    throw new Error(t.error_description ?? t.error ?? 'token exchange failed');
  }
  throw new Error('the code expired before it was approved — run `antevo login` again');
}

/**
 * A usable access token, refreshing if needed.
 *
 * Refresh is single-shot on purpose. The server revokes an entire token FAMILY
 * when a refresh token is reused, so two concurrent refreshes do not race to a
 * winner — they log the user out. One process, one refresh, then persist.
 */
export async function accessToken(): Promise<string | null> {
  const c = await load();
  if (!c?.client_id) return null;
  if (c.access_token && !isExpired(c)) return c.access_token;
  if (!c.refresh_token) return null;

  const t = await form('/oauth/token', {
    grant_type: 'refresh_token',
    refresh_token: c.refresh_token,
    client_id: c.client_id,
  });
  if (!t.access_token) return null;

  await save({
    ...c,
    access_token: t.access_token,
    refresh_token: t.refresh_token ?? c.refresh_token,
    expires_at: Math.floor(Date.now() / 1000) + (t.expires_in ?? 600),
    scope: t.scope ?? c.scope,
  });
  return t.access_token as string;
}
