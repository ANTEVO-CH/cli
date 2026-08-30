#!/usr/bin/env node
/**
 * antevo — Antevo from the terminal.
 *
 * A thin MCP client over the same servers an assistant connects to. Two
 * consequences worth stating, because they are the reason it is shaped this
 * way: there is no second API to keep in sync, and no second authorisation
 * model — the 26 scopes are enforced server-side and this inherits them.
 */
import { parseArgs } from './args.js';
import { connect, textOf } from './client.js';
import { login } from './auth.js';
import { load, clear } from './store.js';
import { SERVERS, NEEDS_AUTH, type ServerName } from './config.js';

const USAGE = `antevo — Antevo from the terminal

  antevo login                      approve this machine (opens a code to confirm)
  antevo logout                     forget the stored credentials
  antevo whoami                     what this machine can reach

  antevo tools [--server NAME]      list tools, live from the server
  antevo call <tool> --arg k=v      call any tool; JSON in, JSON out
  antevo brief                      the Executive Brief (no account needed)

  --server executive|wealth|trademark   default: executive
  --json                                raw JSON instead of text

Executive and trademark screening need no account. Wealth needs one.
Docs: https://antevo.ch/mcp`;

function pickServer(flags: Set<string>, argv: string[]): ServerName {
  const i = argv.indexOf('--server');
  const name = i >= 0 ? argv[i + 1] : 'executive';
  if (!(name in SERVERS)) {
    throw new Error(`unknown server "${name}" — one of: ${Object.keys(SERVERS).join(', ')}`);
  }
  return name as ServerName;
}

async function main(): Promise<number> {
  const argv = process.argv.slice(2);
  const cmd = argv[0];
  if (!cmd || cmd === 'help' || cmd === '--help' || cmd === '-h') {
    console.log(USAGE);
    return 0;
  }

  // --server takes a value; strip the pair before generic parsing so the value
  // is not mistaken for a positional argument.
  const si = argv.indexOf('--server');
  const cleaned = si >= 0 ? [...argv.slice(0, si), ...argv.slice(si + 2)] : argv;
  const { positional, args, flags } = parseArgs(cleaned.slice(1));
  const server = pickServer(flags, argv);
  const asJson = flags.has('json');

  switch (cmd) {
    case 'login': {
      await login((d) => {
        console.log(`\n  Open:  ${d.verification_uri_complete ?? d.verification_uri}`);
        console.log(`  Code:  ${d.user_code}\n`);
        console.log('  Waiting for approval…');
      });
      console.log('  Approved. Credentials saved to ~/.antevo/credentials.json (0600).');
      return 0;
    }

    case 'logout': {
      await clear();
      console.log('  Signed out.');
      return 0;
    }

    case 'whoami': {
      const c = await load();
      if (!c?.client_id) { console.log('  Not signed in. Run `antevo login`.'); return 1; }
      const expires = c.expires_at ? new Date(c.expires_at * 1000).toISOString() : 'n/a';
      console.log(`  client_id  ${c.client_id}`);
      console.log(`  scope      ${c.scope ?? '(none)'}`);
      console.log(`  expires    ${expires}`);
      console.log(`  refresh    ${c.refresh_token ? 'present' : 'absent'}`);
      return 0;
    }

    case 'tools': {
      const client = await connect(server);
      const { tools } = await client.listTools();
      await client.close();
      if (asJson) { console.log(JSON.stringify(tools, null, 2)); return 0; }
      for (const t of tools) {
        console.log(`  ${t.name}${t.title ? `  — ${t.title}` : ''}`);
      }
      console.log(`\n  ${tools.length} tools on ${server}`);
      return 0;
    }

    case 'call': {
      const name = positional[0];
      if (!name) { console.error('  usage: antevo call <tool> [--arg k=v …]'); return 2; }
      const client = await connect(server);
      const result: any = await client.callTool({ name, arguments: args });
      await client.close();
      // structuredContent when the tool provides it — the Executive tools do,
      // and it is already the parsed object rather than a string to re-parse.
      if (asJson || result?.structuredContent) {
        console.log(JSON.stringify(result.structuredContent ?? result, null, 2));
      } else {
        console.log(textOf(result));
      }
      return result?.isError ? 1 : 0;
    }

    case 'brief': {
      const client = await connect('executive');
      const result: any = await client.callTool({
        name: 'get_executive_brief',
        arguments: args,
      });
      await client.close();
      if (asJson) { console.log(JSON.stringify(result.structuredContent ?? result, null, 2)); }
      else { console.log(textOf(result)); }
      return 0;
    }

    default:
      console.error(`  unknown command "${cmd}"\n`);
      console.log(USAGE);
      return 2;
  }
}

main()
  .then((code) => process.exit(code))
  .catch((err) => {
    console.error(`  ${err instanceof Error ? err.message : String(err)}`);
    process.exit(1);
  });
