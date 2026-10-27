/**
 * Endpoints and where credentials live.
 *
 * The connector URLs are the ones published at antevo.ch/mcp and in the
 * official MCP registry (ch.antevo/*). They are remote Streamable HTTP — there
 * is no local server to start, which is why this CLI is a client and not a
 * wrapper around one.
 */
import { homedir } from 'node:os';
import { join } from 'node:path';

export const SERVERS = {
  '0700': 'https://api.antevo.ch/mcp/0700/mcp',
  executive: 'https://api.antevo.ch/mcp/executive/mcp',
  wealth: 'https://api.antevo.ch/mcp/wealth/mcp',
  trademark: 'https://trademark.antevo.ch/mcp',
  mandates: 'https://api.antevo.ch/mcp/mandates/mcp',
} as const;

export type ServerName = keyof typeof SERVERS;

/** Which servers need an account. The 07:00 Brief, Executive and trademark screening do not. */
export const NEEDS_AUTH: Record<ServerName, boolean> = {
  '0700': false,
  executive: false,
  trademark: false,
  wealth: true,
  mandates: true,
};

export const ISSUER = 'https://api.antevo.ch';

/**
 * The one origin the stored token may be sent to.
 *
 * `antevo login` gets its token from the api.antevo.ch authorization server,
 * and the servers it is for are the ones on api.antevo.ch: their protected-
 * resource metadata names api.antevo.ch as their only authorization server.
 * A bearer token works for whoever holds it, so it goes to the resource it was
 * issued for and nowhere else. trademark.antevo.ch runs its own authorization
 * server and never issued this token, so it never receives it.
 */
export const TOKEN_ORIGIN = new URL(ISSUER).origin;

/**
 * Whether the stored token may be sent to this server. Compares whole origins
 * (scheme, host and port), not a substring, so http://api.antevo.ch and
 * https://api.antevo.ch.example.com do not qualify.
 */
export function sendsToken(serverUrl: string): boolean {
  try {
    return new URL(serverUrl).origin === TOKEN_ORIGIN;
  } catch {
    return false;
  }
}

/**
 * The OAuth client. Registered once via RFC 7591 on first login and cached —
 * Dynamic Client Registration is how an MCP client connects without anyone
 * provisioning it credentials in advance.
 */
export const CLIENT_NAME = 'antevo-cli';

/**
 * A loopback redirect_uri is required at registration even though the device
 * flow never redirects: the server validates the shape (https, or http on
 * loopback only) and rejects anything else.
 */
export const CLIENT_REDIRECT = 'http://127.0.0.1:0/cli';

export const CONFIG_DIR = join(homedir(), '.antevo');
export const CREDENTIALS_PATH = join(CONFIG_DIR, 'credentials.json');
