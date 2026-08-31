# antevo — Antevo from the terminal

The same MCP surface your assistant connects to, scriptable.

```bash
npx @antevo/cli brief          # the Executive Brief — no account, no signup
npx @antevo/cli tools          # what's available, live from the server
```

Fifteen public tools on the Executive connector alone: the brief and its dated
archive, the risk radar, the forward calendar, market snapshot and indices, a
nine-layer world map, fourteen per-sector desk reads, and around 80,000
macro-economic series. **What you can ask it** below has a runnable line for
each.

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

## What you can ask it

Every one of these runs with **no account** — the Executive connector is public.
Copy any line.

**The day**

```bash
npx @antevo/cli brief                                   # today's Executive Brief
npx @antevo/cli call get_risk_radar                     # what could go wrong, graded
npx @antevo/cli call get_catalysts --arg days_ahead=14  # the forward calendar
npx @antevo/cli call get_executive_note --arg as_of=2026-08-09
```

**The desk's own view, one sector at a time** — fourteen areas, each dated

```bash
npx @antevo/cli call list_coverage
npx @antevo/cli call get_coverage --arg area=real-assets-shipping
npx @antevo/cli call get_coverage --arg area=art-core
npx @antevo/cli call get_coverage --arg area=wealth-succession-planning                                  --arg scope=institutional
```

Areas run from `real-assets-shipping`, `real-assets-aviation` and
`real-assets-yachts` through `markets-commodities`, `geopolitics-core`,
`themes-ai-technology`, `themes-energy-transition`, `themes-demographics`,
`wealth-generational-wealth` and `art-core`. `list_coverage` is authoritative —
it carries each area's own latest date, because the desk does not write every
area every day.

**Where it is happening** — nine layers

```bash
npx @antevo/cli call get_world_events --arg layers=waterways
npx @antevo/cli call get_world_events --arg layers=submarine_cables
npx @antevo/cli call get_world_events --arg layers=disasters,displacement                                      --arg days_back=30
```

Layers: `waterways` · `submarine_cables` · `armed_conflicts` · `disasters` ·
`displacement` · `sanctions` · `cyber` · `regulatory` · `hotspots`.

**Ask for the layers you want.** All of them together run to roughly 40k tokens
with two truncated; narrow to one or two and the row budget the rest were
spending is yours. This is the argument that most changes what you get back.

**The long run** — around 180 countries, some series to 1920

```bash
npx @antevo/cli call search_macro_indicators --arg query=CPI --arg country=Switzerland
npx @antevo/cli call get_macro_series --arg ticker="CHE CPI" --arg since=2020-01-01
npx @antevo/cli call search_macro_indicators --arg query="house prices" --arg limit=25
npx @antevo/cli call search_macro_indicators --arg query="policy rate" --arg country=JPN
```

`country` takes a name (`Switzerland`) or an ISO-3 code (`CHE`). Search first —
there are around 80,000 series and the naming is not uniform, so guessing a
ticker does not work.

Two things worth knowing before you quote a number: these are **quarterly
published levels that lag** (the newest observation is a quarter end, never
today, and `covers.to` differs between series), and index levels are only
comparable *within* one series — compare changes, not levels.

**Piping**

`--json` gives you the raw payload, so the whole surface composes:

```bash
npx @antevo/cli call list_coverage --json | jq -r '.areas[].area'
npx @antevo/cli call get_coverage --arg area=real-assets-shipping --json | jq -r .note
```

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
