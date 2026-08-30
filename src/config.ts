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
  executive: 'https://api.antevo.ch/mcp/executive/mcp',
  wealth: 'https://api.antevo.ch/mcp/wealth/mcp',
  trademark: 'https://trademark.antevo.ch/mcp',
} as const;

export type ServerName = keyof typeof SERVERS;

/** Which servers need an account. Executive and trademark screening do not. */
export const NEEDS_AUTH: Record<ServerName, boolean> = {
  executive: false,
  trademark: false,
  wealth: true,
};

export const ISSUER = 'https://api.antevo.ch';

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
