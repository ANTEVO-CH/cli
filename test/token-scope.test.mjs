// The stored token goes to api.antevo.ch and nowhere else.
//
// Runs against the build (`npm test` builds first) with an in-memory fetch
// standing in for the servers, so it needs no credentials file and no network.
// The fetch records the Authorization header of every request the MCP
// transport makes — initialize, the initialized notification, the SSE GET and
// the tool call — which is what a server would actually receive.
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { connect, explainRefusal } from '../dist/client.js';
import { SERVERS, NEEDS_AUTH, TOKEN_ORIGIN, sendsToken } from '../dist/config.js';

const TOKEN = 'test-access-token';

/** A minimal Streamable HTTP MCP server, as a fetch. */
function fakeServer({ refuseToolCall = false } = {}) {
  const seen = [];
  const fetch = async (url, init = {}) => {
    const method = init.method ?? 'GET';
    seen.push({ url: String(url), method, authorization: new Headers(init.headers).get('authorization') });
    if (method !== 'POST') return new Response(null, { status: 405 });

    const msg = JSON.parse(init.body);
    if (msg.id === undefined) return new Response(null, { status: 202 });
    const reply = (result) => Response.json({ jsonrpc: '2.0', id: msg.id, result });

    switch (msg.method) {
      case 'initialize':
        return reply({
          protocolVersion: msg.params.protocolVersion,
          capabilities: { tools: {} },
          serverInfo: { name: 'fake', version: '0' },
        });
      case 'tools/list':
        return reply({ tools: [] });
      case 'tools/call':
        if (refuseToolCall) {
          return Response.json(
            { error: 'invalid_token', error_description: 'Sign in to Antevo to use this tool' },
            { status: 401 },
          );
        }
        return reply({ content: [{ type: 'text', text: 'ok' }] });
      default:
        return Response.json({ jsonrpc: '2.0', id: msg.id, error: { code: -32601, message: 'not found' } });
    }
  };
  return { fetch, seen };
}

/** A token source that counts how often it is asked. */
function tokenSource(value = TOKEN) {
  const source = async () => { source.calls += 1; return value; };
  source.calls = 0;
  return source;
}

async function session(server, opts) {
  const client = await connect(server, opts);
  await client.listTools();
  await client.callTool({ name: 'anything', arguments: {} });
  await client.close();
}

const onIssuer = Object.keys(SERVERS).filter((s) => sendsToken(SERVERS[s]));
const offIssuer = Object.keys(SERVERS).filter((s) => !sendsToken(SERVERS[s]));

test('the token origin is the issuer the CLI logs in to', () => {
  assert.equal(TOKEN_ORIGIN, 'https://api.antevo.ch');
  assert.deepEqual(onIssuer.sort(), ['0700', 'executive', 'mandates', 'tremor', 'wealth']);
  assert.deepEqual(offIssuer, ['trademark']);
});

for (const server of onIssuer) {
  test(`${server} (api.antevo.ch) receives the token on every request`, async () => {
    const { fetch, seen } = fakeServer();
    await session(server, { token: tokenSource(), fetch });

    assert.ok(seen.length >= 4, `expected the full handshake, saw ${seen.length} requests`);
    for (const r of seen) {
      assert.equal(new URL(r.url).origin, 'https://api.antevo.ch');
      assert.equal(r.authorization, `Bearer ${TOKEN}`, `${r.method} ${r.url}`);
    }
  });
}

test('trademark (trademark.antevo.ch) never receives the token, and it is never read', async () => {
  const { fetch, seen } = fakeServer();
  const token = tokenSource();
  await session('trademark', { token, fetch });

  assert.equal(token.calls, 0, 'the stored token was read (and possibly refreshed) for trademark');
  assert.ok(seen.length >= 4, `expected the full handshake, saw ${seen.length} requests`);
  for (const r of seen) {
    assert.equal(new URL(r.url).origin, 'https://trademark.antevo.ch');
    assert.equal(r.authorization, null, `${r.method} ${r.url} carried an Authorization header`);
  }
});

test('signed out, the public api.antevo.ch servers send no Authorization header', async () => {
  for (const server of ['0700', 'executive']) {
    const { fetch, seen } = fakeServer();
    await session(server, { token: tokenSource(null), fetch });
    for (const r of seen) assert.equal(r.authorization, null, `${server}: ${r.method} ${r.url}`);
  }
});

test('signed out, wealth and mandates refuse before any request', async () => {
  for (const server of ['wealth', 'mandates']) {
    const { fetch, seen } = fakeServer();
    await assert.rejects(connect(server, { token: tokenSource(null), fetch }), /run `antevo login` first/);
    assert.equal(seen.length, 0);
  }
});

test('every server that needs an account is one antevo login can sign in to', () => {
  for (const [server, needs] of Object.entries(NEEDS_AUTH)) {
    if (needs) assert.ok(sendsToken(SERVERS[server]), `${server} needs auth but is not on ${TOKEN_ORIGIN}`);
  }
});

test('sendsToken matches the whole origin, not a look-alike', () => {
  for (const url of [
    'https://api.antevo.ch/mcp/wealth/mcp',
    'https://api.antevo.ch:443/mcp/mandates/mcp',
    'https://API.ANTEVO.CH/mcp/executive/mcp',
  ]) assert.equal(sendsToken(url), true, url);

  for (const url of [
    'https://trademark.antevo.ch/mcp',
    'https://antevo.ch/mcp',
    'http://api.antevo.ch/mcp/wealth/mcp',
    'https://api.antevo.ch:8443/mcp/wealth/mcp',
    'https://api.antevo.ch.example.com/mcp',
    'https://example.com/https://api.antevo.ch/mcp',
    'https://example.com/mcp?u=https://api.antevo.ch',
    'not a url',
    '',
  ]) assert.equal(sendsToken(url), false, url);
});

test('a Trademark sign-in refusal says antevo login does not reach it', async () => {
  const { fetch, seen } = fakeServer({ refuseToolCall: true });
  const client = await connect('trademark', { token: tokenSource(), fetch });
  await assert.rejects(
    client.callTool({ name: 'my_watches', arguments: {} }).catch((e) => { throw explainRefusal(e, 'trademark'); }),
    (err) => {
      assert.match(err.message, /sign-in on trademark\.antevo\.ch, which the CLI does not support yet/);
      assert.match(err.message, /never sent to trademark\.antevo\.ch/);
      return true;
    },
  );
  await client.close();
  for (const r of seen) assert.equal(r.authorization, null);
});

test('a 401 from api.antevo.ch is passed through unchanged', async () => {
  const { fetch } = fakeServer({ refuseToolCall: true });
  const client = await connect('wealth', { token: tokenSource(), fetch });
  const original = await client.callTool({ name: 'x', arguments: {} }).catch((e) => e);
  await client.close();
  assert.equal(explainRefusal(original, 'wealth'), original);
  const other = new Error('something else');
  assert.equal(explainRefusal(other, 'trademark'), other);
});
