/**
 * The MCP client.
 *
 * This CLI speaks MCP rather than wrapping a REST API, and that is the whole
 * design. Phase B is still migrating ~30 v1 tools into the v3 sub-servers; a
 * CLI with hardcoded commands would ship already behind and stay behind, while
 * `tools` + `call` are complete the day a tool appears server-side.
 */
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import {
  StreamableHTTPClientTransport,
  StreamableHTTPError,
} from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import type { FetchLike } from '@modelcontextprotocol/sdk/shared/transport.js';
import { SERVERS, NEEDS_AUTH, sendsToken, type ServerName } from './config.js';
import { accessToken } from './auth.js';

/**
 * What connect() reaches outside itself. Both default to the real thing; the
 * tests pass their own so they need neither a credentials file nor a network.
 */
export interface ConnectOptions {
  token?: () => Promise<string | null>;
  fetch?: FetchLike;
}

export async function connect(server: ServerName, opts: ConnectOptions = {}): Promise<Client> {
  const url = SERVERS[server];

  // The stored token is read, and refreshed, only for a server it was issued
  // for. Anywhere else this connects signed out, because to that server it is.
  const token = sendsToken(url) ? await (opts.token ?? accessToken)() : null;
  if (NEEDS_AUTH[server] && !token) {
    throw new Error(`${server} needs an account — run \`antevo login\` first`);
  }

  const transport = new StreamableHTTPClientTransport(new URL(url), {
    requestInit: token ? { headers: { Authorization: `Bearer ${token}` } } : undefined,
    fetch: opts.fetch,
  });

  // clientInfo is not decoration: the server logs it, and it is the only way
  // anyone can tell this CLI's traffic from a crawler's.
  const client = new Client({ name: 'antevo-cli', version: '0.1.0' }, { capabilities: {} });
  await client.connect(transport);
  return client;
}

/**
 * A sign-in refusal from a server `antevo login` does not sign in to, in words.
 *
 * Trademark's own tools (watchlist, deadlines, followed filers, investigations)
 * authorise on trademark.antevo.ch. The CLI has no sign-in for that yet, and
 * the api.antevo.ch token must not stand in for one, so a 401 there says so
 * instead of pointing at `antevo login`, which cannot help. Any other error,
 * and any 401 from api.antevo.ch, comes back unchanged.
 */
export function explainRefusal(err: unknown, server: ServerName): unknown {
  const url = SERVERS[server];
  if (err instanceof StreamableHTTPError && err.code === 401 && !sendsToken(url)) {
    const host = new URL(url).host;
    return new Error(
      `this ${server} tool needs a sign-in on ${host}, which the CLI does not support yet. ` +
      `\`antevo login\` signs in to api.antevo.ch only (Wealth, Mandates), and that sign-in ` +
      `is never sent to ${host}. The ${server} tools that need no account still work.`,
    );
  }
  return err;
}

/** Text content from a tool result, which is what a terminal wants. */
export function textOf(result: any): string {
  const parts = (result?.content ?? [])
    .filter((c: any) => c?.type === 'text')
    .map((c: any) => c.text);
  return parts.join('\n');
}
