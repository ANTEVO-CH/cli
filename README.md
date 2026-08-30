# antevo — Antevo from the terminal

The same MCP surface your assistant connects to, scriptable.

```bash
npx @antevo/cli brief          # the Executive Brief — no account, no signup
npx @antevo/cli tools          # what's available, live from the server
```

## Why a client, not a wrapper

This speaks MCP to the published connectors rather than wrapping a REST API.
Two consequences, and they are the reason it's shaped this way:

- **It cannot fall behind.** `tools` and `call` are complete the day a tool
  appears server-side. A CLI with hardcoded commands would lag every migration.
- **There is no second authorisation model.** Scopes are enforced server-side;
  this inherits them. No parallel permission surface to drift out of sync.

## Commands

```
antevo login                      approve this machine (device code)
antevo logout                     forget stored credentials
antevo whoami                     what this machine can reach

antevo tools [--server NAME]      list tools, live
antevo call <tool> --arg k=v      call any tool; JSON in, JSON out
antevo brief                      the Executive Brief

--server executive|wealth|trademark    default: executive
--json                                 raw JSON instead of text
```

`--arg` values are parsed as JSON when they parse, else kept as strings — so
`--arg days_back=90` sends a number and `--arg mark=NOVARA` sends a string.

## Accounts

| server | account |
|---|---|
| `executive` | none — the public brief, risk radar, dated archive |
| `trademark` | none for screening; a token for your own watchlist |
| `wealth` | yes — `antevo login` |

## Signing in

`antevo login` uses RFC 8628 device authorization: it prints a URL and a code,
you approve in a browser, it polls. No localhost redirect, so it works over SSH
and inside a container.

## Where credentials live

`~/.antevo/credentials.json`, mode 0600.

**Not the OS keychain, and that is a known limitation rather than an oversight.**
Keychain bindings are native modules, and a native dependency turns
`npx @antevo/cli` — the one-command story this exists for — into a compile step
that fails differently on every machine. Access tokens are short-lived (10
minutes) and read-only by default; the refresh token is the asset worth
protecting, and moving it behind an optional keychain dependency is the
follow-up. `antevo logout` removes the file.

## Read-only by default

Nothing here trades, moves money, or changes a position. The connectors are
read-only unless a tool is explicitly a write, and writes are confirmed.

---

Docs: <https://antevo.ch/mcp> · Connectors: `ch.antevo/executive`,
`ch.antevo/wealth`, `ch.antevo/trademark` in the official MCP registry.
