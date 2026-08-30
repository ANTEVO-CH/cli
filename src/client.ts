/**
 * The MCP client.
 *
 * This CLI speaks MCP rather than wrapping a REST API, and that is the whole
 * design. Phase B is still migrating ~30 v1 tools into the v3 sub-servers; a
 * CLI with hardcoded commands would ship already behind and stay behind, while
 * `tools` + `call` are complete the day a tool appears server-side.
 */
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { SERVERS, NEEDS_AUTH, type ServerName } from './config.js';
import { accessToken } from './auth.js';

export async function connect(server: ServerName): Promise<Client> {
  const token = await accessToken();
  if (NEEDS_AUTH[server] && !token) {
    throw new Error(`${server} needs an account — run \`antevo login\` first`);
  }

  const transport = new StreamableHTTPClientTransport(new URL(SERVERS[server]), {
    requestInit: token ? { headers: { Authorization: `Bearer ${token}` } } : undefined,
  });

  // clientInfo is not decoration: the server logs it, and it is the only way
  // anyone can tell this CLI's traffic from a crawler's.
  const client = new Client({ name: 'antevo-cli', version: '0.1.0' }, { capabilities: {} });
  await client.connect(transport);
  return client;
}

/** Text content from a tool result, which is what a terminal wants. */
export function textOf(result: any): string {
  const parts = (result?.content ?? [])
    .filter((c: any) => c?.type === 'text')
    .map((c: any) => c.text);
  return parts.join('\n');
}
